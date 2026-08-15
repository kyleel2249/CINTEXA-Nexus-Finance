/**
 * Financial Distress Models
 * Implements established academic and practitioner models.
 * No single model is treated as definitive; results are presented with limitations.
 */

import type { BalanceSheetData, IncomeStatementData, CashFlowData, DistressModelResult, FinancialPeriodData } from '../types';

function safeDiv(n: number, d: number): number | null {
  if (d === 0 || !isFinite(d) || !isFinite(n)) return null;
  return n / d;
}

/**
 * Altman Z-Score (1968 original for public manufacturing companies)
 * Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5
 * Zones: >2.99 Safe, 1.81–2.99 Grey, <1.81 Distress
 */
export function altmanZScore(bs: BalanceSheetData, is: IncomeStatementData): DistressModelResult {
  const X1 = safeDiv((bs.totalCurrentAssets || 0) - (bs.totalCurrentLiabilities || 0), bs.totalAssets); // Working capital / Total assets
  const X2 = safeDiv(bs.retainedEarnings || 0, bs.totalAssets); // Retained earnings / Total assets
  const X3 = safeDiv(is.ebit || is.ebitda || is.profitBeforeTax || 0, bs.totalAssets); // EBIT / Total assets
  const marketValueEquity = bs.totalEquity; // Approximate with book equity if market value unavailable
  const X4 = safeDiv(marketValueEquity, bs.totalLiabilities || 1); // Equity / Total liabilities
  const X5 = safeDiv(is.revenue, bs.totalAssets); // Sales / Total assets

  const inputs = {
    X1_WorkingCapitalToAssets: X1 ?? 0,
    X2_RetainedEarningsToAssets: X2 ?? 0,
    X3_EBITToAssets: X3 ?? 0,
    X4_EquityToLiabilities: X4 ?? 0,
    X5_SalesToAssets: X5 ?? 0,
  };

  let z: number | null = null;
  if (X1 !== null && X2 !== null && X3 !== null && X4 !== null && X5 !== null) {
    z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 1.0 * X5;
  }

  let zone = 'INSUFFICIENT_DATA';
  let interpretation = 'Insufficient data to compute Altman Z-Score.';
  if (z !== null) {
    if (z > 2.99) {
      zone = 'SAFE';
      interpretation = `Z-Score of ${z.toFixed(2)} indicates the company is in the "safe" zone with low probability of bankruptcy in the near term according to the original Altman model.`;
    } else if (z >= 1.81) {
      zone = 'GREY';
      interpretation = `Z-Score of ${z.toFixed(2)} places the company in the "grey" zone. Further investigation is warranted; the model is inconclusive.`;
    } else {
      zone = 'DISTRESS';
      interpretation = `Z-Score of ${z.toFixed(2)} indicates elevated bankruptcy risk according to the original Altman Z-Score thresholds. This is a statistical indicator, not a prediction.`;
    }
  }

  return {
    modelName: 'Altman Z-Score (1968)',
    result: z,
    zone,
    interpretation,
    purpose: 'Predicts probability of bankruptcy within two years for publicly traded manufacturing firms using five financial ratios.',
    limitations:
      'Originally calibrated on US manufacturing companies 1945–1965. Less reliable for non-manufacturing, private, service, or emerging-market firms. Book equity used as proxy for market value. Does not incorporate cash-flow dynamics or macroeconomic conditions. Should never be used in isolation.',
    applicability: 'Best suited as one input among many for manufacturing or asset-heavy businesses with multi-year history. Use industry-specific or private-firm variants where available.',
    inputs,
  };
}

/**
 * Altman Z'-Score for private firms (1983)
 * Z' = 0.717X1 + 0.847X2 + 3.107X3 + 0.420X4 + 0.998X5
 */
