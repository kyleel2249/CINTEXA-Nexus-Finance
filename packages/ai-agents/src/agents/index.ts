/**
 * Virtual Audit & Advisory Agent Panel
 * Each agent produces structured findings with evidence, severity, confidence.
 * Agents do not declare fraud; they recommend investigation.
 */

import type { AuditAgentType, RiskLevel, ActionPriority } from '@cintexa/shared';
import type { FinancialPeriodData, RatioResult, HealthScoreResult, SurvivalEstimate, DistressModelResult, ReconciliationResult } from '@cintexa/financial-engine';

export interface AgentFinding {
  agent: AuditAgentType;
  title: string;
  finding: string;
  evidence: string;
  severity: RiskLevel;
  financialImpact?: string;
  risk: string;
  recommendation: string;
  priority: ActionPriority;
  confidence: number;
}

export interface AgentContext {
  current: FinancialPeriodData;
  prior?: FinancialPeriodData;
  ratios: RatioResult[];
  health: HealthScoreResult;
  survival: SurvivalEstimate;
  distressModels: DistressModelResult[];
  reconciliations: ReconciliationResult[];
  dataQuality: number;
}

export type AgentRunner = (ctx: AgentContext) => AgentFinding[];

function finding(
  agent: AuditAgentType,
  title: string,
  findingText: string,
  evidence: string,
  severity: RiskLevel,
  recommendation: string,
  priority: ActionPriority,
  confidence: number,
  risk: string,
  financialImpact?: string
): AgentFinding {
  return { agent, title, finding: findingText, evidence, severity, recommendation, priority, confidence, risk, financialImpact };
}

export const leadAuditPartner: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const { health, survival, dataQuality } = ctx;
  findings.push(
    finding(
      'LEAD_AUDIT_PARTNER',
      'Overall Financial Condition',
      `Health classification: ${health.classification.replace(/_/g, ' ')} (${health.overallScore}/100). 12-month survival estimate ${survival.survivalProbability12m}% with ${survival.failureRisk} failure risk.`,
      `Health score dimensions and survival model outputs. Data quality ${dataQuality}%.`,
      survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE' ? 'CRITICAL' : health.overallScore < 45 ? 'HIGH' : health.overallScore < 60 ? 'MODERATE' : 'LOW',
      'Board and management should review the full diagnostic, prioritize liquidity and cash-flow actions if pressure is present, and obtain professional advice for material decisions.',
      survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE' ? 'IMMEDIATE' : 'DAYS_30',
      Math.min(90, dataQuality),
      'Misjudging overall condition may delay necessary interventions.'
    )
  );
  if (dataQuality < 60) {
    findings.push(
      finding(
        'LEAD_AUDIT_PARTNER',
        'Data Quality Limitation',
        `Data quality score ${dataQuality}% reduces confidence in quantitative conclusions.`,
        'Missing statements, low extraction confidence or incomplete periods.',
        'MODERATE',
        'Obtain complete audited statements, notes, cash-flow statement and debt schedule before relying on survival estimates.',
        'IMMEDIATE',
        85,
        'Decisions based on incomplete data may be unreliable.'
      )
    );
  }
  return findings;
};

export const financialStatementAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  for (const rec of ctx.reconciliations) {
    if (!rec.isBalanced) {
      findings.push(
        finding(
          'FINANCIAL_STATEMENT_AUDITOR',
          `Reconciliation Exception: ${rec.check}`,
          `Variance of ${rec.variance.toFixed(2)} detected.`,
          `Source ${rec.sourceValue} vs expected ${rec.expectedValue}. ${rec.possibleExplanations.join('; ')}`,
          Math.abs(rec.variance) > 10000 ? 'HIGH' : 'MODERATE',
          rec.requiredVerification,
          'IMMEDIATE',
          80,
          'Unresolved differences undermine the reliability of the financial profile.'
        )
      );
    }
  }
  return findings;
};

export const forensicAccountant: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const beneish = ctx.distressModels.find((m) => m.modelName.includes('Beneish'));
  if (beneish && beneish.result !== null && beneish.zone === 'HIGHER_MANIPULATION_PROBABILITY') {
    findings.push(
      finding(
        'FORENSIC_ACCOUNTANT',
        'Beneish M-Score Elevation',
        beneish.interpretation,
        `Model result ${beneish.result.toFixed(3)}. Inputs: ${JSON.stringify(beneish.inputs)}`,
        'HIGH',
        'Treat as a signal requiring investigation. Review revenue recognition, accruals, related-party transactions and year-end journals. Do not conclude fraud solely on this score.',
        'DAYS_30',
        70,
        'Elevated manipulation probability warrants deeper forensic review.',
        'Potential earnings quality concern'
      )
    );
  }
  const ni = ctx.current.incomeStatement.netIncome;
  const ocf = ctx.current.cashFlow.operatingCashFlow;
  if (ni > 0 && ocf < 0) {
    findings.push(
      finding(
        'FORENSIC_ACCOUNTANT',
        'Earnings vs Cash Flow Divergence',
        'Company reports positive net income while operating cash flow is negative.',
        `Net income ${ni}, Operating cash flow ${ocf}`,
        'HIGH',
        'Investigate working-capital movements, revenue cut-off, non-cash items and receivables quality. Requires investigation.',
        'DAYS_30',
        75,
        'Possible earnings quality or working-capital stress issue.'
      )
    );
  }
  return findings;
};

