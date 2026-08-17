import { Router } from 'express';
import { z } from 'zod';
import { analyzeUploadedText, analyzeStructuredPeriod } from '../services/analysisService.js';
import { AppError } from '../middleware/errorHandler.js';
import { appendAudit } from '../services/auditTrail.js';

export const analyzeRouter = Router();

const textSchema = z.object({
  filename: z.string().min(1),
  textContent: z.string().min(10),
  companyName: z.string().optional(),
  fiscalYear: z.number().int().min(1990).max(2100).optional(),
});

const structuredSchema = z.object({
  current: z.object({
    label: z.string(),
    fiscalYear: z.number(),
    incomeStatement: z.record(z.any()),
    balanceSheet: z.record(z.any()),
    cashFlow: z.record(z.any()),
  }),
  prior: z.any().optional(),
  dataQuality: z.number().min(0).max(100).optional(),
});

analyzeRouter.post('/text', (req, res, next) => {
  try {
    const body = textSchema.parse(req.body);
    const result = analyzeUploadedText(body);
    appendAudit({
      action: 'ANALYZE_TEXT',
      entityType: 'Analysis',
      userId: (req as any).auth?.userId,
      organizationId: (req as any).auth?.organizationId,
      details: { filename: body.filename },
    });
    res.json(result);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; '), 'VALIDATION') : err);
  }
});

analyzeRouter.post('/structured', (req, res, next) => {
  try {
    const body = structuredSchema.parse(req.body);
    const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality);
    appendAudit({
      action: 'ANALYZE_STRUCTURED',
      entityType: 'Analysis',
      userId: (req as any).auth?.userId,
      organizationId: (req as any).auth?.organizationId,
      details: { period: body.current?.label },
    });
    res.json(result);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; '), 'VALIDATION') : err);
  }
});
