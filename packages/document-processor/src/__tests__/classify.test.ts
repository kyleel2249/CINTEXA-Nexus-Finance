import { describe, it, expect } from 'vitest';
import { classifyDocument, processDocument } from '../index';

describe('document classification', () => {
  it('classifies balance sheet by filename', () => {
    const r = classifyDocument('Statement_of_Financial_Position_FY2025.pdf');
    expect(r.documentType).toBe('BALANCE_SHEET');
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.fiscalYear).toBe(2025);
  });

  it('classifies auditor report by content', () => {
    const r = classifyDocument('report.pdf', 'We have audited the financial statements. In our opinion, key audit matters include going concern.');
    expect(r.documentType).toBe('AUDITOR_REPORT');
  });

  it('extracts revenue-like fields from text', () => {
    const text = `
      ACME LTD
      Revenue 10,000,000
      Cost of sales 6,000,000
      Gross profit 4,000,000
      Net income 1,400,000
      Total assets 11,000,000
      Total equity 7,000,000
      Cash and cash equivalents 2,500,000
    `;
    const result = processDocument({ filename: 'income_statement_FY2025.txt', textContent: text });
    expect(result.classification.documentType).toMatch(/INCOME|OTHER|ANNUAL/);
    expect(result.periodData.incomeStatement.revenue).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeGreaterThan(20);
  });
});
