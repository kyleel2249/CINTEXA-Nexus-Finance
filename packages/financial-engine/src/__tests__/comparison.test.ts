import { describe, it, expect } from 'vitest';
import { comparePeriods } from '../comparison';
import type { FinancialPeriodData } from '../types';

function period(label: string, year: number, revenue: number, ni: number, cash: number, equity: number): FinancialPeriodData {
  return {
    label,
    fiscalYear: year,
    incomeStatement: { revenue, netIncome: ni, cogs: revenue * 0.6, grossProfit: revenue * 0.4 },
    balanceSheet: {
      cash,
      totalCurrentAssets: cash + 1000,
      totalAssets: cash + 5000,
      totalCurrentLiabilities: 800,
      totalLiabilities: 2000,
      totalEquity: equity,
    },
    cashFlow: { operatingCashFlow: ni * 0.8 },
  };
}

describe('comparePeriods', () => {
  it('shows deterioration when revenue and equity fall', () => {
    const result = comparePeriods([
      period('FY2023', 2023, 10_000_000, 1_000_000, 2_000_000, 5_000_000),
      period('FY2024', 2024, 8_000_000, 200_000, 1_000_000, 4_000_000),
      period('FY2025', 2025, 5_000_000, -500_000, 200_000, 1_000_000),
    ]);
    const rev = result.rows.find((r) => r.metric === 'Revenue');
    expect(rev?.trend).toBe('DETERIORATING');
    expect(result.healthByPeriod).toHaveLength(3);
    expect(result.healthByPeriod[0].score).toBeGreaterThan(result.healthByPeriod[2].score);
  });
});
