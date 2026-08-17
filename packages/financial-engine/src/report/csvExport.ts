/**
 * CSV exporters for ratios and comparison tables
 */

import type { RatioResult } from '../types';
import type { PeriodComparisonRow } from '../comparison';

function esc(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ratiosToCsv(ratios: RatioResult[]): string {
  const header = ['Name', 'Category', 'Value', 'RiskLevel', 'Interpretation', 'Formula'];
  const rows = ratios.map((r) =>
    [r.name, r.category, r.value, r.riskLevel, r.interpretation, r.formula].map(esc).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function comparisonToCsv(rows: PeriodComparisonRow[]): string {
  if (rows.length === 0) return 'Metric\n';
  const labels = rows[0].labels;
  const header = ['Metric', 'Category', ...labels, 'Change', 'ChangePct', 'Trend', 'Risk'];
  const lines = rows.map((r) =>
    [
      r.metric,
      r.category,
      ...r.values.map((v) => (v == null ? '' : v)),
      r.changeLatestVsPrior,
      r.changePct,
      r.trend,
      r.risk,
    ]
      .map(esc)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}
