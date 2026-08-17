import { useState } from 'react';
import { analyzeStructured, askCfo } from './lib/api';
import { ScoreBadge } from './components/ScoreBadge';
import { RiskBadge } from './components/RiskBadge';
import { MetricCard } from './components/MetricCard';
import { UploadPanel } from './components/UploadPanel';

const DEMO_HEALTHY = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 10000000,
    cogs: 6000000,
    grossProfit: 4000000,
    operatingExpenses: 2000000,
    ebitda: 2200000,
    ebit: 2000000,
    financeCosts: 150000,
    profitBeforeTax: 1850000,
    tax: 450000,
    netIncome: 1400000,
  },
  balanceSheet: {
    cash: 2500000,
    accountsReceivable: 1200000,
    inventory: 800000,
    totalCurrentAssets: 4800000,
    ppe: 5000000,
    totalAssets: 11000000,
    accountsPayable: 900000,
    shortTermDebt: 300000,
    totalCurrentLiabilities: 1500000,
    longTermDebt: 2000000,
    totalLiabilities: 4000000,
    shareCapital: 3000000,
    retainedEarnings: 4000000,
    totalEquity: 7000000,
  },
  cashFlow: {
    operatingCashFlow: 1800000,
    investingCashFlow: -600000,
    financingCashFlow: -400000,
    freeCashFlow: 1200000,
    capitalExpenditure: 600000,
    netChangeInCash: 800000,
    openingCash: 1700000,
    closingCash: 2500000,
  },
};

const DEMO_DISTRESSED = {
  label: 'FY2025',
  fiscalYear: 2025,
  incomeStatement: {
    revenue: 5000000,
    cogs: 4200000,
    grossProfit: 800000,
    operatingExpenses: 1500000,
    ebitda: -500000,
    ebit: -700000,
    financeCosts: 400000,
    profitBeforeTax: -1100000,
    tax: 0,
    netIncome: -1100000,
  },
  balanceSheet: {
    cash: 150000,
    accountsReceivable: 1800000,
    inventory: 1200000,
    totalCurrentAssets: 3200000,
    ppe: 2000000,
    totalAssets: 5500000,
    accountsPayable: 2200000,
    shortTermDebt: 1500000,
    totalCurrentLiabilities: 4000000,
    longTermDebt: 3000000,
    totalLiabilities: 7500000,
    shareCapital: 1000000,
    retainedEarnings: -3000000,
    totalEquity: -2000000,
  },
  cashFlow: {
    operatingCashFlow: -800000,
    investingCashFlow: -50000,
    financingCashFlow: 700000,
    freeCashFlow: -850000,
    netChangeInCash: -150000,
    openingCash: 300000,
    closingCash: 150000,
  },
};

