/**
 * Financial Data Extraction Engine
 * Extracts structured line items from classified documents.
 * Every value retains provenance (document → page → table → cell).
 *
 * Production implementation integrates OCR (Tesseract/Cloud Vision),
 * table detection (e.g. Camelot/Tabula/Azure Form Recognizer) and LLM-assisted mapping.
 * This module provides the interface, heuristics and normalization contract.
 */

import type { DocumentType } from '@cintexa/shared';
import type { ProvenanceRef } from '@cintexa/shared';

export interface ExtractedField {
  fieldName: string;
  fieldPath: string;
  value: number | null;
  rawValue: string;
  currency?: string;
  confidence: number;
  provenance: ProvenanceRef;
}

export interface ExtractionResult {
  documentType: DocumentType;
  fields: ExtractedField[];
  companyName?: string;
  reportingCurrency?: string;
  fiscalYear?: number;
  reportingPeriod?: string;
  accountingStandard?: string;
  auditor?: string;
  auditorOpinion?: string;
  overallConfidence: number;
  warnings: string[];
}

/** Standard field paths used across the platform */
export const STANDARD_FIELDS = {
  // Income statement
  'income.revenue': 'Revenue',
  'income.cogs': 'Cost of Goods Sold',
  'income.grossProfit': 'Gross Profit',
  'income.operatingExpenses': 'Operating Expenses',
  'income.ebitda': 'EBITDA',
  'income.ebit': 'EBIT',
  'income.financeCosts': 'Finance Costs',
  'income.profitBeforeTax': 'Profit Before Tax',
  'income.tax': 'Tax Expense',
  'income.netIncome': 'Net Income',
  // Balance sheet – assets
  'balance.cash': 'Cash and Cash Equivalents',
  'balance.accountsReceivable': 'Accounts Receivable',
  'balance.inventory': 'Inventory',
  'balance.totalCurrentAssets': 'Total Current Assets',
  'balance.ppe': 'Property, Plant and Equipment',
  'balance.intangibleAssets': 'Intangible Assets',
  'balance.totalAssets': 'Total Assets',
  // Balance sheet – liabilities
  'balance.accountsPayable': 'Accounts Payable',
  'balance.shortTermDebt': 'Short-term Borrowings',
  'balance.totalCurrentLiabilities': 'Total Current Liabilities',
  'balance.longTermDebt': 'Long-term Borrowings',
  'balance.totalLiabilities': 'Total Liabilities',
  // Equity
  'balance.shareCapital': 'Share Capital',
  'balance.retainedEarnings': 'Retained Earnings',
  'balance.totalEquity': 'Total Equity',
  // Cash flow
  'cashflow.operating': 'Operating Cash Flow',
  'cashflow.investing': 'Investing Cash Flow',
  'cashflow.financing': 'Financing Cash Flow',
  'cashflow.capex': 'Capital Expenditure',
  'cashflow.freeCashFlow': 'Free Cash Flow',
  'cashflow.netChange': 'Net Change in Cash',
  'cashflow.openingCash': 'Opening Cash',
  'cashflow.closingCash': 'Closing Cash',
} as const;

const LABEL_ALIASES: Record<string, string[]> = {
  'income.revenue': ['revenue', 'turnover', 'sales', 'total revenue', 'net sales'],
  'income.cogs': ['cost of sales', 'cost of goods sold', 'cogs', 'cost of revenue'],
  'income.grossProfit': ['gross profit', 'gross income'],
  'income.ebitda': ['ebitda', 'earnings before interest tax depreciation'],
  'income.ebit': ['ebit', 'operating profit', 'operating income', 'profit from operations'],
  'income.financeCosts': ['finance costs', 'interest expense', 'finance expense', 'interest paid'],
  'income.netIncome': ['net income', 'net profit', 'profit for the year', 'profit after tax', 'profit attributable'],
  'balance.cash': ['cash and cash equivalents', 'cash at bank', 'cash and bank balances'],
  'balance.accountsReceivable': ['trade receivables', 'accounts receivable', 'trade and other receivables'],
  'balance.inventory': ['inventories', 'stock'],
  'balance.totalCurrentAssets': ['total current assets', 'current assets'],
  'balance.totalAssets': ['total assets'],
  'balance.accountsPayable': ['trade payables', 'accounts payable', 'trade and other payables'],
  'balance.totalCurrentLiabilities': ['total current liabilities', 'current liabilities'],
  'balance.totalLiabilities': ['total liabilities'],
  'balance.totalEquity': ['total equity', 'equity attributable', 'shareholders equity', "shareholders' equity"],
  'balance.retainedEarnings': ['retained earnings', 'accumulated profits', 'retained profits'],
  'cashflow.operating': ['net cash from operating', 'cash generated from operations', 'operating cash flow'],
  'cashflow.investing': ['net cash from investing', 'investing cash flow'],
  'cashflow.financing': ['net cash from financing', 'financing cash flow'],
};

