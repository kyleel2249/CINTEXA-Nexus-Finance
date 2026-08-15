/**
 * Document Classification Engine
 * Identifies document type from filename, content heuristics and structure.
 */

import type { DocumentType } from '@cintexa/shared';

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  signals: string[];
  fiscalYear?: number;
  reportingPeriod?: string;
}

const FILENAME_PATTERNS: Array<{ pattern: RegExp; type: DocumentType; weight: number }> = [
  { pattern: /annual.?report|integrated.?report|10-?k|20-?f/i, type: 'ANNUAL_REPORT', weight: 0.9 },
  { pattern: /balance.?sheet|statement.?of.?financial.?position|sof?p/i, type: 'BALANCE_SHEET', weight: 0.95 },
  { pattern: /income.?statement|profit.?or.?loss|p&?l|statement.?of.?comprehensive.?income|soci/i, type: 'INCOME_STATEMENT', weight: 0.95 },
  { pattern: /cash.?flow|statement.?of.?cash.?flows/i, type: 'CASH_FLOW_STATEMENT', weight: 0.95 },
  { pattern: /changes.?in.?equity|statement.?of.?changes/i, type: 'STATEMENT_OF_CHANGES_IN_EQUITY', weight: 0.9 },
  { pattern: /notes?.?to.?(the.?)?financial|accounting.?policies/i, type: 'NOTES_TO_FINANCIAL_STATEMENTS', weight: 0.85 },
  { pattern: /audit(or)?s?.?report|independent.?auditor|audit.?opinion/i, type: 'AUDITOR_REPORT', weight: 0.95 },
  { pattern: /bank.?statement|account.?statement/i, type: 'BANK_STATEMENT', weight: 0.9 },
  { pattern: /tax.?return|tax.?computation|vat.?return/i, type: 'TAX_DOCUMENT', weight: 0.85 },
  { pattern: /trial.?balance/i, type: 'TRIAL_BALANCE', weight: 0.95 },
  { pattern: /general.?ledger|g\/?l/i, type: 'GENERAL_LEDGER', weight: 0.9 },
  { pattern: /accounts.?receivable|a\/?r.?aging|debtors/i, type: 'ACCOUNTS_RECEIVABLE', weight: 0.9 },
  { pattern: /accounts.?payable|a\/?p.?aging|creditors/i, type: 'ACCOUNTS_PAYABLE', weight: 0.9 },
  { pattern: /payroll|salary.?summary/i, type: 'PAYROLL_SUMMARY', weight: 0.85 },
  { pattern: /management.?accounts|mgmt.?accounts/i, type: 'MANAGEMENT_ACCOUNTS', weight: 0.85 },
  { pattern: /budget/i, type: 'BUDGET', weight: 0.8 },
  { pattern: /forecast|projection/i, type: 'FORECAST', weight: 0.8 },
  { pattern: /debt.?schedule|loan.?schedule|borrowings/i, type: 'DEBT_SCHEDULE', weight: 0.9 },
  { pattern: /loan.?agreement|facility.?agreement/i, type: 'LOAN_AGREEMENT', weight: 0.85 },
  { pattern: /investor.?report|shareholder.?update/i, type: 'INVESTOR_REPORT', weight: 0.8 },
  { pattern: /board.?report|board.?pack/i, type: 'BOARD_REPORT', weight: 0.8 },
];

const CONTENT_KEYWORDS: Array<{ keywords: string[]; type: DocumentType; weight: number }> = [
  { keywords: ['statement of financial position', 'non-current assets', 'total equity'], type: 'BALANCE_SHEET', weight: 0.7 },
  { keywords: ['revenue', 'cost of sales', 'gross profit', 'profit for the year'], type: 'INCOME_STATEMENT', weight: 0.7 },
  { keywords: ['cash flows from operating activities', 'net increase in cash'], type: 'CASH_FLOW_STATEMENT', weight: 0.75 },
  { keywords: ['we have audited', 'in our opinion', 'key audit matters'], type: 'AUDITOR_REPORT', weight: 0.8 },
  { keywords: ['going concern', 'material uncertainty'], type: 'AUDITOR_REPORT', weight: 0.5 },
];

export function classifyDocument(
  filename: string,
  textSample?: string,
  mimeType?: string
): ClassificationResult {
  const scores: Partial<Record<DocumentType, number>> = {};
  const signals: string[] = [];

  for (const { pattern, type, weight } of FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      scores[type] = (scores[type] || 0) + weight;
      signals.push(`Filename matched ${type}`);
    }
  }

  if (textSample) {
    const lower = textSample.toLowerCase().slice(0, 8000);
    for (const { keywords, type, weight } of CONTENT_KEYWORDS) {
      const hits = keywords.filter((k) => lower.includes(k.toLowerCase())).length;
      if (hits > 0) {
        const contrib = weight * (hits / keywords.length);
        scores[type] = (scores[type] || 0) + contrib;
        signals.push(`Content keywords for ${type} (${hits}/${keywords.length})`);
      }
    }
  }

  if (mimeType?.includes('spreadsheet') || filename.match(/\.xlsx?$/i)) {
    signals.push('Spreadsheet format — likely financial tables');
  }

  // Extract fiscal year heuristic
  const yearMatch = filename.match(/(20\d{2}|FY\s*20\d{2}|FY20\d{2})/i);
  let fiscalYear: number | undefined;
  if (yearMatch) {
    const y = yearMatch[0].replace(/\D/g, '');
    fiscalYear = parseInt(y.length === 4 ? y : `20${y.slice(-2)}`, 10);
    signals.push(`Detected fiscal year ${fiscalYear}`);
  }

  const entries = Object.entries(scores) as [DocumentType, number][];
  if (entries.length === 0) {
    return { documentType: 'OTHER', confidence: 0.3, signals: ['No strong classification signals'], fiscalYear };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = entries[0];
  const confidence = Math.min(0.98, bestScore);

  return {
    documentType: bestType,
    confidence,
    signals,
    fiscalYear,
    reportingPeriod: fiscalYear ? `FY${fiscalYear}` : undefined,
  };
}
