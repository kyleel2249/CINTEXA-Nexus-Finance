/**
 * @cintexa/ai-agents
 * Multi-agent audit, forensic, going-concern, CFO, recommendations and debate layer
 */

export * from './agents';
export * from './debate';
export * from './recommendations';

import { runAgentPanel, type AgentContext, type AgentFinding } from './agents';
import { detectConflicts, buildPanelConclusion } from './debate';
import { generateRecommendations, buildActionPlans } from './recommendations';
import { analyzePeriod, buildExecutiveVerdict } from '@cintexa/financial-engine';
import type { FinancialPeriodData } from '@cintexa/financial-engine';

export interface FullIntelligenceResult {
  analysis: ReturnType<typeof analyzePeriod>;
  findings: AgentFinding[];
  debates: ReturnType<typeof detectConflicts>;
  panelConclusion: ReturnType<typeof buildPanelConclusion>;
  recommendations: ReturnType<typeof generateRecommendations>;
  actionPlans: ReturnType<typeof buildActionPlans>;
  verdict: ReturnType<typeof buildExecutiveVerdict>;
}

export function runFullIntelligence(
  current: FinancialPeriodData,
  prior?: FinancialPeriodData,
  dataQuality = 75
): FullIntelligenceResult {
  const analysis = analyzePeriod(current, prior, dataQuality);
  const ctx: AgentContext = {
    current,
    prior,
    ratios: analysis.ratios,
    health: analysis.health,
    survival: analysis.survival,
    distressModels: analysis.distressModels,
    reconciliations: analysis.reconciliations,
    dataQuality,
  };
  const findings = runAgentPanel(ctx);
  const debates = detectConflicts(findings);
  const panelConclusion = buildPanelConclusion(findings, debates);
  const recommendations = generateRecommendations(analysis.health, analysis.survival, analysis.ratios, findings);
  const actionPlans = buildActionPlans(recommendations);
  const verdict = buildExecutiveVerdict({
    health: analysis.health,
    survival: analysis.survival,
    distressModels: analysis.distressModels,
    topFindingTitles: findings.map((f) => f.title),
    topRecActions: recommendations.map((r) => r.action),
    dataQuality,
    reconciliationFailures: analysis.reconciliations.filter((r) => !r.isBalanced).length,
  });
  return { analysis, findings, debates, panelConclusion, recommendations, actionPlans, verdict };
}
