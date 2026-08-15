/**
 * @cintexa/document-processor
 * Document intelligence: classification, extraction, OCR interface, normalization
 */

export * from './classification';
export * from './extraction';
export * from './normalization';

import { classifyDocument } from './classification';
import { extractFromText, mapExtractedToPeriodData } from './extraction';
import { normalizeFields } from './normalization';
import type { DocumentType } from '@cintexa/shared';

export interface ProcessDocumentInput {
  filename: string;
  textContent?: string;
  mimeType?: string;
  documentId?: string;
}

export interface ProcessDocumentResult {
  classification: ReturnType<typeof classifyDocument>;
  extraction: ReturnType<typeof extractFromText>;
  normalization: ReturnType<typeof normalizeFields>;
  periodData: ReturnType<typeof mapExtractedToPeriodData>;
  dataQualityScore: number;
}

/**
 * End-to-end document processing pipeline (synchronous heuristic path).
 * Production path is async: OCR → classification → table extraction → LLM mapping → normalization.
 */
export function processDocument(input: ProcessDocumentInput): ProcessDocumentResult {
  const classification = classifyDocument(input.filename, input.textContent, input.mimeType);
  const extraction = extractFromText(
    input.textContent || '',
    classification.documentType,
    input.documentId,
    1
  );
  const normalization = normalizeFields(extraction.fields, extraction.reportingCurrency || 'USD');
  const periodData = mapExtractedToPeriodData(normalization.normalizedFields);

  // Simple data quality heuristic
  const fieldCount = extraction.fields.length;
  const dataQualityScore = Math.min(
    95,
    Math.round(
      classification.confidence * 40 +
        extraction.overallConfidence * 40 +
        Math.min(fieldCount * 3, 20)
    )
  );

  return {
    classification,
    extraction,
    normalization,
    periodData,
    dataQualityScore,
  };
}
