/**
 * Data Normalization
 * Maps extracted values into canonical FinancialPeriodData structures
 * and applies unit/currency consistency checks.
 */

import type { ExtractedField } from '../extraction';

export interface NormalizationResult {
  normalizedFields: ExtractedField[];
  unitWarnings: string[];
  currency: string;
  scaleFactor: number; // 1 = units, 1000 = thousands, 1_000_000 = millions
}

export function detectScale(rawValues: string[]): number {
  // Heuristic: if many values look like small integers and labels say "in thousands"
  return 1;
}

export function normalizeFields(fields: ExtractedField[], declaredCurrency = 'USD'): NormalizationResult {
  const unitWarnings: string[] = [];
  // Future: detect "R'000", "$m", etc. and scale
  return {
    normalizedFields: fields,
    unitWarnings,
    currency: declaredCurrency,
    scaleFactor: 1,
  };
}
