/**
 * Executive Summary / Final Verdict generator
 */

import type { HealthScoreResult, SurvivalEstimate, DistressModelResult } from '../types';

export interface ExecutiveVerdict {
  currentCondition: string;
  financialHealth: number;
  liquidityRisk: string;
  solvencyRisk: string;
  cashFlowRisk: string;
  goingConcernRisk: string;
  estimatedRunwayMonths: number | null;
  survival12m: number | null;
  survival24m: number | null;
  failureRisk: string;
  confidence: number;
  topRisks: string[];
  topRecommendations: string[];
  why: string;
  whatCouldChange: string;
  whatManagementShouldDo: string;
  whatToAuditFurther: string;
  missingData: string[];
}

export function buildExecutiveVerdict(params: {
  health: HealthScoreResult;
  survival: SurvivalEstimate;
  distressModels: DistressModelResult[];
  topFindingTitles: string[];
  topRecActions: string[];
  dataQuality: number;
  reconciliationFailures: number;
}): ExecutiveVerdict {
  const { health, survival, distressModels, topFindingTitles, topRecActions, dataQuality, reconciliationFailures } = params;

  const conditionMap: Record<string, string> = {
    EXCEPTIONAL: 'Healthy',
    HEALTHY: 'Healthy',
    STABLE_WATCH: 'Watch',
    FINANCIAL_PRESSURE: 'Distressed',
    DISTRESSED: 'Distressed',
    CRITICAL: 'Critical',
  };

  const missing: string[] = [];
  if (dataQuality < 70) missing.push('Higher-quality or complete financial statements');
  if (reconciliationFailures > 0) missing.push('Resolved balance-sheet / cash-flow reconciliations');

  const altman = distressModels.find((m) => m.modelName.includes('Altman Z-Score') && !m.modelName.includes("Z'"));
  const whyParts = [
    `Health score ${health.overallScore}/100 (${health.classification.replace(/_/g, ' ')}).`,
    `Primary survival constraint: ${survival.primaryConstraint}.`,
    survival.drivers.length ? `Key drivers: ${survival.drivers.join('; ')}.` : '',
    altman?.zone ? `Altman zone: ${altman.zone}.` : '',
  ].filter(Boolean);

  return {
    currentCondition: conditionMap[health.classification] || health.classification,
    financialHealth: health.overallScore,
    liquidityRisk: health.dimensions.liquidity >= 70 ? 'Low' : health.dimensions.liquidity >= 45 ? 'Moderate' : 'High',
    solvencyRisk: health.dimensions.solvency >= 70 ? 'Low' : health.dimensions.solvency >= 45 ? 'Moderate' : 'High',
    cashFlowRisk: health.dimensions.cashFlowStrength >= 70 ? 'Low' : health.dimensions.cashFlowStrength >= 45 ? 'Moderate' : 'High',
    goingConcernRisk: survival.failureRisk,
    estimatedRunwayMonths: survival.runwayMonthsBase,
    survival12m: survival.survivalProbability12m,
    survival24m: survival.survivalProbability24m,
    failureRisk: survival.failureRisk,
    confidence: survival.confidence,
    topRisks: topFindingTitles.slice(0, 5),
    topRecommendations: topRecActions.slice(0, 5),
    why: whyParts.join(' '),
    whatCouldChange:
      'Improved operating cash flow, successful cost reduction, equity injection, debt restructuring, or material revenue recovery could improve the assessment. Adverse shocks, covenant breaches or further cash burn would worsen it.',
    whatManagementShouldDo:
      survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE'
        ? 'Prioritize liquidity, engage lenders and advisors immediately, and implement the emergency action plan.'
        : health.overallScore < 60
          ? 'Stabilize cash and working capital within 30–90 days; track health score monthly.'
          : 'Maintain resilience, run stress tests, and protect covenant headroom.',
    whatToAuditFurther:
      reconciliationFailures > 0
        ? 'Unresolved statement reconciliations and any elevated forensic signals.'
        : 'Debt schedule completeness, going-concern disclosures, and any related-party or year-end anomalies.',
    missingData: missing.length ? missing : ['None material identified at current data quality'],
  };
}
