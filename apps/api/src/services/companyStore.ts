/**
 * In-memory company workspace store (Prisma-ready shape).
 * Replace with Prisma persistence when DATABASE_URL is configured.
 */

export interface CompanyRecord {
  id: string;
  organizationId: string;
  name: string;
  industry?: string;
  country?: string;
  reportingCurrency: string;
  createdAt: string;
  updatedAt: string;
  latestProfile?: {
    healthScore?: number;
    classification?: string;
    survival12m?: number;
    runwayMonths?: number;
    failureRisk?: string;
    dataQuality?: number;
    analyzedAt?: string;
  };
}

export interface AnalysisSnapshot {
  id: string;
  companyId: string;
  createdAt: string;
  payload: unknown;
}

const companies = new Map<string, CompanyRecord>();
const snapshots = new Map<string, AnalysisSnapshot[]>();

function cuid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createCompany(input: {
  name: string;
  organizationId?: string;
  industry?: string;
  country?: string;
  reportingCurrency?: string;
}): CompanyRecord {
  const now = new Date().toISOString();
  const rec: CompanyRecord = {
    id: cuid(),
    organizationId: input.organizationId || 'org_default',
    name: input.name,
    industry: input.industry,
    country: input.country,
    reportingCurrency: input.reportingCurrency || 'USD',
    createdAt: now,
    updatedAt: now,
  };
  companies.set(rec.id, rec);
  snapshots.set(rec.id, []);
  return rec;
}

export function listCompanies(organizationId?: string): CompanyRecord[] {
  const all = Array.from(companies.values());
  if (!organizationId) return all;
  return all.filter((c) => c.organizationId === organizationId);
}

export function getCompany(id: string): CompanyRecord | undefined {
  return companies.get(id);
}

export function updateCompanyProfile(
  companyId: string,
  profile: CompanyRecord['latestProfile']
): CompanyRecord | undefined {
  const c = companies.get(companyId);
  if (!c) return undefined;
  c.latestProfile = profile;
  c.updatedAt = new Date().toISOString();
  companies.set(companyId, c);
  return c;
}

export function saveSnapshot(companyId: string, payload: unknown): AnalysisSnapshot {
  const snap: AnalysisSnapshot = {
    id: cuid(),
    companyId,
    createdAt: new Date().toISOString(),
    payload,
  };
  const list = snapshots.get(companyId) || [];
  list.unshift(snap);
  snapshots.set(companyId, list.slice(0, 50)); // retain last 50
  return snap;
}

export function listSnapshots(companyId: string): AnalysisSnapshot[] {
  return snapshots.get(companyId) || [];
}

export function compareSnapshots(companyId: string): {
  latest?: AnalysisSnapshot;
  previous?: AnalysisSnapshot;
  deltas?: Record<string, { from: unknown; to: unknown }>;
} {
  const list = snapshots.get(companyId) || [];
  if (list.length === 0) return {};
  const latest = list[0];
  const previous = list[1];
  if (!previous) return { latest };

  const l = latest.payload as any;
  const p = previous.payload as any;
  const deltas: Record<string, { from: unknown; to: unknown }> = {};

  const paths = [
    ['healthScore', () => l?.intelligence?.analysis?.health?.overallScore, () => p?.intelligence?.analysis?.health?.overallScore],
    ['survival12m', () => l?.intelligence?.analysis?.survival?.survivalProbability12m, () => p?.intelligence?.analysis?.survival?.survivalProbability12m],
    ['runwayMonths', () => l?.intelligence?.analysis?.survival?.runwayMonthsBase, () => p?.intelligence?.analysis?.survival?.runwayMonthsBase],
    ['failureRisk', () => l?.intelligence?.analysis?.survival?.failureRisk, () => p?.intelligence?.analysis?.survival?.failureRisk],
  ] as const;

  for (const [key, getL, getP] of paths) {
    const to = getL();
    const from = getP();
    if (from !== to) deltas[key] = { from, to };
  }

  return { latest, previous, deltas };
}
