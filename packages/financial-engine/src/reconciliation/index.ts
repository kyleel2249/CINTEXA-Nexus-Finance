/**
 * Accounting Consistency & Reconciliation Engine
 * Never silently corrects figures. Surfaces variances with explanations.
 */

import type { BalanceSheetData, CashFlowData, ReconciliationResult, FinancialPeriodData } from '../types';

export function reconcileBalanceSheet(bs: BalanceSheetData): ReconciliationResult {
  const expectedEquity = bs.totalAssets - bs.totalLiabilities;
  const variance = (bs.totalEquity || 0) - expectedEquity;
  const isBalanced = Math.abs(variance) < 1; // allow $1 rounding

  return {
    check: 'Assets = Liabilities + Equity',
    sourceValue: bs.totalEquity || 0,
    expectedValue: expectedEquity,
    variance,
    isBalanced,
    possibleExplanations: isBalanced
      ? ['Balance sheet balances within tolerance.']
      : [
          'Rounding differences in source statements',
          'Missing line items or incomplete extraction',
          'Off-balance-sheet items not captured',
          'Currency translation differences',
          'Accounting period cut-off differences',
          'Data extraction error — requires verification against source document',
        ],
    requiredVerification: isBalanced
      ? 'None — equation holds.'
      : 'Re-examine source balance sheet totals, notes, and extraction confidence. Do not adjust figures without documentary support.',
  };
}

export function reconcileCashFlow(cf: CashFlowData): ReconciliationResult {
  const calculatedChange =
    (cf.operatingCashFlow || 0) + (cf.investingCashFlow || 0) + (cf.financingCashFlow || 0);
  const reportedChange = cf.netChangeInCash ?? (cf.closingCash !== undefined && cf.openingCash !== undefined ? cf.closingCash - cf.openingCash : null);

  if (reportedChange === null) {
    return {
      check: 'Cash Flow Reconciliation (OCF + ICF + FCF = Net Change in Cash)',
      sourceValue: calculatedChange,
      expectedValue: calculatedChange,
      variance: 0,
      isBalanced: true,
      possibleExplanations: ['Net change in cash not fully provided; only component sum available.'],
      requiredVerification: 'Obtain complete cash-flow statement with opening and closing cash.',
    };
  }

  const variance = calculatedChange - reportedChange;
  const isBalanced = Math.abs(variance) < 1;

  return {
    check: 'Cash Flow Reconciliation',
    sourceValue: calculatedChange,
    expectedValue: reportedChange,
    variance,
    isBalanced,
    possibleExplanations: isBalanced
      ? ['Cash-flow components reconcile to net change in cash.']
      : [
          'Missing non-cash adjustments or supplemental disclosures',
          'Extraction incomplete for one of the three sections',
          'Foreign-exchange translation of cash balances',
          'Classification differences (e.g., interest paid in operating vs financing)',
        ],
    requiredVerification: isBalanced ? 'None.' : 'Trace each section of the cash-flow statement to source and verify totals.',
  };
}

export function reconcileOpeningClosingCash(cf: CashFlowData): ReconciliationResult | null {
  if (cf.openingCash === undefined || cf.closingCash === undefined || cf.netChangeInCash === undefined) {
    return null;
  }
  const expectedClosing = cf.openingCash + cf.netChangeInCash;
  const variance = cf.closingCash - expectedClosing;
  const isBalanced = Math.abs(variance) < 1;

  return {
    check: 'Opening Cash + Net Change = Closing Cash',
    sourceValue: cf.closingCash,
    expectedValue: expectedClosing,
    variance,
    isBalanced,
    possibleExplanations: isBalanced ? ['Cash roll-forward balances.'] : ['Possible missing movements or extraction error.'],
    requiredVerification: isBalanced ? 'None.' : 'Verify opening and closing cash against balance sheet and cash-flow statement.',
  };
}

export function runAllReconciliations(period: FinancialPeriodData): ReconciliationResult[] {
  const results: ReconciliationResult[] = [];
  results.push(reconcileBalanceSheet(period.balanceSheet));
  results.push(reconcileCashFlow(period.cashFlow));
  const cashRoll = reconcileOpeningClosingCash(period.cashFlow);
  if (cashRoll) results.push(cashRoll);
  return results;
}
