/**
 * Investor / Lender / Board perspective lenses
 */

export type Perspective = 'INVESTOR' | 'LENDER' | 'BOARD' | 'CFO' | 'AUDITOR';

export interface PerspectiveBrief {
  perspective: Perspective;
  focusAreas: string[];
  headline: string;
  keyMetrics: Array<{ label: string; value: string; note?: string }>;
  risks: string[];
  actions: string[];
}

export function buildPerspective(perspective: Perspective, intel: {
  analysis: any;
  findings: any[];
  recommendations: any[];
  panelConclusion: any;
  workpapers: any[];
  verdict: any;
}): PerspectiveBrief {
  const h = intel.analysis.health;
  const s = intel.analysis.survival;
  const ratios = intel.analysis.ratios;
  const get = (name: string) => ratios.find((r) => r.name === name);

  if (perspective === 'LENDER') {
    const interest = get('Interest Coverage Ratio');
    const de = get('Debt-to-Equity');
    const cr = get('Current Ratio');
    return {
      perspective,
      focusAreas: ['Debt service', 'Liquidity', 'Leverage', 'Covenant risk', 'Cash flow'],
      headline: `Repayment capacity appears ${s.failureRisk === 'LOW' || s.failureRisk === 'MODERATE' ? 'manageable under base assumptions' : 'under pressure — elevated credit risk'}.`,
      keyMetrics: [
        { label: 'Interest coverage', value: interest?.value != null ? interest.value.toFixed(2) : 'N/A', note: interest?.riskLevel },
        { label: 'Debt / Equity', value: de?.value != null ? de.value.toFixed(2) : 'N/A', note: de?.riskLevel },
        { label: 'Current ratio', value: cr?.value != null ? cr.value.toFixed(2) : 'N/A' },
        { label: 'Runway', value: s.runwayMonthsBase != null ? `${s.runwayMonthsBase} months` : 'N/A' },
      ],
      risks: intel.findings.filter((f) => ['HIGH', 'SEVERE', 'CRITICAL'].includes(f.severity)).map((f) => f.title).slice(0, 5),
      actions: intel.recommendations.slice(0, 5).map((r) => r.action),
    };
  }

  if (perspective === 'INVESTOR') {
    const roe = get('Return on Equity (ROE)');
    const nm = get('Net Profit Margin');
    return {
      perspective,
      focusAreas: ['Growth', 'Profitability', 'Cash generation', 'Capital efficiency', 'Downside risk'],
      headline: `Health ${h.overallScore}/100 (${h.classification.replace(/_/g, ' ')}). Survival 12m ${s.survivalProbability12m}%.`,
      keyMetrics: [
        { label: 'Health score', value: `${h.overallScore}/100` },
        { label: 'Net margin', value: nm?.value != null ? `${Number(nm.value).toFixed(1)}%` : 'N/A' },
        { label: 'ROE', value: roe?.value != null ? `${Number(roe.value).toFixed(1)}%` : 'N/A' },
        { label: '12m survival', value: `${s.survivalProbability12m}%` },
        { label: 'Failure risk', value: s.failureRisk },
      ],
      risks: intel.findings.slice(0, 5).map((f) => f.title),
      actions: intel.recommendations.slice(0, 5).map((r) => r.action),
    };
  }

  if (perspective === 'AUDITOR') {
    return {
      perspective,
      focusAreas: ['Assertions', 'Exceptions', 'Going concern', 'Evidence', 'Reconciliations'],
      headline: intel.panelConclusion.summary,
      keyMetrics: [
        { label: 'Findings', value: String(intel.findings.length) },
        { label: 'Critical/Severe', value: String(intel.panelConclusion.criticalOrSevere) },
        { label: 'Workpapers', value: String(intel.workpapers.length) },
        { label: 'Reconciliation exceptions', value: String(intel.analysis.reconciliations.filter((r) => !r.isBalanced).length) },
      ],
      risks: intel.workpapers.filter((w) => w.status === 'FAIL' || w.status === 'EXCEPTION').map((w) => w.assertion).slice(0, 5),
      actions: intel.findings.filter((f) => f.priority === 'IMMEDIATE').map((f) => f.recommendation).slice(0, 5),
    };
  }

  return {
    perspective,
    focusAreas: ['Condition', 'Liquidity', 'Going concern', 'Decisions', 'Timeline'],
    headline: intel.verdict.why,
    keyMetrics: [
      { label: 'Condition', value: intel.verdict.currentCondition },
      { label: 'Health', value: `${intel.verdict.financialHealth}/100` },
      { label: 'Runway', value: intel.verdict.estimatedRunwayMonths != null ? `${intel.verdict.estimatedRunwayMonths} mo` : 'N/A' },
      { label: 'Failure risk', value: intel.verdict.failureRisk },
    ],
    risks: intel.verdict.topRisks,
    actions: [intel.verdict.whatManagementShouldDo, ...intel.recommendations.slice(0, 3).map((r) => r.action)],
  };
}
