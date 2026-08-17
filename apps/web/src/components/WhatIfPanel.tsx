import { useState } from 'react';
import { runWhatIf } from '../lib/api';

const PRESETS = [
  { label: 'Revenue −10%', assumptions: { revenueChangePct: -10 } },
  { label: 'Revenue −25%', assumptions: { revenueChangePct: -25 } },
  { label: 'Revenue +10%', assumptions: { revenueChangePct: 10 } },
  { label: 'Gross margin −5pp', assumptions: { grossMarginChangePct: -5 } },
  { label: 'Cost cut −12%', assumptions: { costReductionPct: 12 } },
  { label: 'Severe stress', assumptions: { revenueChangePct: -25, grossMarginChangePct: -5, opexChangePct: 10 } },
];

export function WhatIfPanel({ current }: { current: unknown }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [revenueChangePct, setRevenueChangePct] = useState(0);
  const [costReductionPct, setCostReductionPct] = useState(0);

  async function run(assumptions: Record<string, number>, name = 'Custom') {
    setLoading(true);
    setError(null);
    try {
      const data = await runWhatIf({ current, name, assumptions, months: 24 });
      setResult(data.scenario);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">What-If Simulator</h3>
      <p className="mt-1 text-sm text-slate-500">
        Instantly recalculate runway and survival under alternative assumptions. Estimates only — not guarantees.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            disabled={loading}
            onClick={() => run(p.assumptions, p.label)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-500">Revenue change %</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            value={revenueChangePct}
            onChange={(e) => setRevenueChangePct(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Cost reduction %</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            value={costReductionPct}
            onChange={(e) => setCostReductionPct(Number(e.target.value))}
          />
        </label>
        <div className="flex items-end">
          <button
            disabled={loading}
            onClick={() =>
              run({ revenueChangePct, costReductionPct }, 'Custom slider')
            }
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run custom'}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs uppercase text-slate-500">Runway</div>
            <div className="text-xl font-semibold tabular-nums">{result.runwayMonths} mo</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs uppercase text-slate-500">Survival prob.</div>
            <div className="text-xl font-semibold tabular-nums">{result.survivalProbability}%</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs uppercase text-slate-500">Monthly burn (est.)</div>
            <div className="text-xl font-semibold tabular-nums">{Math.round(result.monthlyBurn).toLocaleString()}</div>
          </div>
        </div>
      )}
    </section>
  );
}
