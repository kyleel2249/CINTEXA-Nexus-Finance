import { ScoreBadge } from './ScoreBadge';
import { RiskBadge } from './RiskBadge';
import { MetricCard } from './MetricCard';

/**
 * Boardroom mode — directors/investors/lenders focused view only.
 */
export function BoardroomView({
  companyLabel,
  health,
  survival,
  verdict,
  findings,
  recommendations,
}: {
  companyLabel: string;
  health: any;
  survival: any;
  verdict: any;
  findings: any[];
  recommendations: any[];
}) {
  const critical = (findings || []).filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'SEVERE' || f.severity === 'HIGH'
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-white shadow-lg">
        <div className="text-xs uppercase tracking-widest text-slate-400">Boardroom Briefing</div>
        <h2 className="mt-2 text-2xl font-semibold">{companyLabel}</h2>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <ScoreBadge score={health.overallScore} classification={health.classification} />
          <RiskBadge level={survival.failureRisk} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="12-Month Survival"
            value={`${survival.survivalProbability12m}%`}
            accent={survival.survivalProbability12m >= 70 ? 'green' : 'red'}
          />
          <MetricCard
            label="Runway"
            value={survival.runwayMonthsBase != null ? `${survival.runwayMonthsBase} mo` : 'N/A'}
            accent="amber"
          />
          <MetricCard label="Condition" value={verdict?.currentCondition || '—'} accent="blue" />
          <MetricCard
            label="Decisions Required"
            value={critical.length}
            sub="High / severe / critical items"
            accent={critical.length ? 'red' : 'green'}
          />
        </div>
        {verdict && (
          <div className="mt-6 space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-400">Why: </span>
              {verdict.why}
            </p>
            <p>
              <span className="text-slate-400">Management should: </span>
              {verdict.whatManagementShouldDo}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Critical Audit Findings</h3>
          <ul className="mt-3 space-y-3">
            {critical.length === 0 && (
              <li className="text-sm text-slate-500">No high-severity findings in this run.</li>
            )}
            {critical.slice(0, 6).map((f, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <RiskBadge level={f.severity} />
                  <span className="font-medium">{f.title}</span>
                </div>
                <p className="mt-1 text-slate-600">{f.finding}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Strategic Recommendations</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {(recommendations || []).slice(0, 5).map((r: any) => (
              <li key={r.id || r.problem}>
                <span className="font-medium">{r.problem}</span>
                <div className="text-slate-500">{r.action}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
