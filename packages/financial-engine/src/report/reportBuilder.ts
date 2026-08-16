/**
 * Professional report content builder.
 * Produces structured sections suitable for PDF/HTML/Markdown export.
 * Does not embed binary PDF generation here — callers can pipe to Puppeteer/PDFKit.
 */

import type { HealthScoreResult, SurvivalEstimate, RatioResult, DistressModelResult, ReconciliationResult } from '../types';
import type { ExecutiveVerdict } from './executiveSummary';

export interface ReportSection {
  id: string;
  title: string;
  body: string;
  tables?: Array<{ headers: string[]; rows: string[][] }>;
}

export interface FullReportInput {
  companyName: string;
  periodLabel: string;
  generatedAt?: string;
  dataQuality: number;
  health: HealthScoreResult;
  survival: SurvivalEstimate;
  ratios: RatioResult[];
  distressModels: DistressModelResult[];
  reconciliations: ReconciliationResult[];
  findings: Array<{ title: string; severity: string; finding: string; recommendation: string; agent?: string }>;
  recommendations: Array<{ problem: string; action: string; priority: string; owner: string }>;
  actionPlans: Array<{ title: string; tasks: Array<{ description: string; owner: string }> }>;
  verdict: ExecutiveVerdict;
  scenarios?: Array<{ name: string; runwayMonths: number; survivalProbability: number }>;
  disclaimer: string;
}