export function altmanZPrimeScore(bs: BalanceSheetData, is: IncomeStatementData): DistressModelResult {
  const X1 = safeDiv((bs.totalCurrentAssets || 0) - (bs.totalCurrentLiabilities || 0), bs.totalAssets);
  const X2 = safeDiv(bs.retainedEarnings || 0, bs.totalAssets);
  const X3 = safeDiv(is.ebit || is.ebitda || is.profitBeforeTax || 0, bs.totalAssets);
  const X4 = safeDiv(bs.totalEquity, bs.totalLiabilities || 1);
  const X5 = safeDiv(is.revenue, bs.totalAssets);

  const inputs = {
    X1: X1 ?? 0,
    X2: X2 ?? 0,
    X3: X3 ?? 0,
    X4: X4 ?? 0,
    X5: X5 ?? 0,
  };

  let z: number | null = null;
  if (X1 !== null && X2 !== null && X3 !== null && X4 !== null && X5 !== null) {
    z = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.42 * X4 + 0.998 * X5;
  }

  let zone = 'INSUFFICIENT_DATA';
  let interpretation = 'Insufficient data.';
  if (z !== null) {
    if (z > 2.9) {
      zone = 'SAFE';
      interpretation = `Z'-Score ${z.toFixed(2)}: Safe zone (private-firm variant).`;
    } else if (z >= 1.23) {
      zone = 'GREY';
      interpretation = `Z'-Score ${z.toFixed(2)}: Grey zone.`;
    } else {
      zone = 'DISTRESS';
      interpretation = `Z'-Score ${z.toFixed(2)}: Distress zone. Elevated failure risk signal.`;
    }
  }

  return {
    modelName: "Altman Z'-Score (Private Firms)",
    result: z,
    zone,
    interpretation,
    purpose: 'Adapted Altman model for private companies using book values of equity.',
    limitations: 'Still primarily calibrated on manufacturing samples. Book values may understate true equity for growth companies. Not a substitute for cash-flow and qualitative analysis.',
    applicability: 'More appropriate than original Z-Score for private companies.',
    inputs,
  };
}

/**
 * Beneish M-Score (earnings manipulation detection)
 * M = -4.84 + 0.92*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.679*TATA - 0.327*LVGI
 * M > -1.78 suggests higher probability of manipulation.
 * Requires two periods of data for most components; simplified single-period proxy when only one period available.
 */
export function beneishMScore(
  current: { is: IncomeStatementData; bs: BalanceSheetData },
  prior?: { is: IncomeStatementData; bs: BalanceSheetData }
): DistressModelResult {
  // Simplified implementation when prior period unavailable — returns limited result
  if (!prior) {
    return {
      modelName: 'Beneish M-Score',
      result: null,
      interpretation: 'Beneish M-Score requires at least two consecutive periods of financial data (current and prior year) to compute the eight indices. Insufficient historical data.',
      purpose: 'Detects probability that earnings have been manipulated through discretionary accruals and other techniques.',
      limitations: 'Requires multi-year data. High false-positive rate. Not proof of fraud. Designed primarily for US public companies.',
      applicability: 'Use only when consecutive annual statements are available. Flag results as "requires investigation" never as confirmed fraud.',
      inputs: {},
    };
  }

  const DSRI = safeDiv(
    safeDiv(current.bs.accountsReceivable || 0, current.is.revenue) || 0,
    safeDiv(prior.bs.accountsReceivable || 0, prior.is.revenue) || 1
  );
  const GMI = safeDiv(
    safeDiv((prior.is.revenue || 0) - (prior.is.cogs || 0), prior.is.revenue) || 0,
    safeDiv((current.is.revenue || 0) - (current.is.cogs || 0), current.is.revenue) || 1
  );
  const AQI = safeDiv(
    1 - safeDiv((current.bs.totalCurrentAssets || 0) + (current.bs.ppe || 0), current.bs.totalAssets) || 0,
    1 - safeDiv((prior.bs.totalCurrentAssets || 0) + (prior.bs.ppe || 0), prior.bs.totalAssets) || 1
  );
  const SGI = safeDiv(current.is.revenue, prior.is.revenue);
  // Simplified remaining indices
  const DEPI = 1; // placeholder without depreciation detail
  const SGAI = 1;
  const TATA = safeDiv(
    (current.is.netIncome || 0) - (0 /* OCF if available */),
    current.bs.totalAssets
  );
  const LVGI = safeDiv(
    safeDiv(current.bs.totalLiabilities, current.bs.totalAssets) || 0,
    safeDiv(prior.bs.totalLiabilities, prior.bs.totalAssets) || 1
  );

  const inputs = {
    DSRI: DSRI ?? 1,
    GMI: GMI ?? 1,
    AQI: AQI ?? 1,
    SGI: SGI ?? 1,
    DEPI,
    SGAI,
    TATA: TATA ?? 0,
    LVGI: LVGI ?? 1,
  };

  const m =
    -4.84 +
    0.92 * (DSRI ?? 1) +
    0.528 * (GMI ?? 1) +
    0.404 * (AQI ?? 1) +
    0.892 * (SGI ?? 1) +
    0.115 * DEPI -
    0.172 * SGAI +
    4.679 * (TATA ?? 0) -
    0.327 * (LVGI ?? 1);

  const interpretation =
    m > -1.78
      ? `M-Score of ${m.toFixed(3)} exceeds the conventional threshold of -1.78, indicating a higher statistical probability of earnings manipulation. This is an anomaly signal requiring investigation, not evidence of fraud.`
      : `M-Score of ${m.toFixed(3)} is below the -1.78 threshold, suggesting lower probability of earnings manipulation according to the Beneish model.`;

  return {
    modelName: 'Beneish M-Score',
    result: m,
    zone: m > -1.78 ? 'HIGHER_MANIPULATION_PROBABILITY' : 'LOWER_MANIPULATION_PROBABILITY',
    interpretation,
    purpose: 'Statistical model to identify companies with a higher likelihood of earnings manipulation.',
    limitations:
      'High Type I error rate. Not proof of fraud. Requires careful interpretation of each index. Many legitimate business changes can elevate the score. Always treat as "requires investigation".',
    applicability: 'Useful as a forensic screening tool when multi-year data exists. Never label a company as fraudulent solely on this score.',
    inputs,
  };
}