type AnalysisResult = any;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeDemo, setActiveDemo] = useState<'healthy' | 'distressed' | null>(null);
  const [cfoQuestion, setCfoQuestion] = useState('Can this company survive another year?');
  const [cfoAnswer, setCfoAnswer] = useState<string | null>(null);
  const [cfoLoading, setCfoLoading] = useState(false);

  async function runDemo(kind: 'healthy' | 'distressed') {
    setLoading(true);
    setError(null);
    setActiveDemo(kind);
    try {
      const data = await analyzeStructured({
        current: kind === 'healthy' ? DEMO_HEALTHY : DEMO_DISTRESSED,
        dataQuality: 90,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  const intel = result?.intelligence;
  const health = intel?.analysis?.health;
  const survival = intel?.analysis?.survival;
  const findings = intel?.findings || [];
  const panel = intel?.panelConclusion;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              CINTEXA Nexus <span className="text-blue-600">Finance</span>
            </h1>
            <p className="text-xs text-slate-500">
              Financial Health · Forensic Audit · Corporate Survival Intelligence
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => runDemo('healthy')}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Demo: Healthy Co.
            </button>
            <button
              onClick={() => runDemo('distressed')}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Demo: Distressed Co.
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!result && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-2xl font-semibold text-slate-800">Corporate Financial Intelligence</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Upload financial statements or run a synthetic demo to generate a full health score,
              distress models, survival estimate, multi-agent audit findings and action priorities.
            </p>
            <p className="mt-6 text-sm text-slate-400">
              Use the demo buttons above to see healthy vs distressed outcomes.
            </p>
            <div className="mx-auto mt-8 max-w-xl">
              <UploadPanel onTextReady={(filename, text) => {
                console.log('Uploaded', filename, text.slice(0, 200));
                // Future: POST /api/analyze/text
              }} />
            </div>
          </div>
        )}

        {loading && (
          <div className="py-20 text-center text-slate-500">
            Running financial engine + multi-agent panel…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {result && health && survival && (
          <div className="space-y-8">
            {/* Executive verdict */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {activeDemo === 'healthy' ? 'Healthy Company (Demo)' : activeDemo === 'distressed' ? 'Distressed Company (Demo)' : 'Analysis Result'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Data quality: {result.dataQualityScore}%</p>
                </div>
                <ScoreBadge score={health.overallScore} classification={health.classification} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="12-Month Survival"
                  value={`${survival.survivalProbability12m}%`}
                  sub={`Confidence ${survival.confidence}%`}
                  accent={survival.survivalProbability12m >= 70 ? 'green' : survival.survivalProbability12m >= 50 ? 'amber' : 'red'}
                />
                <MetricCard
                  label="Base-Case Runway"
                  value={survival.runwayMonthsBase != null ? `${survival.runwayMonthsBase} mo` : 'N/A'}
                  sub={survival.primaryConstraint}
                  accent={survival.runwayMonthsBase != null && survival.runwayMonthsBase >= 18 ? 'green' : 'amber'}
                />
                <MetricCard
                  label="Failure Risk"
                  value={survival.failureRisk}
                  accent={survival.failureRisk === 'LOW' ? 'green' : survival.failureRisk === 'MODERATE' ? 'amber' : 'red'}
                />
                <MetricCard
                  label="Panel Findings"
                  value={panel?.totalFindings ?? findings.length}
                  sub={`${panel?.criticalOrSevere ?? 0} critical/severe`}
                  accent="blue"
                />
              </div>
            </section>

            {/* Executive Verdict */}
            {intel.verdict && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">Corporate Financial Verdict</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  <div><span className="text-slate-500">Condition</span><div className="font-semibold">{intel.verdict.currentCondition}</div></div>
                  <div><span className="text-slate-500">Liquidity risk</span><div className="font-semibold">{intel.verdict.liquidityRisk}</div></div>
                  <div><span className="text-slate-500">Solvency risk</span><div className="font-semibold">{intel.verdict.solvencyRisk}</div></div>
                  <div><span className="text-slate-500">Cash-flow risk</span><div className="font-semibold">{intel.verdict.cashFlowRisk}</div></div>
                  <div><span className="text-slate-500">Going-concern risk</span><div className="font-semibold">{intel.verdict.goingConcernRisk}</div></div>
                  <div><span className="text-slate-500">24-mo survival</span><div className="font-semibold">{intel.verdict.survival24m}%</div></div>
                </div>
                <p className="mt-4 text-sm text-slate-600"><strong>Why:</strong> {intel.verdict.why}</p>
                <p className="mt-2 text-sm text-slate-600"><strong>Management should:</strong> {intel.verdict.whatManagementShouldDo}</p>
                <p className="mt-2 text-sm text-slate-500"><strong>What could change the result:</strong> {intel.verdict.whatCouldChange}</p>
              </section>
            )}

            {/* Scenarios */}
            {intel.analysis?.scenarios?.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">Scenario Analysis</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-slate-500">
                        <th className="py-2 pr-4">Scenario</th>
                        <th className="py-2 pr-4">Runway (mo)</th>
                        <th className="py-2">Survival prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intel.analysis.scenarios.map((s: any) => (
                        <tr key={s.name} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-medium">{s.name}</td>
                          <td className="py-2 pr-4 tabular-nums">{s.runwayMonths}</td>
                          <td className="py-2 tabular-nums">{s.survivalProbability}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Health dimensions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">Health Score Dimensions</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {Object.entries(health.dimensions).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm capitalize text-slate-600">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-semibold tabular-nums">{(val as number).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-600">{health.explanation}</p>
            </section>

            {/* Key ratios */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">Key Ratios</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500">
                      <th className="py-2 pr-4">Ratio</th>
                      <th className="py-2 pr-4">Value</th>
                      <th className="py-2 pr-4">Risk</th>
                      <th className="py-2">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(intel.analysis.ratios || []).slice(0, 12).map((r: any) => (
                      <tr key={r.name} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium">{r.name}</td>
                        <td className="py-2 pr-4 tabular-nums">
                          {r.value == null ? '—' : typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
                        </td>
                        <td className="py-2 pr-4">
                          <RiskBadge level={r.riskLevel} />
                        </td>
                        <td className="py-2 text-slate-600 max-w-md">{r.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Distress models */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">Distress Models</h3>
              <div className="mt-4 space-y-4">
                {(intel.analysis.distressModels || []).map((m: any) => (
                  <div key={m.modelName} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{m.modelName}</span>
                      <span className="text-sm tabular-nums text-slate-600">
                        Result: {m.result == null ? 'N/A' : m.result.toFixed?.(2) ?? m.result}
                        {m.zone ? ` · ${m.zone}` : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{m.interpretation}</p>
                    <p className="mt-1 text-xs text-slate-400">Limitations: {m.limitations}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Agent findings */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">Expert Panel Findings</h3>
              {panel && (
                <p className="mt-2 text-sm text-slate-600">{panel.summary}</p>
              )}
              <div className="mt-4 space-y-3">
                {findings.map((f: any, i: number) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={f.severity} />
                      <span className="text-xs uppercase text-slate-400">{f.agent.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-400">· {f.priority.replace(/_/g, ' ')}</span>
                    </div>
                    <h4 className="mt-1 font-medium text-slate-900">{f.title}</h4>
                    <p className="mt-1 text-sm text-slate-600">{f.finding}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      <strong>Evidence:</strong> {f.evidence}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <strong>Recommendation:</strong> {f.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommendations */}
            {intel.recommendations?.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">Priority Recommendations</h3>
                <div className="mt-4 space-y-3">
                  {intel.recommendations.slice(0, 8).map((r: any) => (
                    <div key={r.id} className="rounded-lg border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge level={r.severity} />
                        <span className="text-xs text-slate-400">{r.priority.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-400">· Owner: {r.owner}</span>
                      </div>
                      <h4 className="mt-1 font-medium text-slate-900">{r.problem}</h4>
                      <p className="mt-1 text-sm text-slate-600">{r.action}</p>
                      <p className="mt-2 text-xs text-slate-500"><strong>Success metric:</strong> {r.successMetric}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action plans */}
            {intel.actionPlans?.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">Action Plans</h3>
                <div className="mt-4 space-y-4">
                  {intel.actionPlans.map((plan: any) => (
                    <div key={plan.timeframe} className="rounded-lg bg-slate-50 p-4">
                      <h4 className="font-medium text-slate-800">{plan.title}</h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                        {plan.tasks.map((t: any) => (
                          <li key={t.step}>{t.description} <span className="text-slate-400">({t.owner})</span></li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* AI CFO */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">AI CFO</h3>
              <p className="mt-1 text-sm text-slate-500">Ask questions grounded in the current analysis evidence.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cfoQuestion}
                  onChange={(e) => setCfoQuestion(e.target.value)}
                  placeholder="e.g. Why is the company losing money?"
                />
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={cfoLoading || !result}
                  onClick={async () => {
                    setCfoLoading(true);
                    setCfoAnswer(null);
                    try {
                      const data = activeDemo === 'healthy' ? DEMO_HEALTHY : DEMO_DISTRESSED;
                      const res = await askCfo({ question: cfoQuestion, current: data, dataQuality: 90 });
                      setCfoAnswer(res.answer);
                    } catch (e: any) {
                      setCfoAnswer(e.message || 'Request failed');
                    } finally {
                      setCfoLoading(false);
                    }
                  }}
                >
                  {cfoLoading ? 'Thinking…' : 'Ask'}
                </button>
              </div>
              {cfoAnswer && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{cfoAnswer}</div>
              )}
            </section>

            {/* Disclaimer */}
            <p className="text-xs leading-relaxed text-slate-400">{result.disclaimer}</p>
          </div>
        )}
      </main>
    </div>
  );
}
