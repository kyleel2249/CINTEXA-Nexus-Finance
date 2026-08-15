/**
 * Financial Health Score Engine (0-100)
 * Configurable weights across liquidity, cash-flow, profitability, solvency, etc.
 */

import type { FinancialPeriodData, HealthScoreResult, RatioResult } from '../types';
import { calculateAllRatios } from '../ratios';

const DEFAULT_WEIGHTS = {
  liquidity: 0.15,
  cashFlowStrength: 0.2,
  profitability: 0.15,
  solvency: 0.15,
  debtSustainability: 0.1,
  workingCapital: 0.1,
  growthQuality: 0.05,
  balanceSheetQuality: 0.05,
  earningsQuality: 0.05,
};

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function scoreLiquidity(ratios: RatioResult[]): number {
  const current = ratios.find((r) => r.name === 'Current Ratio')?.value;
  const quick = ratios.find((r) => r.name === 'Quick Ratio')?.value;
  const cash = ratios.find((r) => r.name === 'Cash Ratio')?.value;
  let s = 50;
  if (current !== null && current !== undefined) {
    if (current >= 2) s = 95;
    else if (current >= 1.5) s = 80;
    else if (current >= 1.2) s = 65;
    else if (current >= 1) s = 45;
    else if (current >= 0.8) s = 25;
    else s = 10;
  }
  if (quick !== null && quick !== undefined) {
    s = (s + (quick >= 1 ? 90 : quick >= 0.7 ? 70 : quick >= 0.4 ? 40 : 15)) / 2;
  }
  return clamp(s);
}

function scoreCashFlow(period: FinancialPeriodData): number {
  const ocf = period.cashFlow.operatingCashFlow;
  const ni = period.incomeStatement.netIncome;
  const ebitda = period.incomeStatement.ebitda || 0;
  let s = 50;
  if (ocf > 0 && ocf > ni * 0.8) s = 90;
  else if (ocf > 0) s = 70;
  else if (ocf > -Math.abs(ni) * 0.5) s = 40;
  else s = 15;
  if (ebitda > 0 && ocf < 0) s = Math.min(s, 35);
  return clamp(s);
}

function scoreProfitability(ratios: RatioResult[]): number {
  const net = ratios.find((r) => r.name === 'Net Profit Margin')?.value;
  const op = ratios.find((r) => r.name === 'Operating Margin (EBIT)')?.value;
  let s = 50;
  if (net !== null && net !== undefined) {
    if (net >= 12) s = 95;
    else if (net >= 6) s = 80;
    else if (net >= 2) s = 60;
    else if (net >= 0) s = 40;
    else if (net >= -5) s = 20;
    else s = 5;
  }
  if (op !== null && op !== undefined) {
    s = (s + (op >= 15 ? 90 : op >= 8 ? 75 : op >= 3 ? 55 : op >= 0 ? 35 : 10)) / 2;
  }
  return clamp(s);
}

function scoreSolvency(ratios: RatioResult[], period: FinancialPeriodData): number {
  const de = ratios.find((r) => r.name === 'Debt-to-Equity')?.value;
  const equityRatio = ratios.find((r) => r.name === 'Equity Ratio')?.value;
  const interest = ratios.find((r) => r.name === 'Interest Coverage Ratio')?.value;
  let s = 50;
  if (period.balanceSheet.totalEquity <= 0) return 5;
  if (de !== null && de !== undefined) {
    if (de <= 0.5) s = 90;
    else if (de <= 1) s = 75;
    else if (de <= 2) s = 55;
    else if (de <= 3.5) s = 30;
    else s = 10;
  }
  if (interest !== null && interest !== undefined) {
    s = (s + (interest >= 5 ? 90 : interest >= 2.5 ? 70 : interest >= 1.5 ? 45 : interest >= 1 ? 25 : 5)) / 2;
  }
  if (equityRatio !== null && equityRatio !== undefined) {
    s = (s + (equityRatio >= 40 ? 90 : equityRatio >= 25 ? 70 : equityRatio >= 15 ? 45 : 15)) / 2;
  }
  return clamp(s);
}

