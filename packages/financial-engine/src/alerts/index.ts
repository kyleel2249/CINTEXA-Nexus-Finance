/**
 * Failure / threshold early-warning alerts
 */

import type { FinancialPeriodData, RatioResult, SurvivalEstimate, HealthScoreResult } from '../types';

export type AlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';

export interface FinancialAlert {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  metric?: string;
  value?: number | string | null;
  threshold?: string;
}

function aid(type: string) {
  return `alert_${type}_${Date.now().toString(36)}`;
}

export function evaluateAlerts(input: {
  period: FinancialPeriodData;
  ratios: RatioResult[];
  survival: SurvivalEstimate;
  health: HealthScoreResult;
}): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const { period, ratios, survival, health } = input;

  const current = ratios.find((r) => r.name === 'Current Ratio');
  if (current?.value != null && current.value < 1) {
    alerts.push({
      id: aid('current_ratio'),
      type: 'LIQUIDITY_THRESHOLD',
      message: 'Current ratio fell below 1.0 — current liabilities exceed current assets.',
      severity: current.value < 0.8 ? 'CRITICAL' : 'HIGH',
      metric: 'Current Ratio',
      value: current.value,
      threshold: '< 1.0',
    });
  }

  if (period.cashFlow.operatingCashFlow < 0) {
    alerts.push({
      id: aid('neg_ocf'),
      type: 'NEGATIVE_OPERATING_CASH_FLOW',
      message: 'Operating cash flow is negative for the period.',
      severity: period.incomeStatement.netIncome > 0 ? 'HIGH' : 'SEVERE',
      metric: 'Operating Cash Flow',
      value: period.cashFlow.operatingCashFlow,
    });
  }

  if (period.balanceSheet.totalEquity <= 0) {
    alerts.push({
      id: aid('neg_equity'),
      type: 'NEGATIVE_EQUITY',
      message: 'Total equity is zero or negative.',
      severity: 'CRITICAL',
      metric: 'Total Equity',
      value: period.balanceSheet.totalEquity,
    });
  }

  if (survival.runwayMonthsBase != null && survival.runwayMonthsBase < 12) {
    alerts.push({
      id: aid('runway'),
      type: 'SHORT_RUNWAY',
      message: `Estimated base-case runway has fallen below 12 months (${survival.runwayMonthsBase} months).`,
      severity: survival.runwayMonthsBase < 6 ? 'CRITICAL' : 'SEVERE',
      metric: 'Runway Months',
      value: survival.runwayMonthsBase,
      threshold: '< 12 months',
    });
  }

  const interest = ratios.find((r) => r.name === 'Interest Coverage Ratio');
  if (interest?.value != null && interest.value < 1.5) {
    alerts.push({
      id: aid('interest'),
      type: 'INTEREST_COVERAGE',
      message: 'Interest coverage deteriorated below 1.5x.',
      severity: interest.value < 1 ? 'CRITICAL' : 'HIGH',
      metric: 'Interest Coverage',
      value: interest.value,
      threshold: '< 1.5',
    });
  }

  if (health.overallScore < 45) {
    alerts.push({
      id: aid('health'),
      type: 'HEALTH_SCORE',
      message: `Financial health score is in distressed/critical territory (${health.overallScore}/100).`,
      severity: health.overallScore < 30 ? 'CRITICAL' : 'SEVERE',
      metric: 'Health Score',
      value: health.overallScore,
      threshold: '< 45',
    });
  }

  const de = ratios.find((r) => r.name === 'Debt-to-Equity');
  if (de?.value != null && de.value > 3) {
    alerts.push({
      id: aid('leverage'),
      type: 'DEBT_LEVERAGE',
      message: 'Debt-to-equity exceeded elevated threshold (3.0).',
      severity: de.value > 5 ? 'SEVERE' : 'HIGH',
      metric: 'Debt-to-Equity',
      value: de.value,
      threshold: '> 3.0',
    });
  }

  return alerts;
}