/**
 * Piotroski F-Score (0-9)
 * Higher scores indicate stronger financial health / value characteristics.
 */
export function piotroskiFScore(
  current: FinancialPeriodData,
  prior?: FinancialPeriodData
): DistressModelResult {
  let score = 0;
  const signals: Record<string, number> = {};

  const is = current.incomeStatement;
  const bs = current.balanceSheet;
  const cf = current.cashFlow;

  // Profitability
  if (is.netIncome > 0) {
    score += 1;
    signals.positiveNetIncome = 1;
  }
  if (cf.operatingCashFlow > 0) {
    score += 1;
    signals.positiveOCF = 1;
  }
  if (prior && safeDiv(is.netIncome, bs.totalAssets)! > safeDiv(prior.incomeStatement.netIncome, prior.balanceSheet.totalAssets)!) {
    score += 1;
    signals.roaImproving = 1;
  }
  if (cf.operatingCashFlow > is.netIncome) {
    score += 1;
    signals.qualityOfEarnings = 1;
  }

  // Leverage / Liquidity
  if (prior) {
    const currLeverage = safeDiv((bs.longTermDebt || 0), bs.totalAssets);
    const priorLeverage = safeDiv((prior.balanceSheet.longTermDebt || 0), prior.balanceSheet.totalAssets);
    if (currLeverage !== null && priorLeverage !== null && currLeverage < priorLeverage) {
      score += 1;
      signals.decreasingLeverage = 1;
    }
    const currCR = safeDiv(bs.totalCurrentAssets, bs.totalCurrentLiabilities);
    const priorCR = safeDiv(prior.balanceSheet.totalCurrentAssets, prior.balanceSheet.totalCurrentLiabilities);
    if (currCR !== null && priorCR !== null && currCR > priorCR) {
      score += 1;
      signals.improvingCurrentRatio = 1;
    }
  }
  // No new equity issuance proxy (simplified)
  score += 1; // assume no dilution if data missing
  signals.noNewEquity = 1;

  // Operating efficiency
  if (prior) {
    const currMargin = safeDiv((is.grossProfit ?? is.revenue - (is.cogs || 0)), is.revenue);
    const priorMargin = safeDiv((prior.incomeStatement.grossProfit ?? prior.incomeStatement.revenue - (prior.incomeStatement.cogs || 0)), prior.incomeStatement.revenue);
    if (currMargin !== null && priorMargin !== null && currMargin > priorMargin) {
      score += 1;
      signals.improvingGrossMargin = 1;
    }
    const currATO = safeDiv(is.revenue, bs.totalAssets);
    const priorATO = safeDiv(prior.incomeStatement.revenue, prior.balanceSheet.totalAssets);
    if (currATO !== null && priorATO !== null && currATO > priorATO) {
      score += 1;
      signals.improvingAssetTurnover = 1;
    }
  }

  const interpretation =
    score >= 7
      ? `F-Score of ${score}/9 indicates strong financial health signals across profitability, leverage and efficiency dimensions.`
      : score >= 4
        ? `F-Score of ${score}/9 indicates mixed signals; some strengths and some weaknesses.`
        : `F-Score of ${score}/9 indicates relatively weak financial health signals. Further analysis recommended.`;

  return {
    modelName: 'Piotroski F-Score',
    result: score,
    zone: score >= 7 ? 'STRONG' : score >= 4 ? 'MIXED' : 'WEAK',
    interpretation,
    purpose: 'Nine-signal score measuring improvement in profitability, leverage/liquidity and operating efficiency. Originally designed for value investing screens.',
    limitations: 'Binary signals lose magnitude information. Requires prior-period data for several components. Not a bankruptcy prediction model per se. Best used comparatively.',
    applicability: 'Useful for ranking relative financial strength and identifying improving vs deteriorating trajectories.',
    inputs: signals,
  };
}

