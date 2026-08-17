import { describe, it, expect } from 'vitest';
import { screenBenford, screenEarningsCashDivergence, runForensicScreens } from '../forensic';
import { assessGoingConcern } from '../goingConcern';
import { analyzePeriod } from '../index';
import type { FinancialPeriodData } from '../types';

describe('forensic screens', () => {
  it('returns insufficient evidence for small Benford samples', () => {
    const f = screenBenford([100, 200, 300]);
    expect(f?.disposition).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('flags earnings vs cash divergence without calling it fraud', () => {
    const f = screenEarningsCashDivergence(1_000_000, -500_000);
    expect(f?.severity).toBe('HIGH');
    expect(f?.description.toLowerCase()).not.toContain('fraud');
    expect(f?.disposition).toBe('REQUIRES_INVESTIGATION');
  });

  it('analyzePeriod includes forensic and goingConcern', () => {
    const period: FinancialPeriodData = {
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: { revenue: 5e6, netIncome: -1e6, ebit: -7e5, financeCosts: 4e5 },
      balanceSheet: {
        cash: 1e5,
        totalCurrentAssets: 3e6,
        totalAssets: 5e6,
        totalCurrentLiabilities: 4e6,
        totalLiabilities: 7e6,
        totalEquity: -2e6,
      },
      cashFlow: { operatingCashFlow: -8e5 },
    };
    const r = analyzePeriod(period, undefined, 90);
    expect(r.forensic.length).toBeGreaterThan(0);
    expect(r.goingConcern.indicator).not.toBe('NO_MATERIAL_UNCERTAINTY_INDICATED');
    expect(r.goingConcern.professionalNote).toContain('not a substitute');
  });
});
