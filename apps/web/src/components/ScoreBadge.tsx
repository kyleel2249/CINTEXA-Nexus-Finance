import clsx from 'clsx';

const CLASS_COLORS: Record<string, string> = {
  EXCEPTIONAL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  HEALTHY: 'bg-green-100 text-green-800 border-green-300',
  STABLE_WATCH: 'bg-amber-100 text-amber-800 border-amber-300',
  FINANCIAL_PRESSURE: 'bg-orange-100 text-orange-800 border-orange-300',
  DISTRESSED: 'bg-red-100 text-red-800 border-red-300',
  CRITICAL: 'bg-red-200 text-red-900 border-red-400',
};

export function ScoreBadge({
  score,
  classification,
}: {
  score: number;
  classification: string;
}) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold',
        CLASS_COLORS[classification] || 'bg-slate-100 text-slate-700'
      )}
    >
      <span className="text-lg tabular-nums">{score.toFixed(0)}</span>
      <span className="opacity-80">/ 100</span>
      <span className="ml-1 border-l border-current/20 pl-2 text-xs uppercase tracking-wide">
        {classification.replace(/_/g, ' ')}
      </span>
    </div>
  );
}
