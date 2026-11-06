/**
 * Canonical Chart of Accounts (COA) for SHOPSONE Merchants
 */

export interface AccountDefinition {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  description: string;
}

export const CHART_OF_ACCOUNTS: Record<string, AccountDefinition> = {
  '1010': {
    code: '1010',
    name: 'Cash on Hand',
    type: 'asset',
    normalBalance: 'debit',
    description: 'Physical cash collected from cash-on-delivery or in-person till',
  },
  '1020': {
    code: '1020',
    name: 'KPay Merchant Clearing',
    type: 'asset',
    normalBalance: 'debit',
    description: 'KBZPay merchant wallet transfers awaiting bank withdrawal',
  },
  '1021': {
    code: '1021',
    name: 'WavePay Merchant Clearing',
    type: 'asset',
    normalBalance: 'debit',
    description: 'WavePay merchant wallet transfers awaiting bank withdrawal',
  },
  '1022': {
    code: '1022',
    name: 'Bank Account Clearing',
    type: 'asset',
    normalBalance: 'debit',
    description: 'Commercial bank direct account clearing (AYA, CB, KBZ Bank)',
  },
  '1050': {
    code: '1050',
    name: 'Accounts Receivable',
    type: 'asset',
    normalBalance: 'debit',
    description: 'Pending customer invoices awaiting payment verification',
  },
  '2010': {
    code: '2010',
    name: 'Accounts Payable',
    type: 'liability',
    normalBalance: 'credit',
    description: 'Outstanding vendor and supplier liabilities',
  },
  '2050': {
    code: '2050',
    name: 'Customer Deposits',
    type: 'liability',
    normalBalance: 'credit',
    description: 'Customer prepayments for unfulfilled bespoke orders',
  },
  '4010': {
    code: '4010',
    name: 'Merchandise Sales Revenue',
    type: 'revenue',
    normalBalance: 'credit',
    description: 'Gross sales revenue from completed retail merchandise orders',
  },
  '4020': {
    code: '4020',
    name: 'Delivery & Shipping Income',
    type: 'revenue',
    normalBalance: 'credit',
    description: 'Delivery and courier fees charged to customers',
  },
  '5010': {
    code: '5010',
    name: 'Cost of Goods Sold (COGS)',
    type: 'expense',
    normalBalance: 'debit',
    description: 'Direct procurement and fabrication cost of sold items',
  },
  '6010': {
    code: '6010',
    name: 'Payment Processing Fees',
    type: 'expense',
    normalBalance: 'debit',
    description: 'Transaction fees charged by KPay, WavePay, or banks',
  },
  '6020': {
    code: '6020',
    name: 'Operational Expenses',
    type: 'expense',
    normalBalance: 'debit',
    description: 'General store operations, packaging, courier delivery expenses',
  },
  '6030': {
    code: '6030',
    name: 'Marketing & AI Studio Fees',
    type: 'expense',
    normalBalance: 'debit',
    description: 'Promotional expenses and AI photoshoot studio generation costs',
  },
};

export function getAccountByCode(code: string): AccountDefinition {
  const account = CHART_OF_ACCOUNTS[code];
  if (!account) {
    throw new Error(`[ChartOfAccounts] Unknown account code: ${code}`);
  }
  return account;
}
