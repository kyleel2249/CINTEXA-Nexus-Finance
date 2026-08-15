import { describe, it, expect } from 'vitest';
import { analyzePeriod, calculateAllRatios, altmanZScore, calculateHealthScore, estimateSurvival } from '../index';
import type { FinancialPeriodData } from '../types';

const healthyCompany: FinancialPeriodData = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 10_000_000,
    cogs: 6_000_000,
    grossProfit: 4_000_000,
    operatingExpenses: 2_000_000,
    ebitda: 2_200_000,
    ebit: 2_000_000,
    financeCosts: 150_000,
    profitBeforeTax: 1_850_000,
    tax: 450_000,
    netIncome: 1_400_000,
  },
  balanceSheet: {
    cash: 2_500_000,
    accountsReceivable: 1_200_000,
    inventory: 800_000,
    totalCurrentAssets: 4_800_000,
    ppe: 5_000_000,
    totalAssets: 11_000_000,
    accountsPayable: 900_000,
    shortTermDebt: 300_000,
    totalCurrentLiabilities: 1_500_000,
    longTermDebt: 2_000_000,
    totalLiabilities: 4_000_000,
    shareCapital: 3_000_000,
    retainedEarnings: 4_000_000,
    totalEquity: 7_000_000,
  },
  cashFlow: {
    operatingCashFlow: 1_800_000,
    investingCashFlow: -600_000,
    financingCashFlow: -400_000,
    freeCashFlow: 1_200_000,
    capitalExpenditure: 600_000,
    netChangeInCash: 800_000,
    openingCash: 1_700_000,
    closingCash: 2_500_000,
  },
  isAudited: true,
};

const distressedCompany: FinancialPeriodData = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 5_000_000,
    cogs: 4_200_000,
    grossProfit: 800_000,
    operatingExpenses: 1_500_000,
    ebitda: -500_000,
    ebit: -700_000,
    financeCosts: 400_000,
    profitBeforeTax: -1_100_000,
    tax: 0,
    netIncome: -1_100_000,
  },
  balanceSheet: {
    cash: 150_000,
    accountsReceivable: 1_800_000,
    inventory: 1_200_000,
    totalCurrentAssets: 3_200_000,
    ppe: 2_000_000,
    totalAssets: 5_500_000,
    accountsPayable: 2_200_000,
    shortTermDebt: 1_500_000,
    totalCurrentLiabilities: 4_000_000,
    longTermDebt: 3_000_000,
    totalLiabilities: 7_500_000,
    shareCapital: 1_000_000,
    retainedEarnings: -3_000_000,
    totalEquity: -2_000_000,
  },
  cashFlow: {
    operatingCashFlow: -800_000,
    investingCashFlow: -50_000,
    financingCashFlow: 700_000,
    freeCashFlow: -850_000,
    netChangeInCash: -150_000,
    openingCash: 300_000,
    closingCash: 150_000,
  },
};

describe('Financial Engine', () => {
  it('produces materially different health scores for healthy vs distressed', () => {
    const healthy = calculateHealthScore(healthyCompany);
    const distressed = calculateHealthScore(distressedCompany);
    expect(healthy.overallScore).toBeGreaterThan(70);
    expect(distressed.overallScore).toBeLessThan(40);
    expect(healthy.classification).not.toEqual(distressed.classification);
  });

  it('calculates key ratios for healthy company', () => {
    const ratios = calculateAllRatios(healthyCompany);
    const current = ratios.find((r) => r.name === 'Current Ratio');
    expect(current?.value).toBeCloseTo(3.2, 1);
    expect(current?.riskLevel).toBe('LOW');
  });

  it('flags distress on Altman for distressed company', () => {
    const z = altmanZScore(distressedCompany.balanceSheet, distressedCompany.incomeStatement);
    expect(z.result).not.toBeNull();
    expect(z.zone).toBe('DISTRESS');
  });

  it('estimates shorter runway for distressed company', () => {
    const healthySurv = estimateSurvival(healthyCompany);
    const distressedSurv = estimateSurvival(distressedCompany);
    expect(distressedSurv.runwayMonthsBase).not.toBeNull();
    expect(healthySurv.runwayMonthsBase).toBeGreaterThan(distressedSurv.runwayMonthsBase!);
    expect(distressedSurv.failureRisk === 'HIGH' || distressedSurv.failureRisk === 'SEVERE' || distressedSurv.failureRisk === 'CRITICAL').toBe(true);
  });

  it('full analyzePeriod returns complete structure', () => {
    const result = analyzePeriod(healthyCompany);
    expect(result.ratios.length).toBeGreaterThan(5);
    expect(result.distressModels.length).toBeGreaterThan(3);
    expect(result.health.overallScore).toBeGreaterThan(0);
    expect(result.survival.survivalProbability12m).toBeGreaterThan(0);
    expect(result.scenarios.length).toBe(5);
    expect(result.reconciliations.length).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('AI-assisted');
  });
});
