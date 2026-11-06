/**
 * Test Suite for BLK-03: Double-Entry Accounting Ledger
 * Tests COA, balance verification, immutability, reversal mechanics, and legacy migration.
 */

import { ledgerService, LedgerError, validateJournalLines } from '../server/accounting/ledger.ts';
import { getAccountByCode, CHART_OF_ACCOUNTS } from '../server/accounting/chartOfAccounts.ts';
import { migrateLegacyAccounting } from '../server/accounting/migrateLegacyAccounting.ts';

async function runTests() {
  console.log('--- STARTING BLK-03 DOUBLE-ENTRY ACCOUNTING TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const testMerchantId = 'merchant_001';

  // 1. Chart of Accounts Tests
  console.log('\n[1] Testing Chart of Accounts (COA):');
  assert(Object.keys(CHART_OF_ACCOUNTS).length === 13, 'COA contains 13 canonical accounts');
  assert(getAccountByCode('1010').name === 'Cash on Hand', 'Account 1010 resolved to Cash on Hand');
  assert(getAccountByCode('1020').type === 'asset', 'Account 1020 is Asset');
  assert(getAccountByCode('4010').type === 'revenue', 'Account 4010 is Revenue');
  assert(getAccountByCode('6020').type === 'expense', 'Account 6020 is Expense');

  // 2. Balancing Line Invariant Tests
  console.log('\n[2] Testing Balancing Invariant:');
  const validBalancedLines = [
    { lineId: '1', accountCode: '1020', accountName: 'KPay', debit: 50000, credit: 0 },
    { lineId: '2', accountCode: '4010', accountName: 'Revenue', debit: 0, credit: 50000 },
  ];
  assert(validateJournalLines(validBalancedLines) === 50000, 'Valid balanced lines validated with sum = 50,000 MMK');

  let unbalancedRejected = false;
  try {
    validateJournalLines([
      { lineId: '1', accountCode: '1020', accountName: 'KPay', debit: 50000, credit: 0 },
      { lineId: '2', accountCode: '4010', accountName: 'Revenue', debit: 0, credit: 45000 }, // Off by 5,000!
    ]);
  } catch (e: any) {
    if (e instanceof LedgerError && e.code === 'UNBALANCED_JOURNAL_ENTRY') {
      unbalancedRejected = true;
    }
  }
  assert(unbalancedRejected, 'Unbalanced lines (Debits != Credits) strictly rejected with UNBALANCED_JOURNAL_ENTRY');

  // 3. Journal Entry Posting & Immutability Test
  console.log('\n[3] Testing Journal Entry Posting & Immutability:');
  let postedEntryId = '';
  try {
    const entry = await ledgerService.postJournalEntry({
      merchantId: testMerchantId,
      sourceType: 'operating_expense',
      memo: 'Purchased packaging boxes and bags',
      lines: [
        { accountCode: '6020', debit: 12000, credit: 0, description: 'Packaging expense' },
        { accountCode: '1010', debit: 0, credit: 12000, description: 'Cash paid out' },
      ],
      createdBy: 'test_finance_admin',
    });
    postedEntryId = entry.id;
    assert(entry.status === 'posted', 'Journal entry posted with status = posted');
    assert(entry.totalAmount === 12000, 'Total amount matches line debit sum');
    assert(entry.lines.length === 2, 'Entry contains both debit and credit lines');
  } catch (err: any) {
    console.error('Posting error:', err);
    assert(false, `Posting failed: ${err.message}`);
  }

  // 4. Reversal Entry Test
  console.log('\n[4] Testing Reversal Entry Mechanics:');
  try {
    const { original, reversal } = await ledgerService.reverseJournalEntry(
      postedEntryId,
      testMerchantId,
      'test_finance_admin',
      'Supplier returned payment for damaged boxes'
    );
    assert(original.status === 'reversed', 'Original journal entry status updated to reversed');
    assert(original.reversedByEntryId === reversal.id, 'Original entry points to reversal ID');
    assert(reversal.reversalOfEntryId === postedEntryId, 'Reversal entry points to original entry ID');

    // Verify inverse lines
    const revDebit = reversal.lines.find((l) => l.accountCode === '1010')?.debit;
    const revCredit = reversal.lines.find((l) => l.accountCode === '6020')?.credit;
    assert(revDebit === 12000, 'Reversal entry inverted Cash line (now debited 12,000 MMK)');
    assert(revCredit === 12000, 'Reversal entry inverted Expense line (now credited 12,000 MMK)');

    // Attempt double reversal (should be rejected)
    let doubleRevRejected = false;
    try {
      await ledgerService.reverseJournalEntry(postedEntryId, testMerchantId, 'test_finance_admin', 'Double rev');
    } catch (e: any) {
      if (e instanceof LedgerError && e.code === 'ALREADY_REVERSED') {
        doubleRevRejected = true;
      }
    }
    assert(doubleRevRejected, 'Reversing an already-reversed entry rejected with ALREADY_REVERSED');
  } catch (err: any) {
    console.error('Reversal error:', err);
    assert(false, `Reversal failed: ${err.message}`);
  }

  // 5. Order Payment Revenue Recognition Test
  console.log('\n[5] Testing Order Revenue Recognition:');
  try {
    const orderJe = await ledgerService.postOrderPaymentRevenue(
      {
        id: `ord_revtest_${Date.now()}`,
        merchantId: testMerchantId,
        totalAmount: 55000,
        deliveryFee: 5000,
        paymentMethod: 'KBZPay',
      },
      'merchant_owner'
    );
    assert(orderJe.totalAmount === 55000, 'Order payment total recognized = 55,000 MMK');
    const kpayLine = orderJe.lines.find((l) => l.accountCode === '1020');
    const merchRevLine = orderJe.lines.find((l) => l.accountCode === '4010');
    const deliveryLine = orderJe.lines.find((l) => l.accountCode === '4020');

    assert(kpayLine?.debit === 55000, 'KPay Clearing debited 55,000 MMK');
    assert(merchRevLine?.credit === 50000, 'Merchandise Revenue credited 50,000 MMK');
    assert(deliveryLine?.credit === 5000, 'Delivery Income credited 5,000 MMK');
  } catch (err: any) {
    console.error('Order revenue error:', err);
    assert(false, `Order revenue recognition failed: ${err.message}`);
  }

  // 6. Legacy Migration Test
  console.log('\n[6] Testing Legacy Accounting Migration:');
  try {
    const migResult = await migrateLegacyAccounting();
    assert(migResult.totalProcessed === 7, 'Processed exactly 7 legacy accounting records');
    assert(migResult.migratedCount === 7, 'Migrated all 7 records to balanced Journal Entries');
    assert(
      migResult.reviewRequiredCount === 1,
      'Confidential bulk sale preserved with reviewRequired = true per Architect directive'
    );

    // Verify all migrated entries balance
    let allBalance = true;
    for (const je of migResult.entries) {
      const sumDr = je.lines.reduce((s, l) => s + l.debit, 0);
      const sumCr = je.lines.reduce((s, l) => s + l.credit, 0);
      if (sumDr !== sumCr || sumDr <= 0) {
        allBalance = false;
        break;
      }
    }
    assert(allBalance, 'Every migrated journal entry is mathematically balanced (Total Dr === Total Cr)');
  } catch (err: any) {
    console.error('Migration error:', err);
    assert(false, `Legacy migration failed: ${err.message}`);
  }

  console.log(`\n--- BLK-03 SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
