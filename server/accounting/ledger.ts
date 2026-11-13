/**
 * Double-Entry Accounting Ledger Engine
 * Enforces balance invariants, immutability, reversal mechanics, and order revenue recognition.
 */

import crypto from 'crypto';
import { getFirestoreRestClient, FirestoreRestClient, toFirestoreDocument } from '../firestoreClient.ts';
import { getAccountByCode } from './chartOfAccounts.ts';
import { withDbTransaction } from '../db.ts';

export interface JournalLine {
  lineId: string;
  accountCode: string; // e.g. "1020", "4010"
  accountName: string;
  debit: number;       // Positive integer MMK
  credit: number;      // Positive integer MMK
  description?: string;
}

export interface JournalEntry {
  id: string;
  merchantId: string;
  entryNumber: number;
  transactionDate: string; // ISO 8601
  postingDate: string;
  status: 'posted' | 'reversed';
  sourceType: 'order_payment' | 'manual_adjustment' | 'refund' | 'operating_expense' | 'legacy_migration';
  sourceReferenceId?: string; // e.g. orderId
  memo: string;
  currency: 'MMK';
  totalAmount: number; // Sum of debits
  lines: JournalLine[];
  reversalOfEntryId?: string;
  reversedByEntryId?: string;
  reviewRequired?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class LedgerError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

/**
 * Validates that lines form a balanced, mathematically sound journal entry
 */
export function validateJournalLines(lines: JournalLine[]): number {
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    throw new LedgerError(400, 'MINIMUM_LINES_REQUIRED', 'Journal entry must contain at least 2 lines.');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (!line.accountCode) {
      throw new LedgerError(400, 'MISSING_ACCOUNT_CODE', 'Each line must specify a valid accountCode.');
    }
    // Verify account exists in Chart of Accounts
    getAccountByCode(line.accountCode);

    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (!Number.isInteger(debit) || debit < 0) {
      throw new LedgerError(400, 'INVALID_DEBIT_AMOUNT', `Debit must be a non-negative integer (received ${line.debit}).`);
    }
    if (!Number.isInteger(credit) || credit < 0) {
      throw new LedgerError(400, 'INVALID_CREDIT_AMOUNT', `Credit must be a non-negative integer (received ${line.credit}).`);
    }

    if (debit === 0 && credit === 0) {
      throw new LedgerError(400, 'ZERO_LINE_AMOUNT', 'Line must specify a positive debit or credit amount.');
    }
    if (debit > 0 && credit > 0) {
      throw new LedgerError(400, 'DUAL_LINE_AMOUNT', 'Line cannot have both debit and credit amounts.');
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  if (totalDebit !== totalCredit) {
    throw new LedgerError(
      400,
      'UNBALANCED_JOURNAL_ENTRY',
      `Debits (${totalDebit.toLocaleString()} MMK) must equal Credits (${totalCredit.toLocaleString()} MMK).`
    );
  }

  return totalDebit;
}

export class LedgerService {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  /**
   * Posts an immutable balanced journal entry
   */
  async postJournalEntry(input: {
    merchantId: string;
    transactionDate?: string;
    sourceType: JournalEntry['sourceType'];
    sourceReferenceId?: string;
    memo: string;
    lines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
    reviewRequired?: boolean;
    createdBy: string;
  }): Promise<JournalEntry> {
    const formattedLines: JournalLine[] = input.lines.map((l, idx) => {
      const acc = getAccountByCode(l.accountCode);
      return {
        lineId: `line_${idx + 1}`,
        accountCode: l.accountCode,
        accountName: acc.name,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description,
      };
    });

    const totalAmount = validateJournalLines(formattedLines);
    const nowIso = new Date().toISOString();
    const entryId = `je_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const entry: JournalEntry = {
      id: entryId,
      merchantId: input.merchantId,
      entryNumber: Date.now(),
      transactionDate: input.transactionDate || nowIso,
      postingDate: nowIso,
      status: 'posted',
      sourceType: input.sourceType,
      sourceReferenceId: input.sourceReferenceId,
      memo: input.memo,
      currency: 'MMK',
      totalAmount,
      lines: formattedLines,
      reviewRequired: input.reviewRequired ?? false,
      createdBy: input.createdBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Commit to Firestore collection
    await this.client.createDocument('journalEntries', entryId, entry);

    // Sync to local memory state for backward compatibility with existing views
    try {
      await withDbTransaction((db) => {
        if (!db.accountingEntries) db.accountingEntries = [];
        // Map to legacy view record so UI summary continues to show updated balance
        db.accountingEntries.unshift({
          id: entry.id,
          merchantId: entry.merchantId,
          type: entry.lines[0]?.debit > 0 && entry.lines[0]?.accountCode === '1020' ? 'income' : 'expense',
          category: 'double_entry_posted',
          amount: entry.totalAmount,
          paymentMethod: 'Double-Entry',
          orderId: entry.sourceReferenceId || null,
          source: entry.sourceType === 'order_payment' ? 'order' : 'manual',
          description: entry.memo,
          createdBy: entry.createdBy,
          date: entry.transactionDate.split('T')[0],
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
      });
    } catch {
      // Memory replica sync failure is non-fatal
    }

    return entry;
  }

  /**
   * Reverses an existing posted journal entry
   */
  async reverseJournalEntry(entryId: string, merchantId: string, actorId: string, reason: string): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
    const original = await this.client.getDocument<JournalEntry>('journalEntries', entryId);
    if (!original) {
      throw new LedgerError(404, 'ENTRY_NOT_FOUND', `Journal entry ${entryId} does not exist.`);
    }
    if (original.merchantId !== merchantId) {
      throw new LedgerError(403, 'FORBIDDEN', 'Access to journal entry denied.');
    }
    if (original.status === 'reversed') {
      throw new LedgerError(400, 'ALREADY_REVERSED', `Journal entry ${entryId} was already reversed.`);
    }

    // Generate inverse lines (debits become credits, credits become debits)
    const reversalLines: JournalLine[] = original.lines.map((line, idx) => ({
      lineId: `rev_line_${idx + 1}`,
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.credit,  // Invert
      credit: line.debit,  // Invert
      description: `Reversal of ${line.description || line.accountName}`,
    }));

    const nowIso = new Date().toISOString();
    const reversalId = `je_rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const reversal: JournalEntry = {
      id: reversalId,
      merchantId,
      entryNumber: Date.now(),
      transactionDate: nowIso,
      postingDate: nowIso,
      status: 'posted',
      sourceType: 'manual_adjustment',
      sourceReferenceId: original.sourceReferenceId,
      memo: `Reversal of ${entryId}: ${reason}`,
      currency: 'MMK',
      totalAmount: original.totalAmount,
      lines: reversalLines,
      reversalOfEntryId: entryId,
      createdBy: actorId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Update original entry to reversed and insert reversal document atomically
    await this.client.commit([
      {
        update: {
          name: `journalEntries/${entryId}`,
          fields: toFirestoreDocument({
            ...original,
            status: 'reversed',
            reversedByEntryId: reversalId,
            updatedAt: nowIso,
          }).fields,
        },
      },
      {
        update: {
          name: `journalEntries/${reversalId}`,
          fields: toFirestoreDocument(reversal).fields,
        },
      },
    ]);

    const updatedOriginal: JournalEntry = {
      ...original,
      status: 'reversed',
      reversedByEntryId: reversalId,
      updatedAt: nowIso,
    };

    return { original: updatedOriginal, reversal };
  }

  /**
   * Helper: Posts double-entry journal entry for confirmed order payment
   */
  async postOrderPaymentRevenue(order: {
    id: string;
    merchantId: string;
    totalAmount: number;
    deliveryFee?: number;
    paymentMethod?: string;
  }, actorId: string): Promise<JournalEntry> {
    const clearingAccount = order.paymentMethod?.toLowerCase().includes('wave') ? '1021' : '1020'; // WavePay vs KBZPay
    const deliveryFee = Number(order.deliveryFee || 0);
    const merchandiseRevenue = order.totalAmount - deliveryFee;

    const lines = [
      {
        accountCode: clearingAccount,
        debit: order.totalAmount,
        credit: 0,
        description: `Customer payment received for Order #${order.id}`,
      },
      {
        accountCode: '4010', // Merchandise Sales Revenue
        debit: 0,
        credit: merchandiseRevenue,
        description: `Merchandise sales revenue from Order #${order.id}`,
      },
    ];

    if (deliveryFee > 0) {
      lines.push({
        accountCode: '4020', // Delivery Fee Income
        debit: 0,
        credit: deliveryFee,
        description: `Delivery charge collected for Order #${order.id}`,
      });
    }

    return await this.postJournalEntry({
      merchantId: order.merchantId,
      sourceType: 'order_payment',
      sourceReferenceId: order.id,
      memo: `Revenue recognition for confirmed Order #${order.id}`,
      lines,
      createdBy: actorId,
    });
  }

  async listEntriesByMerchant(merchantId: string, limit = 100): Promise<JournalEntry[]> {
    let localEntries: JournalEntry[] = [];
    await withDbTransaction((db: any) => {
      localEntries = (db.accountingEntries || []).filter((e: any) => e.merchantId === merchantId);
    });
    if (localEntries.length > 0) {
      return localEntries.slice(0, limit);
    }

    try {
      return await this.client.runQuery<JournalEntry>('journalEntries', {
        where: [{ field: 'merchantId', op: 'EQUAL', value: merchantId }],
        limit,
      });
    } catch (err: any) {
      console.warn('Firestore query failed for journalEntries, falling back to local db:', err?.message || err);
      return [];
    }
  }
}

export const ledgerService = new LedgerService();
