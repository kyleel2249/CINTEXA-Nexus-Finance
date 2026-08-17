import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { ratiosToCsv, comparePeriods, comparisonToCsv, type FinancialPeriodData } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';

export const exportRouter = Router();

const periodSchema = z.object({
  label: z.string(),
  fiscalYear: z.number(),
  incomeStatement: z.record(z.any()),
  balanceSheet: z.record(z.any()),
  cashFlow: z.record(z.any()),
});

exportRouter.post('/ratios.csv', (req, res, next) => {
  try {
    const body = z.object({ current: periodSchema, dataQuality: z.number().optional() }).parse(req.body);
    const result = analyzeStructuredPeriod(body.current as any, undefined, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') return res.status(422).json(result);
    const csv = ratiosToCsv(result.intelligence.analysis.ratios);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cintexa-ratios.csv"');
    res.send(csv);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

exportRouter.post('/comparison.csv', (req, res, next) => {
  try {
    const body = z.object({ periods: z.array(periodSchema).min(1).max(10) }).parse(req.body);
    const comparison = comparePeriods(body.periods as unknown as FinancialPeriodData[]);
    const csv = comparisonToCsv(comparison.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cintexa-comparison.csv"');
    res.send(csv);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
