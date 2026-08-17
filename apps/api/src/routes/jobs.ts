import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod, analyzeUploadedText } from '../services/analysisService.js';
import { enqueueAnalysisJob, getJob, listJobs } from '../services/jobQueue.js';
import { AppError } from '../middleware/errorHandler.js';

export const jobsRouter = Router();

jobsRouter.get('/', (_req, res) => {
  res.json({ jobs: listJobs() });
});

jobsRouter.get('/:id', (req, res, next) => {
  const job = getJob(req.params.id);
  if (!job) return next(new AppError(404, 'Job not found', 'NOT_FOUND'));
  res.json(job);
});

jobsRouter.post('/analyze-structured', (req, res, next) => {
  try {
    const body = z
      .object({
        current: z.object({
          label: z.string(),
          fiscalYear: z.number(),
          incomeStatement: z.record(z.any()),
          balanceSheet: z.record(z.any()),
          cashFlow: z.record(z.any()),
        }),
        prior: z.any().optional(),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const job = enqueueAnalysisJob('ANALYZE_STRUCTURED', body, async (onProgress) => {
      onProgress(20, 'Running financial engine');
      onProgress(50, 'Multi-agent panel');
      const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality ?? 80);
      onProgress(90, 'Finalizing');
      return result;
    });

    res.status(202).json({ jobId: job.id, status: job.status, poll: `/api/jobs/${job.id}` });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

jobsRouter.post('/analyze-text', (req, res, next) => {
  try {
    const body = z
      .object({
        filename: z.string(),
        textContent: z.string().min(10),
        companyName: z.string().optional(),
        fiscalYear: z.number().optional(),
      })
      .parse(req.body);

    const job = enqueueAnalysisJob('ANALYZE_TEXT', body, async (onProgress) => {
      onProgress(15, 'Classifying document');
      onProgress(40, 'Extracting fields');
      onProgress(70, 'Analysis + agents');
      return analyzeUploadedText(body);
    });

    res.status(202).json({ jobId: job.id, status: job.status, poll: `/api/jobs/${job.id}` });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
