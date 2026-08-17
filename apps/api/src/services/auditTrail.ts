export interface AuditTrailEntry {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  organizationId?: string;
  userId?: string;
  details?: unknown;
  createdAt: string;
}

const entries: AuditTrailEntry[] = [];

function id() {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function appendAudit(entry: Omit<AuditTrailEntry, 'id' | 'createdAt'>): AuditTrailEntry {
  const row: AuditTrailEntry = {
    id: id(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  entries.unshift(row);
  if (entries.length > 500) entries.length = 500;
  return row;
}

export function listAudit(limit = 100): AuditTrailEntry[] {
  return entries.slice(0, limit);
}
