import { Router } from 'express';
import { listAudit, appendAudit } from '../services/auditTrail.js';
import { requireRole } from '../middleware/auth.js';

export const auditRouter = Router();

auditRouter.get('/', requireRole('AUDITOR'), (req, res) => {
  res.json({
    entries: listAudit(Number(req.query.limit) || 100),
    note: 'In-memory audit trail for this process lifetime. Prisma AuditLog used when USE_PRISMA=true on company create.',
  });
});

auditRouter.post('/event', (req, res) => {
  const { action, entityType, entityId, details } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });
  const entry = appendAudit({
    action,
    entityType,
    entityId,
    organizationId: req.auth?.organizationId,
    userId: req.auth?.userId,
    details,
  });
  res.status(201).json(entry);
});
