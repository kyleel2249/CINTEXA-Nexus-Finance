import { describe, it, expect } from 'vitest';
import { runFullIntelligence } from '../index';
import type { FinancialPeriodData } from '@cintexa/financial-engine';

const distressed: FinancialPeriodData = {
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
    netIncome: -1_100_000,
  },
  balanceSheet: {
    cash: 150_000,
    accountsReceivable: 1_800_000,
    inventory: 1_200_000,
    totalCurrentAssets: 3_200_000,
    totalAssets: 5_500_000,
    accountsPayable: 2_200_000,
    shortTermDebt: 1_500_000,
    totalCurrentLiabilities: 4_000_000,
    longTermDebt: 3_000_000,
    totalLiabilities: 7_500_000,
    totalEquity: -2_000_000,
  },
  cashFlow: {
    operatingCashFlow: -800_000,
    financingCashFlow: 700_000,
  },
};

describe('full intelligence', () => {
  it('produces findings and recommendations for distressed company', () => {
    const result = runFullIntelligence(distressed, undefined, 90);
    expect(result.findings.length).toBeGreaterThan(3);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.actionPlans.length).toBeGreaterThan(0);
    expect(result.verdict.failureRisk).not.toBe('LOW');
    expect(result.analysis.alerts.length).toBeGreaterThan(0);
    expect(result.analysis.health.overallScore).toBeLessThan(50);
  });
});
