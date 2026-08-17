/**
 * Audit risk heatmap by category
 */

import type { RatioResult, SurvivalEstimate, HealthScoreResult, ReconciliationResult } from '../types';
import type { FinancialAlert } from '../alerts';

export type HeatLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';

export interface HeatCell {
  category: string;
  level: HeatLevel;
  score: number;
  drivers: string[];
}

const RANK: Record<HeatLevel, number> = {
  LOW: 20,
  MODERATE: 40,
  HIGH: 60,
  SEVERE: 80,
  CRITICAL: 100,
};

function maxLevel(levels: HeatLevel[]): HeatLevel {
  return [...levels].sort((a, b) => RANK[b] - RANK[a])[0] || 'LOW';
}

export function buildAuditHeatmap(input: {
  ratios: RatioResult[];
  health: HealthScoreResult;
  survival: SurvivalEstimate;
  reconciliations: ReconciliationResult[];
  alerts: FinancialAlert[];
}): HeatCell[] {
  const { ratios, health, survival, reconciliations, alerts } = input;
  const byName = (n: string) => ratios.find((r) => r.name === n);

  const liquidityLevels: HeatLevel[] = [];
  const cr = byName('Current Ratio');
  if (cr?.riskLevel) liquidityLevels.push(cr.riskLevel as HeatLevel);
  if (health.dimensions.liquidity < 40) liquidityLevels.push('HIGH');
  if (health.dimensions.liquidity < 25) liquidityLevels.push('SEVERE');

  const cashLevels: HeatLevel[] = [];
  if (health.dimensions.cashFlowStrength < 40) cashLevels.push('HIGH');
  if (alerts.some((a) => a.type === 'NEGATIVE_OPERATING_CASH_FLOW')) cashLevels.push('HIGH');
  if (survival.runwayMonthsBase != null && survival.runwayMonthsBase < 6) cashLevels.push('CRITICAL');

  const solvencyLevels: HeatLevel[] = [];
  const de = byName('Debt-to-Equity');
  if (de?.riskLevel) solvencyLevels.push(de.riskLevel as HeatLevel);
  if (health.dimensions.solvency < 40) solvencyLevels.push('HIGH');

  const goingConcern: HeatLevel[] = [survival.failureRisk as HeatLevel];
  if (alerts.some((a) => a.type === 'NEGATIVE_EQUITY')) goingConcern.push('CRITICAL');

  const accounting: HeatLevel[] = reconciliations.some((r) => !r.isBalanced) ? ['HIGH'] : ['LOW'];

  return [
    {
      category: 'Liquidity',
      level: maxLevel(liquidityLevels.length ? liquidityLevels : ['LOW']),
      score: 100 - health.dimensions.liquidity,
      drivers: [cr ? `Current ratio ${cr.value?.toFixed?.(2)}` : 'n/a'],
    },
    {
      category: 'Cash',
      level: maxLevel(cashLevels.length ? cashLevels : ['LOW']),
      score: 100 - health.dimensions.cashFlowStrength,
      drivers: survival.drivers.slice(0, 3),
    },
    {
      category: 'Profitability',
      level: health.dimensions.profitability < 30 ? 'HIGH' : health.dimensions.profitability < 50 ? 'MODERATE' : 'LOW',
      score: 100 - health.dimensions.profitability,
      drivers: [`Profitability dimension ${health.dimensions.profitability}`],
    },
    {
      category: 'Debt',
      level: maxLevel(solvencyLevels.length ? solvencyLevels : ['LOW']),
      score: 100 - health.dimensions.debtSustainability,
      drivers: [de ? `D/E ${de.value?.toFixed?.(2)}` : 'n/a'],
    },
    {
      category: 'Going Concern',
      level: maxLevel(goingConcern),
      score: RANK[survival.failureRisk as HeatLevel] || 40,
      drivers: [survival.primaryConstraint],
    },
    {
      category: 'Accounting',
      level: maxLevel(accounting),
      score: reconciliations.filter((r) => !r.isBalanced).length * 30,
      drivers: reconciliations.filter((r) => !r.isBalanced).map((r) => r.check),
    },
    {
      category: 'Overall',
      level:
        health.overallScore < 30
          ? 'CRITICAL'
          : health.overallScore < 45
            ? 'SEVERE'
            : health.overallScore < 60
              ? 'HIGH'
              : health.overallScore < 75
                ? 'MODERATE'
                : 'LOW',
      score: 100 - health.overallScore,
      drivers: [`Health ${health.overallScore}`],
    },
  ];
}
