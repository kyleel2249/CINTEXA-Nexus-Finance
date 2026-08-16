import { Router } from 'express';
import { z } from 'zod';
import {
  createCompany,
  listCompanies,
  getCompany,
  updateCompanyProfile,
  saveSnapshot,
  listSnapshots,
  compareSnapshots,
} from '../services/companyStore.js';
import { analyzeStructuredPeriod } from '../services/analysisService.js';
import { AppError } from '../middleware/errorHandler.js';

export const companiesRouter = Router();

companiesRouter.get('/', (req, res) => {
  const org = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
  res.json({ companies: listCompanies(org) });
});

companiesRouter.post('/', (req, res, next) => {
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
    const company = createCompany(body);
    res.status(201).json(company);
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});

companiesRouter.get('/:id', (req, res, next) => {
  const company = getCompany(req.params.id);
  if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
  res.json(company);
});

companiesRouter.get('/:id/snapshots', (req, res, next) => {
  const company = getCompany(req.params.id);
  if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
  res.json({ snapshots: listSnapshots(company.id) });
});

companiesRouter.get('/:id/compare', (req, res, next) => {
  const company = getCompany(req.params.id);
  if (!company) return next(new AppError(404, 'Company not found', 'NOT_FOUND'));
  res.json(compareSnapshots(company.id));
});

companiesRouter.post('/:id/analyze', (req, res, next) => {
  try {
    const company = getCompany(req.params.id);
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

    updateCompanyProfile(company.id, {
      healthScore: health?.overallScore,
      classification: health?.classification,
      survival12m: survival?.survivalProbability12m,
      runwayMonths: survival?.runwayMonthsBase,
      failureRisk: survival?.failureRisk,
      dataQuality: result.dataQualityScore,
      analyzedAt: new Date().toISOString(),
    });

    saveSnapshot(company.id, result);

    res.json({ company: getCompany(company.id), analysis: result });
  } catch (err) {
    next(err instanceof z.ZodError ? new AppError(400, err.errors.map((e) => e.message).join('; ')) : err);
  }
});
