import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { buildManagementMemo } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';
import { dispatchAlerts } from '../services/alertNotifier.js';

export const memoRouter = Router();

memoRouter.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        companyName: z.string().default('Company'),
        current: z.object({
          label: z.string(),
          fiscalYear: z.number(),
          incomeStatement: z.record(z.any()),
          balanceSheet: z.record(z.any()),
          cashFlow: z.record(z.any()),
        }),
        dataQuality: z.number().optional(),
        dispatchWebhook: z.boolean().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, undefined, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') return res.status(422).json(result);

    const intel = result.intelligence;
    const memo = buildManagementMemo({
      companyName: body.companyName,
      periodLabel: body.current.label,
      health: intel.analysis.health,
      survival: intel.analysis.survival,
      ratios: intel.analysis.ratios,
      alerts: intel.analysis.alerts || [],
      topFindings: (intel.findings || []).map((f: any) => f.title),
      topActions: (intel.recommendations || []).map((r: any) => r.action),
    });

    let webhook: unknown = null;
    if (body.dispatchWebhook) {
      webhook = await dispatchAlerts(
        (intel.analysis.alerts || []).map((a: any) => ({
          ...a,
          companyName: body.companyName,
        }))
      );
    }

    res.type('text/plain').send(
      webhook ? memo + `\n\n---\nWebhook dispatch: ${JSON.stringify(webhook)}` : memo
    );
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
