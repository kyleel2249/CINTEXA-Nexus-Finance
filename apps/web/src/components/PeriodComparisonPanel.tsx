import { useState } from 'react';
import { RiskBadge } from './RiskBadge';

const API_BASE = import.meta.env.VITE_API_URL || '';

const FY2023 = {
  label: 'FY2023',
  fiscalYear: 2023,
  incomeStatement: { revenue: 9000000, cogs: 5400000, grossProfit: 3600000, ebitda: 2000000, ebit: 1800000, financeCosts: 120000, netIncome: 1200000 },
  balanceSheet: { cash: 2200000, totalCurrentAssets: 4500000, totalAssets: 10000000, totalCurrentLiabilities: 1400000, totalLiabilities: 3500000, totalEquity: 6500000, shortTermDebt: 200000, longTermDebt: 1800000 },
  cashFlow: { operatingCashFlow: 1600000 },
};

const FY2024 = {
  label: 'FY2024',
  fiscalYear: 2024,
  incomeStatement: { revenue: 9500000, cogs: 5800000, grossProfit: 3700000, ebitda: 1900000, ebit: 1700000, financeCosts: 140000, netIncome: 1100000 },
  balanceSheet: { cash: 2000000, totalCurrentAssets: 4600000, totalAssets: 10500000, totalCurrentLiabilities: 1600000, totalLiabilities: 3800000, totalEquity: 6700000, shortTermDebt: 250000, longTermDebt: 1900000 },
  cashFlow: { operatingCashFlow: 1400000 },
};

const FY2025_DOWN = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: { revenue: 7000000, cogs: 5000000, grossProfit: 2000000, ebitda: 400000, ebit: 200000, financeCosts: 300000, netIncome: -200000 },
  balanceSheet: { cash: 600000, totalCurrentAssets: 3500000, totalAssets: 9000000, totalCurrentLiabilities: 2800000, totalLiabilities: 5500000, totalEquity: 3500000, shortTermDebt: 800000, longTermDebt: 2500000 },
  cashFlow: { operatingCashFlow: -100000 },
};

export function PeriodComparisonPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/compare/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periods: [FY2023, FY2024, FY2025_DOWN] }),
      });
      if (!res.ok) throw new Error(`Compare failed (${res.status})`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Multi-Year Comparison</h3>
          <p className="text-sm text-slate-500">FY2023 → FY2024 → FY2025 demo trajectory</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Comparing…' : 'Run 3-year compare'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {data?.comparison && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            {data.comparison.healthByPeriod.map((h: any) => (
              <div key={h.label} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{h.label}</span>
                <span className="ml-2 tabular-nums">{h.score}/100</span>
                <span className="ml-2 text-xs text-slate-500">{h.classification.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Metric</th>
                  {(data.comparison.rows[0]?.labels || []).map((l: string) => (
                    <th key={l} className="py-2 pr-3">
                      {l}
                    </th>
                  ))}
                  <th className="py-2 pr-3">Trend</th>
                  <th className="py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.comparison.rows.slice(0, 12).map((r: any) => (
                  <tr key={r.metric} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">{r.metric}</td>
                    {r.values.map((v: number | null, i: number) => (
                      <td key={i} className="py-2 pr-3 tabular-nums">
                        {v == null ? '—' : Math.round(v).toLocaleString()}
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-xs">{r.trend.replace(/_/g, ' ')}</td>
                    <td className="py-2">
                      {r.risk !== 'N/A' ? <RiskBadge level={r.risk} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
