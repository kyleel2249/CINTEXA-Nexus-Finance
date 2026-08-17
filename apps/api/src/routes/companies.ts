import { Router } from 'express';
import { z } from 'zod';
import { persistence } from '../services/persistence.js';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { AppError } from '../middleware/errorHandler.js';
import { narrateMonitoringChange } from '@cintexa/ai-agents';

export const companiesRouter = Router();

companiesRouter.get('/', async (req, res, next) => {
  try {
    const org = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const companies = await persistence.listCompanies(org);
    res.json({ companies, persistenceMode: persistence.mode() });
  } catch (err) {
    next(err);
  }
});

companiesRouter.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1),
        organizationId: z.string().optional(),
        industry: z.string().optional(),
        country: z.string().optional(),
        reportingCurrency: z.string().optional(),
      })
      .parse(req.body);
    const company = await persistence.createCompany(body);
    res.status(201).json(company);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

companiesRouter.get('/:id', async (req, res, next) => {
  try {
    const company = await persistence.getCompany(req.params.id);
    if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
    res.json(company);
  } catch (err) {
    next(err);
  }
});

companiesRouter.get('/:id/snapshots', async (req, res, next) => {
  try {
    const company = await persistence.getCompany(req.params.id);
    if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
    const snapshots = await persistence.listSnapshots(company.id);
    res.json({ snapshots });
  } catch (err) {
    next(err);
  }
});

companiesRouter.get('/:id/compare', async (req, res, next) => {
  try {
    const company = await persistence.getCompany(req.params.id);
    if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
    const comparison = await persistence.compareSnapshots(company.id);
    const latest = comparison.latest as any;
    const previous = comparison.previous as any;
    const pick = (snap: any) => {
      if (!snap?.payload) return undefined;
      const payload = snap.payload;
      const intel = payload.intelligence || payload;
      return {
        healthScore: intel?.analysis?.health?.overallScore ?? payload?.healthScore,
        survival12m: intel?.analysis?.survival?.survivalProbability12m,
        runwayMonths: intel?.analysis?.survival?.runwayMonthsBase,
        failureRisk: intel?.analysis?.survival?.failureRisk,
        findingTitles: (intel?.findings || []).map((f: any) => f.title),
      };
    };
    const monitoring = narrateMonitoringChange({
      previous: pick(previous),
      current: pick(latest) || {},
    });
    res.json({ ...comparison, monitoring });
  } catch (err) {
    next(err);
  }
});

companiesRouter.post('/:id/analyze', async (req, res, next) => {
  try {
    const company = await persistence.getCompany(req.params.id);
    if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));

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
        dataQuality: z.number().min(0).max(100).optional(),
      })
      .parse(req.body);

    const result = analyzeStructuredPeriod(body.current as any, body.prior, body.dataQuality ?? 80);
    const health = (result as any).intelligence?.analysis?.health;
    const survival = (result as any).intelligence?.analysis?.survival;

    await persistence.updateCompanyProfile(company.id, {
      healthScore: health?.overallScore,
      classification: health?.classification,
      survival12m: survival?.survivalProbability12m,
      runwayMonths: survival?.runwayMonthsBase,
      failureRisk: survival?.failureRisk,
      dataQuality: result.dataQualityScore,
      analyzedAt: new Date().toISOString(),
    });

    await persistence.saveSnapshot(company.id, result);

    const updated = await persistence.getCompany(company.id);
    res.json({ company: updated, analysis: result, persistenceMode: persistence.mode() });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