export const goingConcernSpecialist: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const { survival, current } = ctx;
  if (survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE' || (survival.runwayMonthsBase !== null && survival.runwayMonthsBase < 12)) {
    findings.push(
      finding(
        'GOING_CONCERN_SPECIALIST',
        'Going-Concern Risk Indicator',
        `Primary constraint: ${survival.primaryConstraint}. Estimated base-case runway ${survival.runwayMonthsBase} months. 12-month survival probability ${survival.survivalProbability12m}%.`,
        `Cash ${current.balanceSheet.cash}, OCF ${current.cashFlow.operatingCashFlow}, Equity ${current.balanceSheet.totalEquity}, Current ratio drivers.`,
        survival.failureRisk,
        'Assess liquidity forecasts, debt maturities, covenant compliance and management’s recovery plans. Consider formal going-concern evaluation by licensed professionals.',
        'IMMEDIATE',
        survival.confidence,
        'Material uncertainty over ability to continue as a going concern may exist under modeled assumptions.'
      )
    );
  }
  if (current.balanceSheet.totalEquity <= 0) {
    findings.push(
      finding(
        'GOING_CONCERN_SPECIALIST',
        'Negative Equity',
        'Total equity is zero or negative.',
        `Total equity: ${current.balanceSheet.totalEquity}`,
        'CRITICAL',
        'Capital structure repair, restructuring or insolvency advice should be considered urgently.',
        'IMMEDIATE',
        95,
        'Technical insolvency risk on a balance-sheet basis.'
      )
    );
  }
  return findings;
};

export const cashAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const ocf = ctx.current.cashFlow.operatingCashFlow;
  const fin = ctx.current.cashFlow.financingCashFlow || 0;
  if (ocf < 0 && fin > 0) {
    findings.push(
      finding(
        'CASH_AUDITOR',
        'Operations Funded by Financing',
        'Negative operating cash flow is being offset by positive financing inflows.',
        `OCF ${ocf}, Financing CF ${fin}`,
        'HIGH',
        'Assess sustainability of external funding and prepare contingency plans if financing markets tighten.',
        'DAYS_30',
        80,
        'Refinancing dependency increases failure risk if capital markets close.'
      )
    );
  }
  return findings;
};

export const cfoAgent: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const { health, survival } = ctx;
  if (health.overallScore < 60) {
    findings.push(
      finding(
        'CFO_AGENT',
        'Immediate Financial Priorities',
        'Company is under financial pressure or worse. Cash and liquidity must be the primary focus.',
        `Health ${health.overallScore}, Runway ${survival.runwayMonthsBase} months`,
        health.overallScore < 45 ? 'HIGH' : 'MODERATE',
        'Implement 13-week cash flow forecast, accelerate receivables, defer non-critical capex, engage key lenders early, and prepare a board-level recovery plan.',
        'IMMEDIATE',
        85,
        'Delayed action reduces available options.'
      )
    );
  } else {
    findings.push(
      finding(
        'CFO_AGENT',
        'Capital Allocation Opportunity',
        'Financial position appears stable to healthy. Focus on resilience and value creation.',
        `Health ${health.overallScore}`,
        'LOW',
        'Stress-test liquidity, optimize debt cost, maintain covenant headroom, and evaluate growth or return-of-capital options within risk appetite.',
        'DAYS_90',
        80,
        'Complacency can erode resilience over time.'
      )
    );
  }
  return findings;
};

export const ALL_AGENTS: Array<{ name: AuditAgentType; run: AgentRunner }> = [
  { name: 'LEAD_AUDIT_PARTNER', run: leadAuditPartner },
  { name: 'FINANCIAL_STATEMENT_AUDITOR', run: financialStatementAuditor },
  { name: 'FORENSIC_ACCOUNTANT', run: forensicAccountant },
  { name: 'GOING_CONCERN_SPECIALIST', run: goingConcernSpecialist },
  { name: 'CASH_AUDITOR', run: cashAuditor },
  { name: 'CFO_AGENT', run: cfoAgent },
];

