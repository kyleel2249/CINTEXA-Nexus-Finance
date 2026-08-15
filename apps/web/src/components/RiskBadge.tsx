import clsx from 'clsx';

const COLORS: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700',
  MODERATE: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  SEVERE: 'bg-red-50 text-red-700',
  CRITICAL: 'bg-red-100 text-red-900 font-bold',
};

export function RiskBadge({ level }: { level: string }) {
  return (
    <span className={clsx('rounded px-2 py-0.5 text-xs font-medium uppercase', COLORS[level] || 'bg-slate-100')}>
      {level}
    </span>
  );
}