/**
 * Simple cash-flow distress indicators
 */
export function cashFlowDistressIndicators(cf: CashFlowData, is: IncomeStatementData, bs: BalanceSheetData): DistressModelResult {
  const flags: string[] = [];
  let riskScore = 0;

  if (cf.operatingCashFlow < 0) {
    flags.push('Negative operating cash flow');
    riskScore += 25;
  }
  if (is.netIncome > 0 && cf.operatingCashFlow < 0) {
    flags.push('Profitable but cash-starved (positive NI, negative OCF)');
    riskScore += 20;
  }
  if ((is.ebitda || 0) > 0 && cf.operatingCashFlow < 0) {
    flags.push('Positive EBITDA but negative operating cash flow');
    riskScore += 15;
  }
  if (cf.operatingCashFlow < 0 && (cf.financingCashFlow || 0) > 0) {
    flags.push('Operations funded by financing inflows');
    riskScore += 15;
  }
  if ((bs.cash || 0) < Math.abs(Math.min(cf.operatingCashFlow, 0)) * 3) {
    flags.push('Limited cash runway relative to cash burn');
    riskScore += 10;
  }

  const result = Math.min(100, riskScore);
  const interpretation =
    flags.length === 0
      ? 'No major cash-flow distress indicators detected from available data.'
      : `Cash-flow distress signals identified: ${flags.join('; ')}. Risk score ${result}/100.`;

  return {
    modelName: 'Cash-Flow Distress Indicators',
    result,
    zone: result >= 50 ? 'HIGH' : result >= 25 ? 'MODERATE' : 'LOW',
    interpretation,
    purpose: 'Practical indicators focusing on the quality and sustainability of cash generation relative to reported earnings.',
    limitations: 'Heuristic. Does not replace full cash-flow forecasting or covenant analysis. Sensitive to one-off items.',
    applicability: 'Universally relevant; especially important for survival and going-concern assessments.',
    inputs: {
      operatingCashFlow: cf.operatingCashFlow,
      netIncome: is.netIncome,
      ebitda: is.ebitda || 0,
      cash: bs.cash || 0,
    },
  };
}

export function runAllDistressModels(
  current: FinancialPeriodData,
  prior?: FinancialPeriodData
): DistressModelResult[] {
  const results: DistressModelResult[] = [];

  results.push(altmanZScore(current.balanceSheet, current.incomeStatement));
  results.push(altmanZPrimeScore(current.balanceSheet, current.incomeStatement));
  results.push(beneishMScore({ is: current.incomeStatement, bs: current.balanceSheet }, prior ? { is: prior.incomeStatement, bs: prior.balanceSheet } : undefined));
  results.push(piotroskiFScore(current, prior));
  results.push(cashFlowDistressIndicators(current.cashFlow, current.incomeStatement, current.balanceSheet));

  return results;
}
