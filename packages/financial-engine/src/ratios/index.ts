/**
 * Financial Ratio Engine
 * Calculates liquidity, profitability, efficiency, solvency, growth and cash-flow ratios
 * with interpretation, risk level and management implications.
 */

import type { BalanceSheetData, IncomeStatementData, CashFlowData, RatioResult, FinancialPeriodData } from '../types';

function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0 || denominator === null || denominator === undefined || isNaN(denominator)) return null;
  if (numerator === null || numerator === undefined || isNaN(numerator)) return null;
  return numerator / denominator;
}

function riskFromThresholds(
  value: number | null,
  { low, moderate, high, severe }: { low: number; moderate: number; high: number; severe: number },
  higherIsBetter = true
): 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL' {
  if (value === null || isNaN(value)) return 'MODERATE';
  if (higherIsBetter) {
    if (value >= low) return 'LOW';
    if (value >= moderate) return 'MODERATE';
    if (value >= high) return 'HIGH';
    if (value >= severe) return 'SEVERE';
    return 'CRITICAL';
  } else {
    if (value <= low) return 'LOW';
    if (value <= moderate) return 'MODERATE';
    if (value <= high) return 'HIGH';
    if (value <= severe) return 'SEVERE';
    return 'CRITICAL';
  }
}

export function calculateLiquidityRatios(bs: BalanceSheetData, cf?: CashFlowData): RatioResult[] {
  const results: RatioResult[] = [];

  // Current Ratio
  const currentRatio = safeDiv(bs.totalCurrentAssets, bs.totalCurrentLiabilities);
  results.push({
    name: 'Current Ratio',
    category: 'LIQUIDITY',
    value: currentRatio,
    formula: 'Total Current Assets / Total Current Liabilities',
    interpretation:
      currentRatio === null
        ? 'Insufficient data'
        : currentRatio >= 2
          ? 'Strong short-term liquidity; assets comfortably cover short-term obligations.'
          : currentRatio >= 1.5
            ? 'Adequate liquidity.'
            : currentRatio >= 1
              ? 'Marginal liquidity; limited buffer for unexpected outflows.'
              : 'Current liabilities exceed current assets — potential liquidity stress.',
    riskLevel: riskFromThresholds(currentRatio, { low: 1.5, moderate: 1.2, high: 1.0, severe: 0.8 }),
    managementImplication:
      currentRatio !== null && currentRatio < 1.2
        ? 'Review working capital management, accelerate collections, or arrange short-term facilities.'
        : 'Maintain disciplined working capital practices.',
  });

  // Quick Ratio (Acid Test)
  const quickAssets = (bs.cash || 0) + (bs.accountsReceivable || 0);
  const quickRatio = safeDiv(quickAssets, bs.totalCurrentLiabilities);
  results.push({
    name: 'Quick Ratio',
    category: 'LIQUIDITY',
    value: quickRatio,
    formula: '(Cash + Accounts Receivable) / Total Current Liabilities',
    interpretation:
      quickRatio === null
        ? 'Insufficient data'
        : quickRatio >= 1
          ? 'Adequate ability to meet short-term obligations without relying on inventory.'
          : 'Limited liquid resources excluding inventory.',
    riskLevel: riskFromThresholds(quickRatio, { low: 1.0, moderate: 0.8, high: 0.6, severe: 0.4 }),
    managementImplication:
      quickRatio !== null && quickRatio < 0.8
        ? 'Focus on receivables collection and cash preservation.'
        : 'Liquidity position appears manageable on a quick-asset basis.',
  });

  // Cash Ratio
  const cashRatio = safeDiv(bs.cash || 0, bs.totalCurrentLiabilities);
  results.push({
    name: 'Cash Ratio',
    category: 'LIQUIDITY',
    value: cashRatio,
    formula: 'Cash / Total Current Liabilities',
    interpretation:
      cashRatio === null
        ? 'Insufficient data'
        : cashRatio >= 0.5
          ? 'Strong cash coverage of short-term liabilities.'
          : cashRatio >= 0.2
            ? 'Moderate cash buffer.'
            : 'Low cash relative to current liabilities.',
    riskLevel: riskFromThresholds(cashRatio, { low: 0.4, moderate: 0.25, high: 0.15, severe: 0.05 }),
    managementImplication: 'Monitor cash conversion and short-term funding needs closely.',
  });

  // Working Capital
  const workingCapital = (bs.totalCurrentAssets || 0) - (bs.totalCurrentLiabilities || 0);
  results.push({
    name: 'Working Capital',
    category: 'LIQUIDITY',
    value: workingCapital,
    formula: 'Total Current Assets − Total Current Liabilities',
    interpretation:
      workingCapital > 0
        ? 'Positive working capital supports ongoing operations.'
        : 'Negative working capital indicates potential short-term funding pressure.',
    riskLevel: workingCapital >= 0 ? 'LOW' : workingCapital > -bs.totalCurrentLiabilities * 0.2 ? 'HIGH' : 'SEVERE',
    managementImplication:
      workingCapital < 0
        ? 'Immediate attention to working-capital cycle and short-term liquidity.'
        : 'Continue monitoring working-capital efficiency.',
  });

  // Operating Cash Flow Ratio
  if (cf) {
    const ocfRatio = safeDiv(cf.operatingCashFlow, bs.totalCurrentLiabilities);
    results.push({
      name: 'Operating Cash Flow Ratio',
      category: 'LIQUIDITY',
      value: ocfRatio,
      formula: 'Operating Cash Flow / Total Current Liabilities',
      interpretation:
        ocfRatio === null
          ? 'Insufficient data'
          : ocfRatio >= 0.4
            ? 'Strong cash generation relative to short-term obligations.'
            : ocfRatio >= 0.2
              ? 'Moderate operating cash coverage.'
              : 'Weak operating cash coverage of current liabilities.',
      riskLevel: riskFromThresholds(ocfRatio, { low: 0.4, moderate: 0.25, high: 0.1, severe: 0 }),
      managementImplication:
        ocfRatio !== null && ocfRatio < 0.2
          ? 'Operating cash flow may be insufficient to service short-term obligations without external funding.'
          : 'Operating cash generation supports liquidity.',
    });
  }

  return results;
}

