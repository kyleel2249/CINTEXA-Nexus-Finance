import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { buildPerspective, type Perspective } from '@cintexa/ai-agents';
import { AppError } from '../middleware/errorHandler.js';

export const perspectivesRouter = Router();

perspectivesRouter.post('/', (req, res, next) => {
  try {
    const body = z
      .object({
        perspective: z.enum(['INVESTOR', 'LENDER', 'BOARD', 'CFO', 'AUDITOR']),
        current: z.object({
          label: z.string(),
          fiscalYear: z.number(),
          incomeStatement: z.record(z.any()),
          balanceSheet: z.record(z.any()),
          cashFlow: z.record(z.any()),
        }),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, undefined, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') return res.status(422).json(result);

    const brief = buildPerspective(body.perspective as Perspective, result.intelligence);
    res.json({ status: 'OK', brief, disclaimer: result.disclaimer });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
