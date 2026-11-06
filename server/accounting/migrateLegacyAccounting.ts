/**
 * Legacy Accounting Migration Script
 * Deterministically converts flat single-entry records into balanced Journal Entries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ledgerService, JournalEntry } from './ledger.ts';
import { getFirestoreRestClient } from '../firestoreClient.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DB_FILE = path.join(ROOT_DIR, 'data', 'db.json');

export interface MigrationResult {
  totalProcessed: number;
  migratedCount: number;
  reviewRequiredCount: number;
  entries: JournalEntry[];
}

export async function migrateLegacyAccounting(): Promise<MigrationResult> {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Cannot find database file at ${DB_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const legacyEntries: any[] = (raw.accountingEntries || []).filter((e: any) => !e.id.startsWith('je_'));
  const client = getFirestoreRestClient();

  console.log(`[AccountingMigration] Found ${legacyEntries.length} legacy accounting records.`);
  const migrated: JournalEntry[] = [];
  let reviewCount = 0;

  for (const item of legacyEntries) {
    const existing = await client.getDocument<JournalEntry>('journalEntries', item.id);
    if (existing) {
      console.log(`[AccountingMigration] Entry ${item.id} already migrated; skipping.`);
      migrated.push(existing);
      if (existing.reviewRequired) reviewCount++;
      continue;
    }

    const amount = Number(item.amount);
    let reviewRequired = false;
    let lines: any[] = [];
    let memo = item.description || 'Legacy financial transaction';

    if (item.type === 'income') {
      if (item.source === 'order' || item.orderId) {
        // Auto-reconciled order income
        lines = [
          { accountCode: '1020', debit: amount, credit: 0, description: item.description },
          { accountCode: '4010', debit: 0, credit: amount, description: 'Sales Revenue' },
        ];
      } else {
        // Manual bulk sale / confidential record
        reviewRequired = true; // Per Architect directive: set reviewRequired = true until human verified
        reviewCount++;
        lines = [
          { accountCode: '1022', debit: amount, credit: 0, description: item.description },
          { accountCode: '4010', debit: 0, credit: amount, description: 'Sales Revenue (Pending Review)' },
        ];
      }
    } else {
      // Expense record (e.g. delivery fee)
      lines = [
        { accountCode: '6020', debit: amount, credit: 0, description: item.description },
        { accountCode: '1010', debit: 0, credit: amount, description: 'Cash on Hand clearing' },
      ];
    }

    const entry = await ledgerService.postJournalEntry({
      merchantId: item.merchantId,
      transactionDate: item.date ? `${item.date}T12:00:00.000Z` : item.createdAt,
      sourceType: 'legacy_migration',
      sourceReferenceId: item.orderId || item.id,
      memo,
      lines,
      reviewRequired,
      createdBy: item.createdBy || 'system_legacy_migration',
    });

    migrated.push(entry);
    console.log(`[AccountingMigration] Migrated ${item.id} -> ${entry.id} (Review: ${reviewRequired})`);
  }

  return {
    totalProcessed: legacyEntries.length,
    migratedCount: migrated.length,
    reviewRequiredCount: reviewCount,
    entries: migrated,
  };
}
