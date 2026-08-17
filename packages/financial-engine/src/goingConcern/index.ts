/**
 * Structured going-concern assessment (analytical — not an audit opinion)
 */

import type { FinancialPeriodData, SurvivalEstimate, HealthScoreResult, RatioResult } from '../types';

export interface GoingConcernAssessment {
  indicator: 'NO_MATERIAL_UNCERTAINTY_INDICATED' | 'MATERIAL_UNCERTAINTY_INDICATORS_PRESENT' | 'SIGNIFICANT_GOING_CONCERN_RISK' | 'INSUFFICIENT_DATA';
  summary: string;
  factors: Array<{ factor: string; adverse: boolean; detail: string }>;
  recommendedDisclosures: string[];
  professionalNote: string;
  confidence: number;
}

export function assessGoingConcern(input: {
  period: FinancialPeriodData;
  survival: SurvivalEstimate;
  health: HealthScoreResult;
  ratios: RatioResult[];
  dataQuality: number;
}): GoingConcernAssessment {
  const { period, survival, health, dataQuality } = input;
  const factors: GoingConcernAssessment['factors'] = [];

  if (dataQuality < 50) {
    return {
      indicator: 'INSUFFICIENT_DATA',
      summary: 'Data quality is too low for a reliable going-concern indicator set.',
      factors: [{ factor: 'Data quality', adverse: true, detail: `Score ${dataQuality}%` }],
      recommendedDisclosures: ['Obtain complete statements, notes, debt schedule and cash forecast before formal assessment.'],
      professionalNote:
        'This is an AI-assisted analytical screen, not a substitute for auditor or insolvency practitioner judgment.',
      confidence: dataQuality,
    };
  }

  if (period.balanceSheet.totalEquity <= 0) {
    factors.push({ factor: 'Negative equity', adverse: true, detail: `Equity ${period.balanceSheet.totalEquity}` });
  }
  if (period.cashFlow.operatingCashFlow < 0) {
    factors.push({ factor: 'Negative operating cash flow', adverse: true, detail: `OCF ${period.cashFlow.operatingCashFlow}` });
  }
  if (period.incomeStatement.netIncome < 0) {
    factors.push({ factor: 'Net losses', adverse: true, detail: `NI ${period.incomeStatement.netIncome}` });
  }
  const cr = input.ratios.find((r) => r.name === 'Current Ratio');
  if (cr?.value != null && cr.value < 1) {
    factors.push({ factor: 'Current ratio below 1', adverse: true, detail: `Current ratio ${cr.value.toFixed(2)}` });
  }
  if (survival.runwayMonthsBase != null && survival.runwayMonthsBase < 12) {
    factors.push({ factor: 'Short cash runway', adverse: true, detail: `${survival.runwayMonthsBase} months base case` });
  }
  if (survival.failureRisk === 'CRITICAL' || survival.failureRisk === 'SEVERE') {
    factors.push({ factor: 'Elevated failure risk classification', adverse: true, detail: survival.failureRisk });
  }
  if (health.overallScore >= 75 && factors.every((f) => !f.adverse)) {
    factors.push({ factor: 'Health score supportive', adverse: false, detail: `${health.overallScore}/100` });
  }

  const adverseCount = factors.filter((f) => f.adverse).length;
  let indicator: GoingConcernAssessment['indicator'] = 'NO_MATERIAL_UNCERTAINTY_INDICATED';
  if (adverseCount >= 3 || survival.failureRisk === 'CRITICAL') {
    indicator = 'SIGNIFICANT_GOING_CONCERN_RISK';
  } else if (adverseCount >= 1) {
    indicator = 'MATERIAL_UNCERTAINTY_INDICATORS_PRESENT';
  }

  const summary =
    indicator === 'SIGNIFICANT_GOING_CONCERN_RISK'
      ? 'Multiple adverse indicators suggest significant going-concern risk under modeled assumptions. Professional evaluation is recommended.'
      : indicator === 'MATERIAL_UNCERTAINTY_INDICATORS_PRESENT'
        ? 'One or more adverse indicators are present that may give rise to material uncertainty. Management and auditors should evaluate forecasts and mitigating actions.'
        : 'No material going-concern uncertainty is indicated from the available quantitative screens alone.';

  return {
    indicator,
    summary,
    factors,
    recommendedDisclosures:
      adverseCount > 0
        ? [
            'Liquidity forecasts and debt maturity profile',
            'Management mitigation plans and feasibility',
            'Covenant compliance and refinancing status',
            'Consider formal auditor going-concern procedures',
          ]
        : ['Continue standard monitoring of liquidity and performance'],
    professionalNote:
      'This assessment is analytical and probabilistic. It does not constitute an audit opinion, solvency certificate, or regulated going-concern conclusion.',
    confidence: Math.min(90, Math.max(40, dataQuality - adverseCount * 3)),
  };
}
