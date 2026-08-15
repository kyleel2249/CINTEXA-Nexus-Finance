/**
 * Corporate Survival & Runway Estimation Engine
 * Probabilistic, assumption-driven, fully transparent.
 */

import type { FinancialPeriodData, SurvivalEstimate, ScenarioAssumption, ScenarioResult } from '../types';

function monthlyBurn(period: FinancialPeriodData): number {
  const ocf = period.cashFlow.operatingCashFlow;
  // Approximate monthly operating cash burn (negative OCF means burn)
  if (ocf < 0) return Math.abs(ocf) / 12;
  // Even with positive OCF, consider fixed obligations
  const interest = (period.incomeStatement.financeCosts || 0) / 12;
  return Math.max(0, interest);
}

function estimateRunwayMonths(cash: number, burn: number, additionalMonthlyInflow = 0): number | null {
  const netBurn = burn - additionalMonthlyInflow;
  if (netBurn <= 0) return 120; // effectively unlimited under assumptions
  if (cash <= 0) return 0;
  return cash / netBurn;
}

export function estimateSurvival(period: FinancialPeriodData, dataQuality = 70): SurvivalEstimate {
  const cash = period.balanceSheet.cash || 0;
  const burn = monthlyBurn(period);
  const ocf = period.cashFlow.operatingCashFlow;
  const ni = period.incomeStatement.netIncome;
  const equity = period.balanceSheet.totalEquity;
  const currentRatio = (period.balanceSheet.totalCurrentAssets || 0) / (period.balanceSheet.totalCurrentLiabilities || 1);

  const runwayBase = estimateRunwayMonths(cash, burn);
  const runwayOptimistic = estimateRunwayMonths(cash, burn * 0.7, ocf > 0 ? ocf / 24 : 0);
  const runwayPessimistic = estimateRunwayMonths(cash, burn * 1.4);
  const runwayStress = estimateRunwayMonths(cash * 0.7, burn * 1.8);
  const runwayRecovery = estimateRunwayMonths(cash + Math.max(0, -ocf) * 0.3, burn * 0.6, Math.max(0, ocf) / 12);

  // Simple logistic-style survival probability heuristics
  let p12 = 0.75;
  if (equity <= 0) p12 -= 0.35;
  if (ocf < 0) p12 -= 0.15;
  if (ni < 0) p12 -= 0.1;
  if (currentRatio < 1) p12 -= 0.15;
  if (currentRatio < 0.8) p12 -= 0.1;
  if (runwayBase !== null && runwayBase < 6) p12 -= 0.25;
  else if (runwayBase !== null && runwayBase < 12) p12 -= 0.1;
  if (cash > Math.abs(Math.min(ocf, 0))) p12 += 0.05;
  p12 = Math.max(0.05, Math.min(0.98, p12));

  const p24 = Math.max(0.03, p12 * 0.85 - (runwayBase !== null && runwayBase < 18 ? 0.1 : 0));
  const p36 = Math.max(0.02, p24 * 0.8);

  let failureRisk: SurvivalEstimate['failureRisk'] = 'LOW';
  if (p12 < 0.4 || (runwayBase !== null && runwayBase < 6)) failureRisk = 'CRITICAL';
  else if (p12 < 0.55 || (runwayBase !== null && runwayBase < 10)) failureRisk = 'SEVERE';
  else if (p12 < 0.7 || (runwayBase !== null && runwayBase < 15)) failureRisk = 'HIGH';
  else if (p12 < 0.85) failureRisk = 'MODERATE';

  const primaryConstraint =
    ocf < 0 && ni >= 0
      ? 'Operating cash flow rather than reported profitability'
      : equity <= 0
        ? 'Negative equity / solvency'
        : runwayBase !== null && runwayBase < 12
          ? 'Cash runway'
          : currentRatio < 1
            ? 'Liquidity / working capital'
            : 'Multiple factors; see detailed analysis';

  const assumptions = [
    'Current cash balance is available and unrestricted',
    'Monthly cash burn approximated from annual operating cash flow',
    'No major one-off cash inflows or outflows beyond modeled scenarios',
    'Debt maturities and covenant tests not fully modeled unless debt schedule provided',
    'Macroeconomic and industry conditions assumed stable unless stress scenario applied',
    'Management does not implement extraordinary recovery actions in base case',
  ];

  const drivers = [];
  if (ocf < 0) drivers.push('Negative operating cash flow');
  if (ni < 0) drivers.push('Net losses');
  if (equity <= 0) drivers.push('Negative or depleted equity');
  if (currentRatio < 1) drivers.push('Current ratio below 1.0');
  if (runwayBase !== null && runwayBase < 12) drivers.push(`Short cash runway (~${runwayBase.toFixed(1)} months)`);
  if (drivers.length === 0) drivers.push('No dominant distress driver identified from available data');

  const confidence = Math.min(95, Math.max(20, dataQuality - (runwayBase === null ? 20 : 0)));

  return {
    runwayMonthsBase: runwayBase !== null ? Math.round(runwayBase * 10) / 10 : null,
    runwayMonthsOptimistic: runwayOptimistic !== null ? Math.round(runwayOptimistic * 10) / 10 : null,
    runwayMonthsPessimistic: runwayPessimistic !== null ? Math.round(runwayPessimistic * 10) / 10 : null,
    runwayMonthsStress: runwayStress !== null ? Math.round(runwayStress * 10) / 10 : null,
    runwayMonthsRecovery: runwayRecovery !== null ? Math.round(runwayRecovery * 10) / 10 : null,
    survivalProbability12m: Math.round(p12 * 1000) / 10,
    survivalProbability24m: Math.round(p24 * 1000) / 10,
    survivalProbability36m: Math.round(p36 * 1000) / 10,
    failureRisk,
    primaryConstraint,
    assumptions,
    confidence,
    dataQuality,
    methodology:
      'Runway estimated as Cash / Net Monthly Burn under stated assumptions. Survival probabilities are heuristic transformations of liquidity, profitability, solvency and runway indicators. They are analytical estimates only, not actuarial or guaranteed forecasts. Confidence is reduced when data quality is low or key statements are missing.',
    drivers,
  };
}

