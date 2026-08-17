import { Router } from 'express';
import { z } from 'zod';
import { compareToBenchmarks } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';

export const benchmarksRouter = Router();

benchmarksRouter.post('/compare', (req, res, next) => {
  try {
    const body = z
      .object({
        industry: z.string().optional(),
        region: z.string().optional(),
        metrics: z.array(z.object({ metric: z.string(), companyValue: z.number().nullable() })),
        externalBenchmarks: z
          .array(
            z.object({
              metric: z.string(),
              industryMedian: z.number(),
              topQuartile: z.number().optional(),
              bottomQuartile: z.number().optional(),
              source: z.string(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const report = compareToBenchmarks(body);
    res.json({
      ...report,
      disclaimer:
        report.status === 'NOT_VERIFIED'
          ? 'Industry comparison is not verified for this run. Provide Tier 1–3 benchmark inputs to enable peer context.'
          : 'Benchmark comparisons reflect supplied external data only.',
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
