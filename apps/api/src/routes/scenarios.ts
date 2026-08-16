import { Router } from 'express';
import { z } from 'zod';
import { runScenario, type FinancialPeriodData } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';

export const scenariosRouter = Router();

const schema = z.object({
  current: z.object({
    label: z.string(),
    fiscalYear: z.number(),
    incomeStatement: z.record(z.any()),
    balanceSheet: z.record(z.any()),
    cashFlow: z.record(z.any()),
  }),
  name: z.string().default('Custom'),
  assumptions: z
    .object({
      revenueChangePct: z.number().optional(),
      grossMarginChangePct: z.number().optional(),
      opexChangePct: z.number().optional(),
      payrollChangePct: z.number().optional(),
      costReductionPct: z.number().optional(),
      interestRateChangePct: z.number().optional(),
      debtRepaymentDelayMonths: z.number().optional(),
      newInvestment: z.number().optional(),
      assetSaleProceeds: z.number().optional(),
    })
    .default({}),
  months: z.number().int().min(3).max(60).default(24),
});

scenariosRouter.post('/what-if', (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const result = runScenario(
      body.current as unknown as FinancialPeriodData,
      body.name,
      'CUSTOM',
      body.assumptions,
      body.months
    );
    res.json({
      status: 'OK',
      scenario: result,
      disclaimer:
        'Scenario results are analytical estimates under stated assumptions only. They are not forecasts or guarantees.',
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; '), 'VALIDATION') : err);
  }
});
