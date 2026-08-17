/**
 * CINTEXA Nexus Finance API
 * Production entrypoint — health, analysis, companies, scenarios
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { analyzeRouter } from './routes/analyze.js';
import { scenariosRouter } from './routes/scenarios.js';
import { companiesRouter } from './routes/companies.js';
import { reportsRouter } from './routes/reports.js';
import { cfoChatRouter } from './routes/cfoChat.js';
import { compareRouter } from './routes/compare.js';
import { perspectivesRouter } from './routes/perspectives.js';
import { memoRouter } from './routes/memo.js';
import { exportRouter } from './routes/export.js';
import { jobsRouter } from './routes/jobs.js';
import { auditRouter } from './routes/audit.js';
import { benchmarksRouter } from './routes/benchmarks.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyMiddleware } from './middleware/apiKey.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimitMiddleware);
app.use(apiKeyMiddleware);
app.use(authMiddleware);

app.use('/health', healthRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/cfo-chat', cfoChatRouter);
app.use('/api/compare', compareRouter);
app.use('/api/perspectives', perspectivesRouter);
app.use('/api/memo', memoRouter);
app.use('/api/export', exportRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/benchmarks', benchmarksRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'CINTEXA Nexus Finance API',
    description: 'Financial Health, Forensic Audit & Corporate Survival Intelligence',
    endpoints: {
      health: 'GET /health',
      analyzeText: 'POST /api/analyze/text',
      analyzeStructured: 'POST /api/analyze/structured',
      whatIf: 'POST /api/scenarios/what-if',
      companies: 'GET/POST /api/companies',
      companyAnalyze: 'POST /api/companies/:id/analyze',
      companySnapshots: 'GET /api/companies/:id/snapshots',
      companyCompare: 'GET /api/companies/:id/compare',
      reportMarkdown: 'POST /api/reports/markdown',
      cfoChat: 'POST /api/cfo-chat',
      comparePeriods: 'POST /api/compare/periods',
      perspectives: 'POST /api/perspectives',
      memo: 'POST /api/memo',
      exportRatiosCsv: 'POST /api/export/ratios.csv',
      exportComparisonCsv: 'POST /api/export/comparison.csv',
      jobs: 'GET /api/jobs, GET /api/jobs/:id',
      jobAnalyzeStructured: 'POST /api/jobs/analyze-structured',
      jobAnalyzeText: 'POST /api/jobs/analyze-text',
      audit: 'GET /api/audit',
      benchmarks: 'POST /api/benchmarks/compare',
    },
  });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`CINTEXA Nexus Finance API listening on :${PORT}`);
  });
}

export default app;