export function calculateProfitabilityRatios(is: IncomeStatementData, bs: BalanceSheetData): RatioResult[] {
  const results: RatioResult[] = [];

  const grossMargin = is.grossProfit !== undefined ? safeDiv(is.grossProfit, is.revenue) : safeDiv((is.revenue || 0) - (is.cogs || 0), is.revenue);
  results.push({
    name: 'Gross Margin',
    category: 'PROFITABILITY',
    value: grossMargin !== null ? grossMargin * 100 : null,
    formula: 'Gross Profit / Revenue × 100',
    interpretation:
      grossMargin === null
        ? 'Insufficient data'
        : grossMargin >= 0.4
          ? 'Healthy gross margin.'
          : grossMargin >= 0.25
            ? 'Moderate gross margin.'
            : 'Thin or compressed gross margin.',
    riskLevel: riskFromThresholds(grossMargin, { low: 0.35, moderate: 0.25, high: 0.15, severe: 0.05 }),
    managementImplication: 'Monitor pricing power, cost of sales and product mix.',
  });

  const operatingMargin = is.ebit !== undefined ? safeDiv(is.ebit, is.revenue) : null;
  results.push({
    name: 'Operating Margin (EBIT)',
    category: 'PROFITABILITY',
    value: operatingMargin !== null ? operatingMargin * 100 : null,
    formula: 'EBIT / Revenue × 100',
    interpretation:
      operatingMargin === null
        ? 'Insufficient data'
        : operatingMargin >= 0.15
          ? 'Strong operating profitability.'
          : operatingMargin >= 0.05
            ? 'Modest operating profitability.'
            : operatingMargin >= 0
              ? 'Thin operating margin.'
              : 'Operating losses.',
    riskLevel: riskFromThresholds(operatingMargin, { low: 0.12, moderate: 0.05, high: 0, severe: -0.05 }),
    managementImplication: 'Review operating cost structure and efficiency.',
  });

  const ebitdaMargin = is.ebitda !== undefined ? safeDiv(is.ebitda, is.revenue) : null;
  results.push({
    name: 'EBITDA Margin',
    category: 'PROFITABILITY',
    value: ebitdaMargin !== null ? ebitdaMargin * 100 : null,
    formula: 'EBITDA / Revenue × 100',
    interpretation: ebitdaMargin === null ? 'Insufficient data' : ebitdaMargin >= 0.2 ? 'Robust EBITDA generation.' : ebitdaMargin >= 0.1 ? 'Moderate EBITDA margin.' : 'Weak EBITDA generation.',
    riskLevel: riskFromThresholds(ebitdaMargin, { low: 0.18, moderate: 0.1, high: 0.05, severe: 0 }),
    managementImplication: 'EBITDA is a key indicator of cash-generation capacity before capital structure effects.',
  });

  const netMargin = safeDiv(is.netIncome, is.revenue);
  results.push({
    name: 'Net Profit Margin',
    category: 'PROFITABILITY',
    value: netMargin !== null ? netMargin * 100 : null,
    formula: 'Net Income / Revenue × 100',
    interpretation:
      netMargin === null
        ? 'Insufficient data'
        : netMargin >= 0.1
          ? 'Healthy net profitability.'
          : netMargin >= 0.03
            ? 'Modest net margin.'
            : netMargin >= 0
              ? 'Thin net profitability.'
              : 'Net losses.',
    riskLevel: riskFromThresholds(netMargin, { low: 0.08, moderate: 0.03, high: 0, severe: -0.05 }),
    managementImplication: 'Bottom-line profitability reflects operating performance, financing costs and tax.',
  });

  const roa = safeDiv(is.netIncome, bs.totalAssets);
  results.push({
    name: 'Return on Assets (ROA)',
    category: 'PROFITABILITY',
    value: roa !== null ? roa * 100 : null,
    formula: 'Net Income / Total Assets × 100',
    interpretation: roa === null ? 'Insufficient data' : roa >= 0.08 ? 'Efficient use of assets.' : roa >= 0.03 ? 'Moderate asset returns.' : 'Low or negative asset returns.',
    riskLevel: riskFromThresholds(roa, { low: 0.06, moderate: 0.03, high: 0, severe: -0.03 }),
    managementImplication: 'Evaluate asset utilization and capital intensity.',
  });

  const roe = safeDiv(is.netIncome, bs.totalEquity);
  results.push({
    name: 'Return on Equity (ROE)',
    category: 'PROFITABILITY',
    value: roe !== null ? roe * 100 : null,
    formula: 'Net Income / Total Equity × 100',
    interpretation: roe === null ? 'Insufficient data' : roe >= 0.15 ? 'Strong returns to equity holders.' : roe >= 0.08 ? 'Moderate equity returns.' : roe >= 0 ? 'Low equity returns.' : 'Negative equity returns / losses.',
    riskLevel: riskFromThresholds(roe, { low: 0.12, moderate: 0.06, high: 0, severe: -0.05 }),
    managementImplication: 'High leverage can inflate ROE; examine sustainability.',
  });

  return results;
}