export function runAgentPanel(ctx: AgentContext): AgentFinding[] {
  const all: AgentFinding[] = [];
  for (const agent of ALL_AGENTS) {
    all.push(...agent.run(ctx));
  }
  return all;
}

export const revenueAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const rev = ctx.current.incomeStatement.revenue;
  const ar = ctx.current.balanceSheet.accountsReceivable || 0;
  if (rev > 0 && ar / rev > 0.35) {
    findings.push(
      finding(
        'REVENUE_AUDITOR',
        'Elevated Receivables Relative to Revenue',
        `Accounts receivable represent ${((ar / rev) * 100).toFixed(1)}% of annual revenue — elevated collection risk or recognition timing concern.`,
        `AR ${ar}, Revenue ${rev}`,
        'MODERATE',
        'Review aging, credit policy and revenue cut-off. Confirm collectability. Requires investigation if concentration or long overdue balances exist.',
        'DAYS_30',
        70,
        'Working-capital stress or revenue quality issue.'
      )
    );
  }
  return findings;
};

export const liabilityAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const st = ctx.current.balanceSheet.shortTermDebt || 0;
  const lt = ctx.current.balanceSheet.longTermDebt || 0;
  const total = st + lt;
  if (total > 0 && st / total > 0.6) {
    findings.push(
      finding(
        'LIABILITY_AUDITOR',
        'Debt Maturity Concentration (Short-term Heavy)',
        'A high proportion of total debt is classified as short-term, increasing refinancing and liquidity pressure.',
        `Short-term debt ${st}, Long-term ${lt}`,
        'HIGH',
        'Obtain full debt schedule with maturity dates and covenants. Plan refinancing well ahead of maturity walls.',
        'DAYS_30',
        75,
        'Refinancing risk if markets tighten or covenants tighten.'
      )
    );
  }
  return findings;
};

export const restructuringSpecialist: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  if (ctx.health.overallScore < 40 || ctx.survival.failureRisk === 'CRITICAL' || ctx.survival.failureRisk === 'SEVERE') {
    findings.push(
      finding(
        'RESTRUCTURING_SPECIALIST',
        'Turnaround Mode Indicated',
        'Financial condition warrants formal turnaround consideration: cost base, capital structure and possibly portfolio actions.',
        `Health ${ctx.health.overallScore}, Failure risk ${ctx.survival.failureRisk}, Runway ${ctx.survival.runwayMonthsBase}`,
        ctx.survival.failureRisk,
        'Prioritize: (1) cash conservation, (2) stakeholder map (lenders, landlords, key suppliers), (3) independent restructuring advisor if insolvency risk is material, (4) options analysis (amend & extend, equity, asset sales, administration alternatives where legally relevant).',
        'IMMEDIATE',
        80,
        'Delayed restructuring reduces optionality and recoveries.'
      )
    );
  }
  return findings;
};

// Register additional agents
ALL_AGENTS.push(
  { name: 'REVENUE_AUDITOR', run: revenueAuditor },
  { name: 'LIABILITY_AUDITOR', run: liabilityAuditor },
  { name: 'RESTRUCTURING_SPECIALIST', run: restructuringSpecialist }
);

export const expenseAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const is = ctx.current.incomeStatement;
  const opex = is.operatingExpenses ?? 0;
  const rev = is.revenue || 1;
  if (opex / rev > 0.45 && (is.ebit ?? 0) <= 0) {
    findings.push(
      finding(
        'EXPENSE_AUDITOR',
        'High Operating Expense Burden',
        `Operating expenses represent ${((opex / rev) * 100).toFixed(1)}% of revenue while operating profit is non-positive.`,
        `Opex ${opex}, Revenue ${rev}, EBIT ${is.ebit}`,
        'HIGH',
        'Perform zero-based review of controllable costs. Separate fixed vs variable. Identify non-core spend for immediate reduction.',
        'DAYS_30',
        75,
        'Structural cost base may be incompatible with current revenue.'
      )
    );
  }
  return findings;
};

