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
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '10mb' }));

app.use('/health', healthRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/reports', reportsRouter);

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