/**
 * Heuristic extraction from plain text tables / key-value lines.
 * Production path replaces this with table-structure + LLM mapping while preserving the same output contract.
 */
export function extractFromText(
  text: string,
  documentType: DocumentType,
  documentId?: string,
  pageNumber = 1
): ExtractionResult {
  const fields: ExtractedField[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const [fieldPath, aliases] of Object.entries(LABEL_ALIASES)) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const alias of aliases) {
        if (lower.includes(alias)) {
          // Try to find a number on the same line (last number wins)
          const numbers = line.match(/[-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?/g);
          if (numbers && numbers.length > 0) {
            const raw = numbers[numbers.length - 1];
            const value = parseFloat(raw.replace(/,/g, ''));
            if (!isNaN(value)) {
              fields.push({
                fieldName: STANDARD_FIELDS[fieldPath as keyof typeof STANDARD_FIELDS] || fieldPath,
                fieldPath,
                value,
                rawValue: raw,
                confidence: 0.65,
                provenance: {
                  documentId,
                  pageNumber,
                  fieldName: fieldPath,
                  sourceReference: `TEXT → page ${pageNumber} → line containing "${alias}"`,
                  confidence: 0.65,
                },
              });
              break;
            }
          }
        }
      }
    }
  }

  // Deduplicate by fieldPath keeping highest confidence
  const byPath = new Map<string, ExtractedField>();
  for (const f of fields) {
    const existing = byPath.get(f.fieldPath);
    if (!existing || f.confidence > existing.confidence) byPath.set(f.fieldPath, f);
  }
  const unique = Array.from(byPath.values());

  if (unique.length < 3) {
    warnings.push('Low field yield — OCR quality or table structure may require manual review or specialized extraction.');
  }

  // Company name heuristic
  let companyName: string | undefined;
  const companyMatch = text.match(/(?:company|entity|name)\s*[:\-]\s*([A-Z][A-Za-z0-9\s&.,]{3,60})/i)
    || text.match(/^([A-Z][A-Za-z0-9\s&.,]{5,50}(?:Ltd|Limited|Inc|Corp|PLC|Pty)?)/m);
  if (companyMatch) companyName = companyMatch[1].trim();

  const overallConfidence = unique.length === 0 ? 0.2 : Math.min(0.9, 0.4 + unique.length * 0.04);

  return {
    documentType,
    fields: unique,
    companyName,
    overallConfidence,
    warnings,
  };
}

export function mapExtractedToPeriodData(fields: ExtractedField[]) {
  const get = (path: string) => fields.find((f) => f.fieldPath === path)?.value ?? null;

  return {
    incomeStatement: {
      revenue: get('income.revenue') ?? 0,
      cogs: get('income.cogs') ?? undefined,
      grossProfit: get('income.grossProfit') ?? undefined,
      operatingExpenses: get('income.operatingExpenses') ?? undefined,
      ebitda: get('income.ebitda') ?? undefined,
      ebit: get('income.ebit') ?? undefined,
      financeCosts: get('income.financeCosts') ?? undefined,
      profitBeforeTax: get('income.profitBeforeTax') ?? undefined,
      tax: get('income.tax') ?? undefined,
      netIncome: get('income.netIncome') ?? 0,
    },
    balanceSheet: {
      cash: get('balance.cash') ?? 0,
      accountsReceivable: get('balance.accountsReceivable') ?? undefined,
      inventory: get('balance.inventory') ?? undefined,
      totalCurrentAssets: get('balance.totalCurrentAssets') ?? 0,
      ppe: get('balance.ppe') ?? undefined,
      intangibleAssets: get('balance.intangibleAssets') ?? undefined,
      totalAssets: get('balance.totalAssets') ?? 0,
      accountsPayable: get('balance.accountsPayable') ?? undefined,
      shortTermDebt: get('balance.shortTermDebt') ?? undefined,
      totalCurrentLiabilities: get('balance.totalCurrentLiabilities') ?? 0,
      longTermDebt: get('balance.longTermDebt') ?? undefined,
      totalLiabilities: get('balance.totalLiabilities') ?? 0,
      shareCapital: get('balance.shareCapital') ?? undefined,
      retainedEarnings: get('balance.retainedEarnings') ?? undefined,
      totalEquity: get('balance.totalEquity') ?? 0,
    },
    cashFlow: {
      operatingCashFlow: get('cashflow.operating') ?? 0,
      investingCashFlow: get('cashflow.investing') ?? undefined,
      financingCashFlow: get('cashflow.financing') ?? undefined,
      freeCashFlow: get('cashflow.freeCashFlow') ?? undefined,
      capitalExpenditure: get('cashflow.capex') ?? undefined,
      netChangeInCash: get('cashflow.netChange') ?? undefined,
      openingCash: get('cashflow.openingCash') ?? undefined,
      closingCash: get('cashflow.closingCash') ?? undefined,
    },
  };
}
