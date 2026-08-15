/**
 * @cintexa/shared
 * Shared types, constants, and utilities for CINTEXA Nexus Finance
 */

export const DOCUMENT_TYPES = [
  'ANNUAL_REPORT',
  'BALANCE_SHEET',
  'INCOME_STATEMENT',
  'CASH_FLOW_STATEMENT',
  'STATEMENT_OF_CHANGES_IN_EQUITY',
  'NOTES_TO_FINANCIAL_STATEMENTS',
  'AUDITOR_REPORT',
  'BANK_STATEMENT',
  'TAX_DOCUMENT',
  'TRIAL_BALANCE',
  'GENERAL_LEDGER',
  'ACCOUNTS_RECEIVABLE',
  'ACCOUNTS_PAYABLE',
  'PAYROLL_SUMMARY',
  'MANAGEMENT_ACCOUNTS',
  'BUDGET',
  'FORECAST',
  'DEBT_SCHEDULE',
  'LOAN_AGREEMENT',
  'INVESTOR_REPORT',
  'BOARD_REPORT',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const HEALTH_CLASSIFICATIONS = [
  'EXCEPTIONAL',
  'HEALTHY',
  'STABLE_WATCH',
  'FINANCIAL_PRESSURE',
  'DISTRESSED',
  'CRITICAL',
] as const;

export type HealthClassification = (typeof HEALTH_CLASSIFICATIONS)[number];

export const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'SEVERE', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const ACTION_PRIORITIES = ['IMMEDIATE', 'DAYS_30', 'DAYS_90', 'DAYS_180', 'LONG_TERM'] as const;
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

export const SOURCE_TIERS = {
  1: 'Audited financial statements / Regulatory filings / Official disclosures',
  2: 'Bank statements / Management accounts / Contracts / Tax documents',
  3: 'Industry reports / Professional research / Credit reports',
  4: 'Reputable news',
  5: 'General web information',
  6: 'Unverified sources / Social media',
} as const;

export const EXPERT_MODES = [
  'SIMPLE',
  'PROFESSIONAL',
  'AUDITOR',
  'CFO',
  'INVESTOR',
  'LENDER',
  'BOARD',
] as const;

export type ExpertMode = (typeof EXPERT_MODES)[number];

export const AUDIT_AGENTS = [
  'LEAD_AUDIT_PARTNER',
  'FINANCIAL_STATEMENT_AUDITOR',
  'FORENSIC_ACCOUNTANT',
  'REVENUE_AUDITOR',
  'EXPENSE_AUDITOR',
  'ASSET_AUDITOR',
  'LIABILITY_AUDITOR',
  'CASH_AUDITOR',
  'TAX_RISK_AUDITOR',
  'GOING_CONCERN_SPECIALIST',
  'INDUSTRY_ANALYST',
  'CFO_AGENT',
  'RESTRUCTURING_SPECIALIST',
  'BOARD_RISK_ADVISOR',
] as const;

export type AuditAgentType = (typeof AUDIT_AGENTS)[number];

export interface ProvenanceRef {
  documentId?: string;
  pageNumber?: number;
  tableIndex?: number;
  rowIndex?: number;
  cellIndex?: number;
  fieldName?: string;
  sourceReference?: string;
  confidence?: number;
}

export interface ConfidenceMeta {
  confidence: number;
  dataQuality: number;
  evidenceStrength: number;
  researchQuality?: number;
  modelUncertainty: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const DISCLAIMER_SHORT =
  'AI-assisted analytical system. Does not replace licensed professionals. Survival estimates are probabilistic. Anomalies require investigation and do not automatically indicate fraud.';

export const DISCLAIMER_FULL = `This analysis is produced by an AI-assisted analytical system (CINTEXA Nexus Finance). 
It does not replace a licensed auditor, accountant, lawyer, insolvency practitioner, investment adviser or other regulated professional. 
Financial distress and survival estimates are probabilistic and based on the data and assumptions provided. 
An anomaly does not automatically indicate fraud. Public internet information may be incomplete or outdated. 
The system cannot certify financial statements. Final regulated audit opinions must come from appropriately licensed professionals.`;

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
