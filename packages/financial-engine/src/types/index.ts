/**
 * Core financial data types for CINTEXA Nexus Finance Engine
 * All monetary values use number for calculation simplicity;
 * production systems should prefer Decimal for precision.
 */

export interface IncomeStatementData {
  revenue: number;
  cogs?: number;
  grossProfit?: number;
  operatingExpenses?: number;
  ebitda?: number;
  depreciationAmortization?: number;
  ebit?: number;
  financeCosts?: number;
  profitBeforeTax?: number;
  tax?: number;
  netIncome: number;
  otherIncome?: number;
  otherExpenses?: number;
}

export interface BalanceSheetData {
  // Assets
  cash: number;
  accountsReceivable?: number;
  inventory?: number;
  otherCurrentAssets?: number;
  totalCurrentAssets: number;
  ppe?: number;
  intangibleAssets?: number;
  investments?: number;
  otherNonCurrentAssets?: number;
  totalNonCurrentAssets?: number;
  totalAssets: number;

  // Liabilities
  accountsPayable?: number;
  shortTermDebt?: number;
  otherCurrentLiabilities?: number;
  totalCurrentLiabilities: number;
  longTermDebt?: number;
  leaseLiabilities?: number;
  provisions?: number;
  otherNonCurrentLiabilities?: number;
  totalNonCurrentLiabilities?: number;
  totalLiabilities: number;

  // Equity
  shareCapital?: number;
  retainedEarnings?: number;
  reserves?: number;
  totalEquity: number;
}

export interface CashFlowData {
  operatingCashFlow: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  freeCashFlow?: number;
  capitalExpenditure?: number;
  debtRepayments?: number;
  debtProceeds?: number;
  dividendsPaid?: number;
  netChangeInCash?: number;
  openingCash?: number;
  closingCash?: number;
}

export interface FinancialPeriodData {
  label: string;
  fiscalYear: number;
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
  isAudited?: boolean;
  accountingStandard?: string;
}

export interface RatioResult {
  name: string;
  category: 'LIQUIDITY' | 'PROFITABILITY' | 'EFFICIENCY' | 'SOLVENCY' | 'GROWTH' | 'CASH_FLOW';
  value: number | null;
  formula: string;
  interpretation: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
  managementImplication: string;
  benchmark?: {
    median?: number;
    topQuartile?: number;
    bottomQuartile?: number;
  };
  trend?: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE';
}

export interface HealthScoreResult {
  overallScore: number;
  classification: 'EXCEPTIONAL' | 'HEALTHY' | 'STABLE_WATCH' | 'FINANCIAL_PRESSURE' | 'DISTRESSED' | 'CRITICAL';
  dimensions: {
    liquidity: number;
    cashFlowStrength: number;
    profitability: number;
    solvency: number;
    debtSustainability: number;
    workingCapital: number;
    growthQuality: number;
    balanceSheetQuality: number;
    earningsQuality: number;
  };
  explanation: string;
  weights: Record<string, number>;
}

export interface DistressModelResult {
  modelName: string;
  result: number | null;
  zone?: string;
  interpretation: string;
  purpose: string;
  limitations: string;
  applicability: string;
  inputs: Record<string, number>;
}

export interface SurvivalEstimate {
  runwayMonthsBase: number | null;
  runwayMonthsOptimistic: number | null;
  runwayMonthsPessimistic: number | null;
  runwayMonthsStress: number | null;
  runwayMonthsRecovery: number | null;
  survivalProbability12m: number | null;
  survivalProbability24m: number | null;
  survivalProbability36m: number | null;
  failureRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
  primaryConstraint: string;
  assumptions: string[];
  confidence: number;
  dataQuality: number;
  methodology: string;
  drivers: string[];
}

export interface ReconciliationResult {
  check: string;
  sourceValue: number;
  expectedValue: number;
  variance: number;
  isBalanced: boolean;
  possibleExplanations: string[];
  requiredVerification: string;
}

export interface ScenarioAssumption {
  revenueChangePct?: number;
  grossMarginChangePct?: number;
  opexChangePct?: number;
  payrollChangePct?: number;
  interestRateChangePct?: number;
  debtRepaymentDelayMonths?: number;
  newInvestment?: number;
  assetSaleProceeds?: number;
  costReductionPct?: number;
  pricingIncreasePct?: number;
  customerLossPct?: number;
  supplierCostIncreasePct?: number;
  currencyDepreciationPct?: number;
  taxIncreasePct?: number;
  capexChangePct?: number;
}

export interface ScenarioResult {
  name: string;
  type: 'BASE' | 'OPTIMISTIC' | 'PESSIMISTIC' | 'SEVERE_STRESS' | 'MANAGEMENT_RECOVERY' | 'CUSTOM';
  assumptions: ScenarioAssumption;
  projectedCash: number[];
  monthlyBurn: number;
  projectedRevenue: number[];
  projectedEbitda: number[];
  projectedOcf: number[];
  projectedDebt: number[];
  liquidity: number[];
  survivalProbability: number;
  runwayMonths: number;
}
