/**
 * Visual survival timeline / runway clock
 */

const MARKERS = [3, 6, 12, 18, 24, 36] as const;

function riskAtMonth(
  month: number,
  runwayBase: number | null,
  survival12: number | null
): 'ok' | 'watch' | 'danger' {
  if (runwayBase == null) return 'watch';
  if (month > runwayBase) return 'danger';
  if (runwayBase - month <= 3) return 'watch';
  if (survival12 != null && survival12 < 50 && month >= 12) return 'danger';
  if (survival12 != null && survival12 < 70 && month >= 12) return 'watch';
  return 'ok';
}

const COLORS = {
  ok: 'bg-emerald-500',
  watch: 'bg-amber-400',
  danger: 'bg-red-500',
};

export function SurvivalClock({
  runwayMonthsBase,
  survivalProbability12m,
}: {
  runwayMonthsBase: number | null;
  survivalProbability12m: number | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">Survival Clock</h3>
      <p className="mt-1 text-sm text-slate-500">
        Base-case runway overlay on a forward timeline. Analytical estimate only — not a prediction of failure.
      </p>
      <div className="mt-6 flex items-end gap-1 sm:gap-2">
        <div className="flex flex-col items-center">
          <div className="h-10 w-3 rounded-t bg-blue-600" title="Today" />
          <span className="mt-2 text-[10px] font-medium uppercase text-slate-500">Today</span>
        </div>
        {MARKERS.map((m) => {
          const risk = riskAtMonth(m, runwayMonthsBase, survivalProbability12m);
          return (
            <div key={m} className="flex flex-1 flex-col items-center">
              <div className={`h-10 w-full max-w-[48px] rounded-t ${COLORS[risk]}`} title={`${m} months — ${risk}`} />
              <span className="mt-2 text-[10px] font-medium text-slate-500">{m}m</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Within runway
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Approaching constraint
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Beyond base runway / elevated risk
        </span>
      </div>
      {runwayMonthsBase != null && (
        <p className="mt-3 text-sm text-slate-600">
          Estimated base-case runway: <strong>{runwayMonthsBase} months</strong>
          {survivalProbability12m != null && (
            <> · 12-month survival estimate: <strong>{survivalProbability12m}%</strong></>
          )}
        </p>
      )}
    </section>
  );
}
