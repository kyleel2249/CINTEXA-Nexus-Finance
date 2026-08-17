/**
 * @cintexa/financial-engine
 * Core calculation, distress, health, survival and reconciliation engines
 * for CINTEXA Nexus Financial Health, Audit & Corporate Survival Intelligence.
 */

export * from './types';
export * from './ratios';
export * from './distress';
export * from './health';
export * from './survival';
export * from './reconciliation';
export * from './report/executiveSummary';
export * from './report/reportBuilder';
export * from './report/htmlReport';
export * from './report/csvExport';
export * from './alerts';
export * from './comparison';
export * from './memo';
export * from './heatmap';
export * from './forensic';
export * from './goingConcern';

import { calculateAllRatios } from './ratios';
import { runAllDistressModels } from './distress';
import { calculateHealthScore } from './health';
import { estimateSurvival, generateStandardScenarios } from './survival';
import { runAllReconciliations } from './reconciliation';
import { evaluateAlerts } from './alerts';
import { buildAuditHeatmap } from './heatmap';
import { runForensicScreens } from './forensic';
import { assessGoingConcern } from './goingConcern';
import type { FinancialPeriodData } from './types';

/**
 * Full analysis pipeline for a single period (and optional prior period).
 * Returns a structured Corporate Financial Intelligence Profile fragment.
 */
export function analyzePeriod(current: FinancialPeriodData, prior?: FinancialPeriodData, dataQuality = 75) {
  const ratios = calculateAllRatios(current);
  const distressModels = runAllDistressModels(current, prior);
  const health = calculateHealthScore(current);
  const survival = estimateSurvival(current, dataQuality);
  const reconciliations = runAllReconciliations(current);
  const scenarios = generateStandardScenarios(current);
  const alerts = evaluateAlerts({ period: current, ratios, survival, health });
  const heatmap = buildAuditHeatmap({ ratios, health, survival, reconciliations, alerts });
  const magnitudes = [
    current.incomeStatement.revenue,
    current.incomeStatement.netIncome,
    current.balanceSheet.totalAssets,
    current.balanceSheet.totalLiabilities,
    current.balanceSheet.cash,
    current.cashFlow.operatingCashFlow,
    current.balanceSheet.accountsReceivable || 0,
    current.balanceSheet.inventory || 0,
    current.balanceSheet.accountsPayable || 0,
  ].filter((v) => typeof v === 'number');
  const forensic = runForensicScreens({
    magnitudes,
    netIncome: current.incomeStatement.netIncome,
    operatingCashFlow: current.cashFlow.operatingCashFlow,
  });
  const goingConcern = assessGoingConcern({ period: current, survival, health, ratios, dataQuality });

  return {
    period: current.label,
    fiscalYear: current.fiscalYear,
    ratios,
    distressModels,
    health,
    survival,
    reconciliations,
    scenarios,
    alerts,
    heatmap,
    forensic,
    goingConcern,
    dataQuality,
    analyzedAt: new Date().toISOString(),
    disclaimer:
      'This analysis is produced by an AI-assisted analytical system. It does not replace a licensed auditor, accountant, insolvency practitioner or other regulated professional. Survival and failure assessments are probabilistic estimates based on the data and assumptions provided. Anomalies require investigation and do not automatically indicate fraud or misconduct. Always obtain professional advice for regulated or material decisions.',
  };
}
