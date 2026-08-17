import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function JobStatusPanel({
  current,
  onComplete,
}: {
  current: unknown;
  onComplete?: (result: unknown) => void;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    setError(null);
    setJob(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/analyze-structured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, dataQuality: 90 }),
      });
      if (!res.ok) throw new Error(`Enqueue failed (${res.status})`);
      const data = await res.json();
      setJobId(data.jobId);
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setJob(data);
        if (data.status === 'COMPLETED' && onComplete) onComplete(data.result);
        if (data.status === 'FAILED') setError(data.error || 'Job failed');
      } catch {
        /* ignore transient */
      }
    };
    tick();
    const iv = setInterval(tick, 800);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [jobId, onComplete]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Async Analysis Job</h3>
          <p className="text-sm text-slate-500">Queue a background run and poll progress (demo of production pipeline).</p>
        </div>
        <button
          onClick={start}
          disabled={starting || !current}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {starting ? 'Enqueueing…' : 'Run async job'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {job && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {job.status} {job.message ? `· ${job.message}` : ''}
            </span>
            <span>{job.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${job.progress || 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">Job ID: {job.id}</p>
        </div>
      )}
    </section>
  );
}