export function buildReportSections(input: FullReportInput): ReportSection[] {
  const sections: ReportSection[] = [];

  sections.push({
    id: 'executive-summary',
    title: '1. Executive Summary',
    body: [
      `Company: ${input.companyName}`,
      `Period: ${input.periodLabel}`,
      `Generated: ${input.generatedAt || new Date().toISOString()}`,
      `Data quality: ${input.dataQuality}%`,
      '',
      `VERDICT: ${input.verdict.currentCondition}`,
      `Financial Health: ${input.verdict.financialHealth}/100`,
      `Estimated Runway: ${input.verdict.estimatedRunwayMonths ?? 'N/A'} months`,
      `12-Month Survival Estimate: ${input.verdict.survival12m ?? 'N/A'}%`,
      `Failure Risk: ${input.verdict.failureRisk}`,
      `Confidence: ${input.verdict.confidence}%`,
      '',
      `Why: ${input.verdict.why}`,
      `What management should do: ${input.verdict.whatManagementShouldDo}`,
      '',
      'Top risks:',
      ...input.verdict.topRisks.map((r, i) => `  ${i + 1}. ${r}`),
      '',
      'Top recommendations:',
      ...input.verdict.topRecommendations.map((r, i) => `  ${i + 1}. ${r}`),
    ].join('\n'),
  });

  sections.push({
    id: 'health-score',
    title: '2. Financial Health Score',
    body: input.health.explanation,
    tables: [
      {
        headers: ['Dimension', 'Score'],
        rows: Object.entries(input.health.dimensions).map(([k, v]) => [k, String(Math.round(v as number))]),
      },
    ],
  });

  sections.push({
    id: 'ratios',
    title: '3. Ratio Analysis',
    body: 'Each ratio includes value, risk level and interpretation. Benchmarks should be refreshed with peer data when available.',
    tables: [
      {
        headers: ['Ratio', 'Value', 'Risk', 'Interpretation'],
        rows: input.ratios.map((r) => [
          r.name,
          r.value == null ? '—' : String(typeof r.value === 'number' ? r.value.toFixed(2) : r.value),
          r.riskLevel,
          r.interpretation,
        ]),
      },
    ],
  });

  sections.push({
    id: 'distress',
    title: '4. Distress Models',
    body: input.distressModels
      .map(
        (m) =>
          `${m.modelName}\nResult: ${m.result ?? 'N/A'} ${m.zone ? `(${m.zone})` : ''}\n${m.interpretation}\nLimitations: ${m.limitations}\n`
      )
      .join('\n'),
  });

  sections.push({
    id: 'survival',
    title: '5. Survival & Runway',
    body: [
      `Base runway: ${input.survival.runwayMonthsBase ?? 'N/A'} months`,
      `Optimistic: ${input.survival.runwayMonthsOptimistic ?? 'N/A'} | Pessimistic: ${input.survival.runwayMonthsPessimistic ?? 'N/A'} | Stress: ${input.survival.runwayMonthsStress ?? 'N/A'} | Recovery: ${input.survival.runwayMonthsRecovery ?? 'N/A'}`,
      `Survival 12m/24m/36m: ${input.survival.survivalProbability12m}% / ${input.survival.survivalProbability24m}% / ${input.survival.survivalProbability36m}%`,
      `Primary constraint: ${input.survival.primaryConstraint}`,
      `Methodology: ${input.survival.methodology}`,
      '',
      'Assumptions:',
      ...input.survival.assumptions.map((a) => `  - ${a}`),
    ].join('\n'),
  });

  if (input.scenarios?.length) {
    sections.push({
      id: 'scenarios',
      title: '6. Scenario Analysis',
      body: 'Scenario outcomes under modeled assumptions only.',
      tables: [
        {
          headers: ['Scenario', 'Runway (months)', 'Survival probability'],
          rows: input.scenarios.map((s) => [s.name, String(s.runwayMonths), String(s.survivalProbability)]),
        },
      ],
    });
  }

  sections.push({
    id: 'audit',
    title: '7. Audit Findings',
    body: input.findings
      .map(
        (f) =>
          `[${f.severity}] ${f.title}${f.agent ? ` (${f.agent})` : ''}\n${f.finding}\nRecommendation: ${f.recommendation}\n`
      )
      .join('\n'),
  });

  sections.push({
    id: 'reconciliation',
    title: '8. Accounting Consistency',
    body: input.reconciliations
      .map(
        (r) =>
          `${r.check}: ${r.isBalanced ? 'BALANCED' : 'EXCEPTION'} | variance ${r.variance}\n${r.requiredVerification}`
      )
      .join('\n\n'),
  });

  sections.push({
    id: 'recommendations',
    title: '9. Management Recommendations & Action Plans',
    body: [
      ...input.recommendations.map((r) => `[${r.priority}] ${r.problem}\nAction: ${r.action}\nOwner: ${r.owner}\n`),
      '',
      ...input.actionPlans.map(
        (p) =>
          `${p.title}\n` + p.tasks.map((t, i) => `  ${i + 1}. ${t.description} (${t.owner})`).join('\n')
      ),
    ].join('\n'),
  });

  sections.push({
    id: 'assumptions-limitations',
    title: '10. Assumptions, Limitations & Sources',
    body: [
      input.verdict.whatCouldChange,
      '',
      `Missing data: ${input.verdict.missingData.join('; ')}`,
      `Further audit: ${input.verdict.whatToAuditFurther}`,
      '',
      input.disclaimer,
    ].join('\n'),
  });

  return sections;
}

export function reportToMarkdown(input: FullReportInput): string {
  const sections = buildReportSections(input);
  const lines: string[] = [
    `# CINTEXA Nexus Finance — Financial Diagnostic Report`,
    `**${input.companyName}** · ${input.periodLabel}`,
    `Confidential — AI-assisted analytical report`,
    '',
  ];
  for (const s of sections) {
    lines.push(`## ${s.title}`, '', s.body, '');
    if (s.tables) {
      for (const table of s.tables) {
        lines.push('| ' + table.headers.join(' | ') + ' |');
        lines.push('| ' + table.headers.map(() => '---').join(' | ') + ' |');
        for (const row of table.rows) {
          lines.push('| ' + row.map((c) => c.replace(/\|/g, '/')).join(' | ') + ' |');
        }
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}
