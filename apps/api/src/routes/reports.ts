import { Router } from 'express';
import { z } from 'zod';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { reportToMarkdown, reportToHtml } from '@cintexa/financial-engine';
import { AppError } from '../middleware/errorHandler.js';
import { DISCLAIMER_FULL } from '@cintexa/shared';

export const reportsRouter = Router();

reportsRouter.post('/markdown', (req, res, next) => {
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
        prior: z.any().optional(),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') {
      return res.status(422).json(result);
    }

    const intel = result.intelligence;
    const markdown = reportToMarkdown({
      companyName: body.companyName,
      periodLabel: body.current.label,
      dataQuality: result.dataQualityScore,
      health: intel.analysis.health,
      survival: intel.analysis.survival,
      ratios: intel.analysis.ratios,
      distressModels: intel.analysis.distressModels,
      reconciliations: intel.analysis.reconciliations,
      findings: intel.findings,
      recommendations: intel.recommendations,
      actionPlans: intel.actionPlans,
      verdict: intel.verdict,
      scenarios: (intel.analysis.scenarios || []).map((s: any) => ({
        name: s.name,
        runwayMonths: s.runwayMonths,
        survivalProbability: s.survivalProbability,
      })),
      disclaimer: DISCLAIMER_FULL,
    });

    res.type('text/markdown').send(markdown);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

reportsRouter.post('/html', (req, res, next) => {
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
        prior: z.any().optional(),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') {
      return res.status(422).json(result);
    }

    const intel = result.intelligence;
    const html = reportToHtml({
      companyName: body.companyName,
      periodLabel: body.current.label,
      dataQuality: result.dataQualityScore,
      health: intel.analysis.health,
      survival: intel.analysis.survival,
      ratios: intel.analysis.ratios,
      distressModels: intel.analysis.distressModels,
      reconciliations: intel.analysis.reconciliations,
      findings: intel.findings,
      recommendations: intel.recommendations,
      actionPlans: intel.actionPlans,
      verdict: intel.verdict,
      scenarios: (intel.analysis.scenarios || []).map((s: any) => ({
        name: s.name,
        runwayMonths: s.runwayMonths,
        survivalProbability: s.survivalProbability,
      })),
      disclaimer: DISCLAIMER_FULL,
    });

    res.type('text/html').send(html);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

reportsRouter.post('/json', (req, res, next) => {
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
        prior: z.any().optional(),
        dataQuality: z.number().optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality ?? 80) as any;
    if (result.status !== 'OK') {
      return res.status(422).json(result);
    }

    res.json({
      companyName: body.companyName,
      periodLabel: body.current.label,
      generatedAt: new Date().toISOString(),
      dataQuality: result.dataQualityScore,
      intelligence: result.intelligence,
      disclaimer: DISCLAIMER_FULL,
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
