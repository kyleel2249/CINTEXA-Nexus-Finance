/**
 * Recommendation & Action Plan Engine
 * Prioritized, time-boxed actions with owners, metrics and expected impact.
 */

import type { ActionPriority, RiskLevel } from '@cintexa/shared';
import type { HealthScoreResult, SurvivalEstimate, RatioResult } from '@cintexa/financial-engine';
import type { AgentFinding } from '../agents';

export interface Recommendation {
  id: string;
  problem: string;
  action: string;
  owner: string;
  costEstimate: string;
  expectedBenefit: string;
  expectedFinancialImpact: string;
  deadline: ActionPriority;
  priority: ActionPriority;
  dependencies: string;
  successMetric: string;
  severity: RiskLevel;
}

export interface ActionPlan {
  timeframe: 'IMMEDIATE' | '30_DAY' | '60_DAY' | '90_DAY' | '6_MONTH' | '12_MONTH';
  title: string;
  tasks: Array<{ step: number; description: string; owner: string }>;
  kpis: string[];
}

function id() {
  return `rec_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateRecommendations(
  health: HealthScoreResult,
  survival: SurvivalEstimate,
  ratios: RatioResult[],
  findings: AgentFinding[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE' || (survival.runwayMonthsBase !== null && survival.runwayMonthsBase < 9)) {
    recs.push({
      id: id(),
      problem: 'Short cash runway / elevated failure risk',
      action: 'Establish a rolling 13-week cash-flow forecast and daily cash position monitoring. Identify all discretionary outflows that can be deferred within 7 days.',
      owner: 'CFO / Treasury',
      costEstimate: 'Low (internal)',
      expectedBenefit: 'Visibility and control over liquidity',
      expectedFinancialImpact: 'Extends decision time; reduces surprise liquidity events',
      deadline: 'IMMEDIATE',
      priority: 'IMMEDIATE',
      dependencies: 'Access to bank balances and AP/AR aging',
      successMetric: '13-week forecast live within 5 business days; daily cash report to CEO',
      severity: survival.failureRisk,
    });
  }

  const currentRatio = ratios.find((r) => r.name === 'Current Ratio');
  if (currentRatio && currentRatio.value !== null && currentRatio.value < 1.2) {
    recs.push({
      id: id(),
      problem: 'Weak short-term liquidity (current ratio below comfort threshold)',
      action: 'Accelerate receivables collection (segment overdue accounts, assign owners, offer settlement discounts selectively). Negotiate extended payment terms with non-critical suppliers.',
      owner: 'CFO / Credit Controller',
      costEstimate: 'Low–Medium',
      expectedBenefit: 'Improved working capital and cash conversion',
      expectedFinancialImpact: 'Potential release of 5–15% of receivables into cash within 30–60 days',
      deadline: 'DAYS_30',
      priority: 'DAYS_30',
      dependencies: 'AR aging, customer contact data',
      successMetric: 'DSO reduction of ≥10 days; current ratio trend improving',
      severity: currentRatio.riskLevel,
    });
  }

  if (health.dimensions.cashFlowStrength < 40 || survival.primaryConstraint.toLowerCase().includes('cash')) {
    recs.push({
      id: id(),
      problem: 'Weak or negative operating cash generation',
      action: 'Launch a rapid cost-reduction sprint: freeze non-essential hiring and discretionary spend; review product/customer profitability; cut or renegotiate lowest-ROI activities.',
      owner: 'CEO / CFO',
      costEstimate: 'Low (internal management time)',
      expectedBenefit: 'Reduced cash burn',
      expectedFinancialImpact: 'Target 10–20% reduction in controllable opex within 60 days',
      deadline: 'DAYS_30',
      priority: 'DAYS_30',
      dependencies: 'Detailed P&L by product/customer',
      successMetric: 'Monthly cash burn reduced; OCF trajectory improved',
      severity: 'HIGH',
    });
  }

  if (health.dimensions.solvency < 40 || (ratios.find((r) => r.name === 'Debt-to-Equity')?.value ?? 0) > 2.5) {
    recs.push({
      id: id(),
      problem: 'Elevated leverage / solvency pressure',
      action: 'Engage key lenders proactively. Prepare covenant compliance forecast. Explore amendment, waiver or restructuring options before a breach occurs.',
      owner: 'CFO / Board',
      costEstimate: 'Medium (legal/advisory)',
      expectedBenefit: 'Preserves financing relationships and avoids default acceleration',
      expectedFinancialImpact: 'Avoids potential cross-default and refinancing shock',
      deadline: 'DAYS_30',
      priority: 'DAYS_30',
      dependencies: 'Debt schedule, facility agreements, covenant calculations',
      successMetric: 'Lender engagement completed; covenant headroom plan documented',
      severity: 'HIGH',
    });
  }

  if (health.overallScore >= 75) {
    recs.push({
      id: id(),
      problem: 'Opportunity to strengthen long-term resilience while healthy',
      action: 'Run formal stress tests (revenue −20%, rate +200bps). Build liquidity buffer target (e.g. 6–12 months fixed costs). Review capital allocation and debt cost optimization.',
      owner: 'CFO',
      costEstimate: 'Low',
      expectedBenefit: 'Higher resilience to shocks',
      expectedFinancialImpact: 'Reduced probability of future distress under adverse scenarios',
      deadline: 'DAYS_90',
      priority: 'DAYS_90',
      dependencies: 'Scenario model access',
      successMetric: 'Stress-test report to board; liquidity policy approved',
      severity: 'LOW',
    });
  }

  for (const f of findings.filter((x) => x.severity === 'CRITICAL' || x.severity === 'SEVERE' || x.severity === 'HIGH')) {
    if (recs.some((r) => r.problem.includes(f.title.slice(0, 20)))) continue;
    recs.push({
      id: id(),
      problem: f.title,
      action: f.recommendation,
      owner: f.agent.includes('CFO') ? 'CFO' : f.agent.includes('BOARD') ? 'Board' : 'Management',
      costEstimate: 'TBD',
      expectedBenefit: 'Mitigation of identified risk',
      expectedFinancialImpact: f.financialImpact || 'See finding',
      deadline: f.priority,
      priority: f.priority,
      dependencies: 'Evidence review',
      successMetric: 'Finding closed or risk accepted with documented rationale',
      severity: f.severity,
    });
  }

  return recs;
}

export function buildActionPlans(recs: Recommendation[]): ActionPlan[] {
  const byPriority = (p: ActionPriority) => recs.filter((r) => r.priority === p || r.deadline === p);
  const plans: ActionPlan[] = [];

  const immediate = byPriority('IMMEDIATE');
  if (immediate.length) {
    plans.push({
      timeframe: 'IMMEDIATE',
      title: 'Emergency Actions (Next 7 Days)',
      tasks: immediate.map((r, i) => ({ step: i + 1, description: r.action, owner: r.owner })),
      kpis: immediate.map((r) => r.successMetric),
    });
  }

  const d30 = byPriority('DAYS_30');
  if (d30.length) {
    plans.push({
      timeframe: '30_DAY',
      title: '30-Day Stabilization Plan',
      tasks: d30.map((r, i) => ({ step: i + 1, description: r.action, owner: r.owner })),
      kpis: d30.map((r) => r.successMetric),
    });
  }

  const d90 = byPriority('DAYS_90');
  if (d90.length) {
    plans.push({
      timeframe: '90_DAY',
      title: '90-Day Recovery / Resilience Plan',
      tasks: d90.map((r, i) => ({ step: i + 1, description: r.action, owner: r.owner })),
      kpis: d90.map((r) => r.successMetric),
    });
  }

  plans.push({
    timeframe: '12_MONTH',
    title: '12-Month Strategic Financial Plan',
    tasks: [
      { step: 1, description: 'Quarterly refresh of financial health score and survival model', owner: 'CFO' },
      { step: 2, description: 'Maintain or improve data quality (complete statements, notes, debt schedules)', owner: 'Finance team' },
      { step: 3, description: 'Board review of risk heatmap and covenant compliance', owner: 'Board / Audit Committee' },
    ],
    kpis: ['Health score trend', 'Runway months', 'Covenant headroom', 'OCF margin'],
  });

  return plans;
}
