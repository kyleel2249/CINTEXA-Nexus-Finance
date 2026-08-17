import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const PERSPECTIVES = ['INVESTOR', 'LENDER', 'BOARD', 'CFO', 'AUDITOR'] as const;

export function PerspectivePanel({ current }: { current: unknown }) {
  const [perspective, setPerspective] = useState<(typeof PERSPECTIVES)[number]>('LENDER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<any>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/perspectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perspective, current, dataQuality: 90 }),
      });
      if (!res.ok) throw new Error(`Perspective failed (${res.status})`);
      const data = await res.json();
      setBrief(data.brief);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">Stakeholder Perspective</h3>
      <p className="mt-1 text-sm text-slate-500">Re-frame the same analysis for lenders, investors, board, CFO or auditors.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PERSPECTIVES.map((p) => (
          <button
            key={p}
            onClick={() => setPerspective(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              perspective === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Building…' : 'Generate brief'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {brief && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="font-medium text-slate-800">{brief.headline}</p>
          <div className="text-xs uppercase tracking-wide text-slate-400">Focus: {(brief.focusAreas || []).join(' · ')}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(brief.keyMetrics || []).map((m: any) => (
              <div key={m.label} className="rounded bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className="font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
          {(brief.risks || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">Risks</div>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {brief.risks.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {(brief.actions || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">Actions</div>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {brief.actions.slice(0, 5).map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