export function runScenario(
  period: FinancialPeriodData,
  name: string,
  type: ScenarioResult['type'],
  assumptions: ScenarioAssumption,
  months = 24
): ScenarioResult {
  const baseRevenue = period.incomeStatement.revenue;
  const baseGrossMargin =
    period.incomeStatement.grossProfit !== undefined
      ? period.incomeStatement.grossProfit / baseRevenue
      : (baseRevenue - (period.incomeStatement.cogs || 0)) / baseRevenue;
  const baseOpex = period.incomeStatement.operatingExpenses || (period.incomeStatement.ebitda !== undefined ? baseRevenue * baseGrossMargin - period.incomeStatement.ebitda : baseRevenue * 0.3);
  const baseCash = period.balanceSheet.cash || 0;
  const baseDebt = (period.balanceSheet.shortTermDebt || 0) + (period.balanceSheet.longTermDebt || 0);

  const revMult = 1 + (assumptions.revenueChangePct || 0) / 100;
  const gmDelta = (assumptions.grossMarginChangePct || 0) / 100;
  const opexMult = 1 + (assumptions.opexChangePct || 0) / 100 + (assumptions.payrollChangePct || 0) / 200;
  const costRed = (assumptions.costReductionPct || 0) / 100;

  const projectedRevenue: number[] = [];
  const projectedEbitda: number[] = [];
  const projectedOcf: number[] = [];
  const projectedCash: number[] = [];
  const projectedDebt: number[] = [];
  const liquidity: number[] = [];

  let cash = baseCash + (assumptions.newInvestment || 0) + (assumptions.assetSaleProceeds || 0);
  let debt = baseDebt;
  let monthlyBurnEst = 0;

  for (let m = 1; m <= months; m++) {
    const rev = (baseRevenue / 12) * revMult * (1 + (m / months) * (assumptions.revenueChangePct || 0) / 200);
    const gm = Math.max(0.01, baseGrossMargin + gmDelta);
    const opex = (baseOpex / 12) * opexMult * (1 - costRed);
    const ebitda = rev * gm - opex;
    // Simplified OCF ≈ EBITDA - tax proxy - WC changes (ignored)
    const ocf = ebitda * 0.7;
    cash += ocf;
    if (assumptions.debtRepaymentDelayMonths && m <= assumptions.debtRepaymentDelayMonths) {
      // no repayment
    } else {
      cash -= Math.min(debt * 0.02, cash * 0.1); // simplified debt service
      debt *= 0.99;
    }
    projectedRevenue.push(Math.round(rev));
    projectedEbitda.push(Math.round(ebitda));
    projectedOcf.push(Math.round(ocf));
    projectedCash.push(Math.round(cash));
    projectedDebt.push(Math.round(debt));
    liquidity.push(Math.round(cash));
    if (m === 1) monthlyBurnEst = ocf < 0 ? Math.abs(ocf) : 0;
  }

  const finalCash = projectedCash[projectedCash.length - 1] || 0;
  const runway = finalCash > 0 && monthlyBurnEst > 0 ? finalCash / monthlyBurnEst : finalCash > 0 ? 36 : 0;
  const survivalProbability = Math.max(5, Math.min(98, 50 + finalCash / (baseRevenue * 0.1) * 10 - (debt / (baseRevenue || 1)) * 5));

  return {
    name,
    type,
    assumptions,
    projectedCash,
    monthlyBurn: monthlyBurnEst,
    projectedRevenue,
    projectedEbitda,
    projectedOcf,
    projectedDebt,
    liquidity,
    survivalProbability: Math.round(survivalProbability * 10) / 10,
    runwayMonths: Math.round(runway * 10) / 10,
  };
}

export function generateStandardScenarios(period: FinancialPeriodData): ScenarioResult[] {
  return [
    runScenario(period, 'Base Case', 'BASE', {}),
    runScenario(period, 'Optimistic', 'OPTIMISTIC', { revenueChangePct: 10, grossMarginChangePct: 2, costReductionPct: 5 }),
    runScenario(period, 'Pessimistic', 'PESSIMISTIC', { revenueChangePct: -10, grossMarginChangePct: -3, opexChangePct: 5 }),
    runScenario(period, 'Severe Stress', 'SEVERE_STRESS', { revenueChangePct: -25, grossMarginChangePct: -5, opexChangePct: 10, interestRateChangePct: 2 }),
    runScenario(period, 'Management Recovery', 'MANAGEMENT_RECOVERY', { revenueChangePct: 5, costReductionPct: 12, grossMarginChangePct: 3 }),
  ];
}
