/**
 * Analysis Service
 * Orchestrates document processing → financial engine → multi-agent intelligence.
 */

import { processDocument } from '@cintexa/document-processor';
import { runFullIntelligence } from '@cintexa/ai-agents';
import type { FinancialPeriodData } from '@cintexa/financial-engine';
import { DISCLAIMER_FULL } from '@cintexa/shared';

export interface AnalyzeTextInput {
  filename: string;
  textContent: string;
  companyName?: string;
  fiscalYear?: number;
  priorPeriod?: FinancialPeriodData;
}

export function analyzeUploadedText(input: AnalyzeTextInput) {
  const processed = processDocument({
    filename: input.filename,
    textContent: input.textContent,
  });

  const period: FinancialPeriodData = {
    label: processed.classification.reportingPeriod || `FY${input.fiscalYear || new Date().getFullYear()}`,
    fiscalYear: processed.classification.fiscalYear || input.fiscalYear || new Date().getFullYear(),
    incomeStatement: processed.periodData.incomeStatement,
    balanceSheet: processed.periodData.balanceSheet,
    cashFlow: processed.periodData.cashFlow,
  };

  // Guard: if extraction yielded almost nothing, return low-confidence result
  const hasMinimumData =
    period.incomeStatement.revenue > 0 ||
    period.balanceSheet.totalAssets > 0 ||
    period.cashFlow.operatingCashFlow !== 0;

  if (!hasMinimumData) {
    return {
      status: 'INSUFFICIENT_DATA' as const,
      message: 'Insufficient financial data extracted. Please upload clearer statements or correct extracted values.',
      classification: processed.classification,
      dataQualityScore: processed.dataQualityScore,
      disclaimer: DISCLAIMER_FULL,
    };
  }

  const intelligence = runFullIntelligence(period, input.priorPeriod, processed.dataQualityScore);

  return {
    status: 'OK' as const,
    companyName: input.companyName || processed.extraction.companyName,
    classification: processed.classification,
    dataQualityScore: processed.dataQualityScore,
    extractionWarnings: processed.extraction.warnings,
    intelligence,
    disclaimer: DISCLAIMER_FULL,
  };
}

/** Direct analysis when structured period data is already available (manual entry or prior extraction). */
export function analyzeStructuredPeriod(
  current: FinancialPeriodData,
  prior?: FinancialPeriodData,
  dataQuality = 80
) {
  const intelligence = runFullIntelligence(current, prior, dataQuality);
  return {
    status: 'OK' as const,
    dataQualityScore: dataQuality,
    intelligence,
    disclaimer: DISCLAIMER_FULL,
  };
}
