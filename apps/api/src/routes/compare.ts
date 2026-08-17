import { Router } from 'express';
import { z } from 'zod';
import { comparePeriods, type FinancialPeriodData } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';

export const compareRouter = Router();

const periodSchema = z.object({
  label: z.string(),
  fiscalYear: z.number(),
  incomeStatement: z.record(z.any()),
  balanceSheet: z.record(z.any()),
  cashFlow: z.record(z.any()),
});

compareRouter.post('/periods', (req, res, next) => {
  try {
    const body = z
      .object({
        periods: z.array(periodSchema).min(1).max(10),
      })
      .parse(req.body);

    const result = comparePeriods(body.periods as unknown as FinancialPeriodData[]);
    res.json({
      status: 'OK',
      comparison: result,
      disclaimer:
        'Period comparisons are analytical. Trends depend on data completeness and consistent accounting policies across periods.',
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