function scoreDebtSustainability(ratios: RatioResult[]): number {
  const netDebtEbitda = ratios.find((r) => r.name === 'Net Debt / EBITDA')?.value;
  const interest = ratios.find((r) => r.name === 'Interest Coverage Ratio')?.value;
  let s = 60;
  if (netDebtEbitda !== null && netDebtEbitda !== undefined) {
    if (netDebtEbitda <= 1.5) s = 95;
    else if (netDebtEbitda <= 2.5) s = 80;
    else if (netDebtEbitda <= 3.5) s = 60;
    else if (netDebtEbitda <= 5) s = 35;
    else s = 10;
  }
  if (interest !== null && interest !== undefined && interest < 2) s = Math.min(s, 30);
  return clamp(s);
}

function scoreWorkingCapital(period: FinancialPeriodData): number {
  const wc = (period.balanceSheet.totalCurrentAssets || 0) - (period.balanceSheet.totalCurrentLiabilities || 0);
  const ca = period.balanceSheet.totalCurrentAssets || 1;
  const ratio = wc / ca;
  if (ratio >= 0.3) return 90;
  if (ratio >= 0.15) return 75;
  if (ratio >= 0) return 55;
  if (ratio >= -0.15) return 30;
  return 10;
}

function scoreGrowthQuality(_period: FinancialPeriodData): number {
  // Without multi-year data we cannot assess growth quality robustly
  return 55;
}

function scoreBalanceSheetQuality(period: FinancialPeriodData): number {
  const bs = period.balanceSheet;
  let s = 70;
  if (bs.totalEquity <= 0) s -= 40;
  const intangibles = bs.intangibleAssets || 0;
  if (intangibles / (bs.totalAssets || 1) > 0.4) s -= 15;
  if ((bs.cash || 0) / (bs.totalAssets || 1) < 0.02) s -= 10;
  return clamp(s);
}

function scoreEarningsQuality(period: FinancialPeriodData): number {
  const ocf = period.cashFlow.operatingCashFlow;
  const ni = period.incomeStatement.netIncome;
  if (ni <= 0 && ocf <= 0) return 20;
  if (ni > 0 && ocf > ni * 0.9) return 90;
  if (ni > 0 && ocf > 0) return 70;
  if (ni > 0 && ocf < 0) return 25;
  return 45;
}

function classify(score: number): HealthScoreResult['classification'] {
  if (score >= 90) return 'EXCEPTIONAL';
  if (score >= 75) return 'HEALTHY';
  if (score >= 60) return 'STABLE_WATCH';
  if (score >= 45) return 'FINANCIAL_PRESSURE';
  if (score >= 30) return 'DISTRESSED';
  return 'CRITICAL';
}

export function calculateHealthScore(
  period: FinancialPeriodData,
  weights: Partial<typeof DEFAULT_WEIGHTS> = {}
): HealthScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const ratios = calculateAllRatios(period);

  const dimensions = {
    liquidity: scoreLiquidity(ratios),
    cashFlowStrength: scoreCashFlow(period),
    profitability: scoreProfitability(ratios),
    solvency: scoreSolvency(ratios, period),
    debtSustainability: scoreDebtSustainability(ratios),
    workingCapital: scoreWorkingCapital(period),
    growthQuality: scoreGrowthQuality(period),
    balanceSheetQuality: scoreBalanceSheetQuality(period),
    earningsQuality: scoreEarningsQuality(period),
  };

  const overall =
    dimensions.liquidity * w.liquidity +
    dimensions.cashFlowStrength * w.cashFlowStrength +
    dimensions.profitability * w.profitability +
    dimensions.solvency * w.solvency +
    dimensions.debtSustainability * w.debtSustainability +
    dimensions.workingCapital * w.workingCapital +
    dimensions.growthQuality * w.growthQuality +
    dimensions.balanceSheetQuality * w.balanceSheetQuality +
    dimensions.earningsQuality * w.earningsQuality;

  const classification = classify(overall);

  const explanation = `Financial Health Score of ${overall.toFixed(1)}/100 classified as ${classification.replace('_', ' / ')}. 
Key drivers: Liquidity ${dimensions.liquidity.toFixed(0)}, Cash-flow ${dimensions.cashFlowStrength.toFixed(0)}, 
Profitability ${dimensions.profitability.toFixed(0)}, Solvency ${dimensions.solvency.toFixed(0)}. 
This composite score is an analytical indicator only and must be interpreted alongside detailed ratio analysis, 
cash-flow forecasts, qualitative factors and professional judgment.`;

  return {
    overallScore: Math.round(overall * 10) / 10,
    classification,
    dimensions,
    explanation,
    weights: w,
  };
}
