/**
 * In-memory async job queue for document processing / long analyses.
 * Production: replace with Redis/BullMQ or cloud queue.
 */

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobRecord {
  id: string;
  type: string;
  status: JobStatus;
  progress: number; // 0-100
  message?: string;
  input?: unknown;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const jobs = new Map<string, JobRecord>();

function id() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createJob(type: string, input?: unknown): JobRecord {
  const now = new Date().toISOString();
  const job: JobRecord = {
    id: id(),
    type,
    status: 'QUEUED',
    progress: 0,
    input,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, patch: Partial<JobRecord>): JobRecord | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  if (patch.status === 'COMPLETED' || patch.status === 'FAILED') {
    job.completedAt = new Date().toISOString();
  }
  jobs.set(jobId, job);
  return job;
}

export function listJobs(limit = 50): JobRecord[] {
  return Array.from(jobs.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Run analysis job asynchronously with progress checkpoints.
 */
export function enqueueAnalysisJob(
  type: string,
  input: unknown,
  runner: (onProgress: (pct: number, message: string) => void) => Promise<unknown>
): JobRecord {
  const job = createJob(type, input);

  setImmediate(async () => {
    updateJob(job.id, { status: 'PROCESSING', progress: 5, message: 'Started' });
    try {
      const result = await runner((pct, message) => {
        updateJob(job.id, { progress: Math.min(99, pct), message });
      });
      updateJob(job.id, { status: 'COMPLETED', progress: 100, message: 'Done', result });
    } catch (err: any) {
      updateJob(job.id, {
        status: 'FAILED',
        progress: 100,
        error: err?.message || 'Job failed',
        message: 'Failed',
      });
    }
  });

  return job;
}