export const assetAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const bs = ctx.current.balanceSheet;
  const intangibles = bs.intangibleAssets || 0;
  const assets = bs.totalAssets || 1;
  if (intangibles / assets > 0.35) {
    findings.push(
      finding(
        'ASSET_AUDITOR',
        'Elevated Intangible Asset Concentration',
        `Intangible assets are ${((intangibles / assets) * 100).toFixed(1)}% of total assets — impairment risk if cash flows deteriorate.`,
        `Intangibles ${intangibles}, Total assets ${assets}`,
        'MODERATE',
        'Review impairment indicators, useful lives and supporting cash-flow forecasts. Requires investigation if CGUs underperform.',
        'DAYS_90',
        70,
        'Aggressive intangible carrying values can mask underlying asset quality issues.'
      )
    );
  }
  const inv = bs.inventory || 0;
  if (inv > 0 && bs.totalCurrentAssets > 0 && inv / bs.totalCurrentAssets > 0.5) {
    findings.push(
      finding(
        'ASSET_AUDITOR',
        'Inventory-Heavy Current Assets',
        'Inventory forms a large share of current assets, reducing liquid coverage of short-term obligations.',
        `Inventory ${inv}, Current assets ${bs.totalCurrentAssets}`,
        'MODERATE',
        'Assess obsolescence, turnover and net realizable value. Align production/purchasing with demand.',
        'DAYS_30',
        70,
        'Inventory buildup can signal demand weakness or working-capital inefficiency.'
      )
    );
  }
  return findings;
};

export const taxRiskAuditor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const is = ctx.current.incomeStatement;
  if ((is.profitBeforeTax ?? 0) > 0 && (is.tax === 0 || is.tax === undefined)) {
    findings.push(
      finding(
        'TAX_RISK_AUDITOR',
        'Zero or Missing Tax Expense on Positive PBT',
        'Profit before tax is positive but tax expense is zero or not extracted — may indicate losses carried forward, extraction gap, or tax position requiring review.',
        `PBT ${is.profitBeforeTax}, Tax ${is.tax}`,
        'MODERATE',
        'Verify tax computation, deferred tax and any uncertain tax positions with tax advisors. Confirm extraction completeness.',
        'DAYS_90',
        60,
        'Tax positions can create contingent liabilities if challenged.'
      )
    );
  }
  return findings;
};

export const industryAnalyst: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  // Without external benchmarks we note the limitation rather than invent peers
  findings.push(
    finding(
      'INDUSTRY_ANALYST',
      'Industry Benchmark Context',
      'Peer and industry median comparisons require selected peer group or external research data. Internal ratios have been computed; external benchmarking is pending research inputs.',
      'No verified peer dataset attached to this run.',
      'LOW',
      'Select industry/peer set and refresh research to compare margins, leverage and growth against medians and quartiles.',
      'DAYS_90',
      50,
      'Absence of peer context limits relative performance assessment.'
    )
  );
  if (ctx.health.dimensions.profitability < 35) {
    findings.push(
      finding(
        'INDUSTRY_ANALYST',
        'Profitability Below Typical Healthy Levels',
        'Internal profitability dimensions score weakly. Industry-specific margin norms should be confirmed before concluding structural underperformance.',
        `Profitability dimension ${ctx.health.dimensions.profitability}`,
        'MODERATE',
        'Obtain sector margin benchmarks and assess whether cost structure or pricing power is the primary driver.',
        'DAYS_90',
        65,
        'Misreading industry norms can lead to incorrect strategic responses.'
      )
    );
  }
  return findings;
};

export const boardRiskAdvisor: AgentRunner = (ctx) => {
  const findings: AgentFinding[] = [];
  const critical = ctx.survival.failureRisk === 'CRITICAL' || ctx.survival.failureRisk === 'SEVERE';
  findings.push(
    finding(
      'BOARD_RISK_ADVISOR',
      critical ? 'Board-Level Decision Required' : 'Board Monitoring Recommended',
      critical
        ? 'Financial condition and survival indicators warrant formal board consideration of liquidity, going-concern disclosure and recovery options.'
        : `Health classification ${ctx.health.classification}. Board should monitor cash, covenants and trajectory on a scheduled cadence.`,
      `Health ${ctx.health.overallScore}, Survival 12m ${ctx.survival.survivalProbability12m}%, Failure risk ${ctx.survival.failureRisk}`,
      critical ? 'CRITICAL' : ctx.health.overallScore < 60 ? 'MODERATE' : 'LOW',
      critical
        ? 'Convene board (or committee) promptly. Review cash forecast, debt obligations, auditor communications and management recovery plan. Consider independent advice.'
        : 'Include financial health score, runway and top risks in board pack. Set threshold-based escalation triggers.',
      critical ? 'IMMEDIATE' : 'DAYS_90',
      85,
      critical ? 'Governance delay under distress increases stakeholder and personal exposure risk.' : 'Routine oversight reduces surprise risk.'
    )
  );
  return findings;
};

ALL_AGENTS.push(
  { name: 'EXPENSE_AUDITOR', run: expenseAuditor },
  { name: 'ASSET_AUDITOR', run: assetAuditor },
  { name: 'TAX_RISK_AUDITOR', run: taxRiskAuditor },
  { name: 'INDUSTRY_ANALYST', run: industryAnalyst },
  { name: 'BOARD_RISK_ADVISOR', run: boardRiskAdvisor }
);