export function calculateSolvencyRatios(bs: BalanceSheetData, is: IncomeStatementData, cf?: CashFlowData): RatioResult[] {
  const results: RatioResult[] = [];

  const totalDebt = (bs.shortTermDebt || 0) + (bs.longTermDebt || 0) + (bs.leaseLiabilities || 0);
  const debtToEquity = safeDiv(totalDebt, bs.totalEquity);
  results.push({
    name: 'Debt-to-Equity',
    category: 'SOLVENCY',
    value: debtToEquity,
    formula: '(Short-term Debt + Long-term Debt + Lease Liabilities) / Total Equity',
    interpretation:
      debtToEquity === null
        ? 'Insufficient data'
        : debtToEquity <= 0.5
          ? 'Conservative leverage.'
          : debtToEquity <= 1.5
            ? 'Moderate leverage.'
            : debtToEquity <= 3
              ? 'Elevated leverage.'
              : 'Highly leveraged; significant financial risk.',
    riskLevel: riskFromThresholds(debtToEquity, { low: 0.8, moderate: 1.5, high: 2.5, severe: 4 }, false),
    managementImplication: 'Assess debt capacity, refinancing risk and covenant headroom.',
  });

  const debtToAssets = safeDiv(totalDebt, bs.totalAssets);
  results.push({
    name: 'Debt-to-Assets',
    category: 'SOLVENCY',
    value: debtToAssets !== null ? debtToAssets * 100 : null,
    formula: 'Total Debt / Total Assets × 100',
    interpretation: debtToAssets === null ? 'Insufficient data' : debtToAssets <= 0.3 ? 'Low asset-backed leverage.' : debtToAssets <= 0.5 ? 'Moderate leverage.' : 'High proportion of assets financed by debt.',
    riskLevel: riskFromThresholds(debtToAssets, { low: 0.35, moderate: 0.5, high: 0.65, severe: 0.8 }, false),
    managementImplication: 'High debt-to-assets reduces financial flexibility.',
  });

  const interestCoverage = is.financeCosts && is.financeCosts !== 0 ? safeDiv(is.ebit || is.ebitda || 0, is.financeCosts) : null;
  results.push({
    name: 'Interest Coverage Ratio',
    category: 'SOLVENCY',
    value: interestCoverage,
    formula: 'EBIT / Finance Costs',
    interpretation:
      interestCoverage === null
        ? 'Insufficient data or zero finance costs'
        : interestCoverage >= 5
          ? 'Comfortable interest coverage.'
          : interestCoverage >= 2.5
            ? 'Adequate coverage.'
            : interestCoverage >= 1.5
              ? 'Thin coverage — vulnerability to earnings decline.'
              : 'Interest obligations may not be fully covered by operating profit.',
    riskLevel: riskFromThresholds(interestCoverage, { low: 4, moderate: 2.5, high: 1.5, severe: 1 }),
    managementImplication: 'Monitor interest coverage closely if leverage is material.',
  });

  const equityRatio = safeDiv(bs.totalEquity, bs.totalAssets);
  results.push({
    name: 'Equity Ratio',
    category: 'SOLVENCY',
    value: equityRatio !== null ? equityRatio * 100 : null,
    formula: 'Total Equity / Total Assets × 100',
    interpretation: equityRatio === null ? 'Insufficient data' : equityRatio >= 0.4 ? 'Solid equity cushion.' : equityRatio >= 0.25 ? 'Moderate equity base.' : equityRatio > 0 ? 'Thin equity base.' : 'Negative equity — insolvency risk.',
    riskLevel: riskFromThresholds(equityRatio, { low: 0.35, moderate: 0.25, high: 0.15, severe: 0.05 }),
    managementImplication: 'Negative or thin equity requires urgent capital structure review.',
  });

  if (is.ebitda && is.ebitda > 0) {
    const netDebt = totalDebt - (bs.cash || 0);
    const netDebtToEbitda = safeDiv(netDebt, is.ebitda);
    results.push({
      name: 'Net Debt / EBITDA',
      category: 'SOLVENCY',
      value: netDebtToEbitda,
      formula: '(Total Debt − Cash) / EBITDA',
      interpretation:
        netDebtToEbitda === null
          ? 'Insufficient data'
          : netDebtToEbitda <= 2
            ? 'Conservative net leverage.'
            : netDebtToEbitda <= 3.5
              ? 'Moderate net leverage.'
              : netDebtToEbitda <= 5
                ? 'Elevated net leverage.'
                : 'High net leverage relative to earnings capacity.',
      riskLevel: riskFromThresholds(netDebtToEbitda, { low: 2.5, moderate: 3.5, high: 5, severe: 7 }, false),
      managementImplication: 'Key metric for lenders and rating agencies; track trajectory.',
    });
  }

  return results;
}

