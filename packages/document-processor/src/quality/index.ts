/**
 * Data quality scoring for extracted financial profiles
 */

export interface DataQualityInput {
  hasIncomeStatement: boolean;
  hasBalanceSheet: boolean;
  hasCashFlow: boolean;
  hasAuditorReport: boolean;
  fieldCount: number;
  extractionConfidence: number;
  classificationConfidence: number;
  reconciliationBalanced: boolean;
  missingCriticalFields: string[];
  ocrAverageConfidence?: number;
}

export function scoreDataQuality(input: DataQualityInput): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  if (input.hasIncomeStatement) {
    score += 20;
    factors.push('Income statement present (+20)');
  } else factors.push('Missing income statement');
  if (input.hasBalanceSheet) {
    score += 20;
    factors.push('Balance sheet present (+20)');
  } else factors.push('Missing balance sheet');
  if (input.hasCashFlow) {
    score += 20;
    factors.push('Cash-flow statement present (+20)');
  } else factors.push('Missing cash-flow statement');
  if (input.hasAuditorReport) {
    score += 10;
    factors.push('Auditor report present (+10)');
  }

  score += Math.min(15, input.fieldCount * 0.8);
  score += input.extractionConfidence * 10;
  score += input.classificationConfidence * 5;

  if (input.reconciliationBalanced) {
    score += 5;
    factors.push('Reconciliations balanced (+5)');
  } else {
    score -= 10;
    factors.push('Reconciliation exceptions (-10)');
  }

  if (input.missingCriticalFields.length) {
    score -= Math.min(20, input.missingCriticalFields.length * 4);
    factors.push(`Missing critical fields: ${input.missingCriticalFields.join(', ')}`);
  }

  if (input.ocrAverageConfidence != null && input.ocrAverageConfidence < 0.7) {
    score -= 10;
    factors.push('Low OCR confidence (-10)');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  return { score, grade, factors };
}
