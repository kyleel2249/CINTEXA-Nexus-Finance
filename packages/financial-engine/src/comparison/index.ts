/**
 * Multi-year / multi-period comparison engine
 */

import type { FinancialPeriodData, RatioResult } from '../types';
import { calculateAllRatios } from '../ratios';
import { calculateHealthScore } from '../health';

export interface PeriodComparisonRow {
  metric: string;
  category: string;
  values: Array<number | null>;
  labels: string[];
  changeLatestVsPrior: number | null;
  changePct: number | null;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE' | 'INSUFFICIENT_DATA';
  risk: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL' | 'N/A';
}

function pctChange(latest: number | null, prior: number | null): number | null {
  if (latest == null || prior == null || prior === 0) return null;
  return ((latest - prior) / Math.abs(prior)) * 100;
}

function trendFromSeries(values: Array<number | null>, higherIsBetter: boolean): PeriodComparisonRow['trend'] {
  const nums = values.filter((v): v is number => v != null && !isNaN(v));
  if (nums.length < 2) return 'INSUFFICIENT_DATA';
  const first = nums[0];
  const last = nums[nums.length - 1];
  const delta = last - first;
  const rel = Math.abs(delta) / (Math.abs(first) || 1);
  if (rel < 0.05) return 'STABLE';
  const improving = higherIsBetter ? delta > 0 : delta < 0;
  // check volatility
  let flips = 0;
  for (let i = 2; i < nums.length; i++) {
    const d1 = nums[i - 1] - nums[i - 2];
    const d2 = nums[i] - nums[i - 1];
    if (d1 * d2 < 0) flips++;
  }
  if (flips >= Math.max(1, nums.length - 2)) return 'VOLATILE';
  return improving ? 'IMPROVING' : 'DETERIORATING';
}

function extractMetrics(period: FinancialPeriodData): Record<string, number | null> {
  const is = period.incomeStatement;
  const bs = period.balanceSheet;
  const cf = period.cashFlow;
  return {
    Revenue: is.revenue,
    'Gross Profit': is.grossProfit ?? (is.cogs != null ? is.revenue - is.cogs : null),
    EBITDA: is.ebitda ?? null,
    EBIT: is.ebit ?? null,
    'Net Income': is.netIncome,
    'Operating Cash Flow': cf.operatingCashFlow,
    Cash: bs.cash,
    'Total Assets': bs.totalAssets,
    'Total Liabilities': bs.totalLiabilities,
    'Total Equity': bs.totalEquity,
    'Current Assets': bs.totalCurrentAssets,
    'Current Liabilities': bs.totalCurrentLiabilities,
    'Short-term Debt': bs.shortTermDebt ?? null,
    'Long-term Debt': bs.longTermDebt ?? null,
  };
}

const HIGHER_IS_BETTER: Record<string, boolean> = {
  Revenue: true,
  'Gross Profit': true,
  EBITDA: true,
  EBIT: true,
  'Net Income': true,
  'Operating Cash Flow': true,
  Cash: true,
  'Total Assets': true,
  'Total Equity': true,
  'Current Assets': true,
  'Total Liabilities': false,
  'Current Liabilities': false,
  'Short-term Debt': false,
  'Long-term Debt': false,
};

export function comparePeriods(periods: FinancialPeriodData[]): {
  rows: PeriodComparisonRow[];
  healthByPeriod: Array<{ label: string; score: number; classification: string }>;
  ratioComparisons: Array<{ name: string; values: Array<number | null>; labels: string[] }>;
} {
  if (periods.length === 0) {
    return { rows: [], healthByPeriod: [], ratioComparisons: [] };
  }

  const labels = periods.map((p) => p.label);
  const metricMaps = periods.map(extractMetrics);
  const metricNames = Object.keys(metricMaps[0]);

  const rows: PeriodComparisonRow[] = metricNames.map((metric) => {
    const values = metricMaps.map((m) => m[metric] ?? null);
    const latest = values[values.length - 1];
    const prior = values.length > 1 ? values[values.length - 2] : null;
    const change = latest != null && prior != null ? latest - prior : null;
    const changePct = pctChange(latest, prior);
    const hib = HIGHER_IS_BETTER[metric] ?? true;
    const t = trendFromSeries(values, hib);
    let risk: PeriodComparisonRow['risk'] = 'N/A';
    if (t === 'DETERIORATING') risk = hib ? 'HIGH' : 'MODERATE';
    if (metric === 'Total Equity' && latest != null && latest <= 0) risk = 'CRITICAL';
    if (metric === 'Operating Cash Flow' && latest != null && latest < 0) risk = 'HIGH';
    return {
      metric,
      category: ['Revenue', 'Gross Profit', 'EBITDA', 'EBIT', 'Net Income'].includes(metric)
        ? 'Income Statement'
        : metric.includes('Cash Flow') || metric === 'Operating Cash Flow'
          ? 'Cash Flow'
          : 'Balance Sheet',
      values,
      labels,
      changeLatestVsPrior: change,
      changePct,
      trend: t,
      risk,
    };
  });

  const healthByPeriod = periods.map((p) => {
    const h = calculateHealthScore(p);
    return { label: p.label, score: h.overallScore, classification: h.classification };
  });

  const ratioSets = periods.map((p) => calculateAllRatios(p));
  const ratioNames = Array.from(new Set(ratioSets.flatMap((rs) => rs.map((r) => r.name))));
  const ratioComparisons = ratioNames.map((name) => ({
    name,
    labels,
    values: ratioSets.map((rs) => rs.find((r) => r.name === name)?.value ?? null),
  }));

  return { rows, healthByPeriod, ratioComparisons };
}
