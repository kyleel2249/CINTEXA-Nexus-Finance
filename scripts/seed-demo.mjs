/**
 * Demo seed via API (memory or Prisma depending on server env)
 * Usage: node scripts/seed-demo.mjs [apiBase]
 */

const API = process.argv[2] || 'http://localhost:4000';

const healthy = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 10000000, cogs: 6000000, grossProfit: 4000000, operatingExpenses: 2000000,
    ebitda: 2200000, ebit: 2000000, financeCosts: 150000, profitBeforeTax: 1850000, tax: 450000, netIncome: 1400000,
  },
  balanceSheet: {
    cash: 2500000, accountsReceivable: 1200000, inventory: 800000, totalCurrentAssets: 4800000,
    ppe: 5000000, totalAssets: 11000000, accountsPayable: 900000, shortTermDebt: 300000,
    totalCurrentLiabilities: 1500000, longTermDebt: 2000000, totalLiabilities: 4000000,
    shareCapital: 3000000, retainedEarnings: 4000000, totalEquity: 7000000,
  },
  cashFlow: {
    operatingCashFlow: 1800000, investingCashFlow: -600000, financingCashFlow: -400000,
    freeCashFlow: 1200000, capitalExpenditure: 600000, netChangeInCash: 800000, openingCash: 1700000, closingCash: 2500000,
  },
};

const distressed = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 5000000, cogs: 4200000, grossProfit: 800000, operatingExpenses: 1500000,
    ebitda: -500000, ebit: -700000, financeCosts: 400000, profitBeforeTax: -1100000, tax: 0, netIncome: -1100000,
  },
  balanceSheet: {
    cash: 150000, accountsReceivable: 1800000, inventory: 1200000, totalCurrentAssets: 3200000,
    ppe: 2000000, totalAssets: 5500000, accountsPayable: 2200000, shortTermDebt: 1500000,
    totalCurrentLiabilities: 4000000, longTermDebt: 3000000, totalLiabilities: 7500000,
    shareCapital: 1000000, retainedEarnings: -3000000, totalEquity: -2000000,
  },
  cashFlow: {
    operatingCashFlow: -800000, investingCashFlow: -50000, financingCashFlow: 700000,
    freeCashFlow: -850000, netChangeInCash: -150000, openingCash: 300000, closingCash: 150000,
  },
};

async function main() {
  for (const [name, period] of [
    ['Acme Healthy Ltd', healthy],
    ['Orion Distressed Ltd', distressed],
  ]) {
    const created = await fetch(`${API}/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, industry: 'Demo', country: 'US' }),
    }).then((r) => r.json());
    console.log('Created', created.id, created.name);
    const analyzed = await fetch(`${API}/api/companies/${created.id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: period, dataQuality: 90 }),
    }).then((r) => r.json());
    const h = analyzed.analysis?.intelligence?.analysis?.health;
    console.log('  Health', h?.overallScore, h?.classification);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
