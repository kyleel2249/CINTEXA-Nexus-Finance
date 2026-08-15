export function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'red' | 'amber' | 'blue';
}) {
  const accentClass =
    accent === 'green'
      ? 'border-l-emerald-500'
      : accent === 'red'
        ? 'border-l-red-500'
        : accent === 'amber'
          ? 'border-l-amber-500'
          : 'border-l-blue-500';
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accentClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