export function calculateEfficiencyRatios(is: IncomeStatementData, bs: BalanceSheetData): RatioResult[] {
  const results: RatioResult[] = [];

  const assetTurnover = safeDiv(is.revenue, bs.totalAssets);
  results.push({
    name: 'Asset Turnover',
    category: 'EFFICIENCY',
    value: assetTurnover,
    formula: 'Revenue / Total Assets',
    interpretation: assetTurnover === null ? 'Insufficient data' : assetTurnover >= 1.2 ? 'Efficient asset utilization.' : assetTurnover >= 0.6 ? 'Moderate asset turnover.' : 'Low asset productivity.',
    riskLevel: riskFromThresholds(assetTurnover, { low: 1.0, moderate: 0.6, high: 0.3, severe: 0.1 }),
    managementImplication: 'Compare with industry peers; capital-intensive businesses naturally have lower turnover.',
  });

  if (bs.accountsReceivable && bs.accountsReceivable > 0) {
    const receivablesTurnover = safeDiv(is.revenue, bs.accountsReceivable);
    const dso = receivablesTurnover ? 365 / receivablesTurnover : null;
    results.push({
      name: 'Receivables Turnover',
      category: 'EFFICIENCY',
      value: receivablesTurnover,
      formula: 'Revenue / Accounts Receivable',
      interpretation: receivablesTurnover === null ? 'Insufficient data' : receivablesTurnover >= 8 ? 'Efficient collections.' : receivablesTurnover >= 5 ? 'Moderate collection speed.' : 'Slow collections — potential working-capital drag.',
      riskLevel: riskFromThresholds(receivablesTurnover, { low: 7, moderate: 5, high: 3, severe: 2 }),
      managementImplication: dso ? `Approximate DSO ≈ ${dso.toFixed(0)} days. Review credit terms and collection processes.` : 'Review receivables aging.',
    });
  }

  if (bs.inventory && bs.inventory > 0 && is.cogs) {
    const inventoryTurnover = safeDiv(is.cogs, bs.inventory);
    results.push({
      name: 'Inventory Turnover',
      category: 'EFFICIENCY',
      value: inventoryTurnover,
      formula: 'COGS / Inventory',
      interpretation: inventoryTurnover === null ? 'Insufficient data' : inventoryTurnover >= 6 ? 'Efficient inventory management.' : inventoryTurnover >= 3 ? 'Moderate turnover.' : 'Slow-moving inventory risk.',
      riskLevel: riskFromThresholds(inventoryTurnover, { low: 5, moderate: 3, high: 2, severe: 1 }),
      managementImplication: 'Assess obsolescence risk and working-capital tied in inventory.',
    });
  }

  return results;
}

export function calculateAllRatios(period: FinancialPeriodData): RatioResult[] {
  const { incomeStatement: is, balanceSheet: bs, cashFlow: cf } = period;
  return [
    ...calculateLiquidityRatios(bs, cf),
    ...calculateProfitabilityRatios(is, bs),
    ...calculateSolvencyRatios(bs, is, cf),
    ...calculateEfficiencyRatios(is, bs),
  ];
}
