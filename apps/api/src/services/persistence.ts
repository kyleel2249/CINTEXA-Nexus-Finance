/**
 * Dual-mode persistence: Prisma when DATABASE_URL + USE_PRISMA=true, else in-memory.
 */

import {
  createCompany as memCreate,
  listCompanies as memList,
  getCompany as memGet,
  updateCompanyProfile as memUpdate,
  saveSnapshot as memSave,
  listSnapshots as memListSnaps,
  compareSnapshots as memCompare,
  type CompanyRecord,
  type AnalysisSnapshot,
} from './companyStore.js';
import {
  getPrisma,
  prismaCreateCompany,
  prismaListCompanies,
  prismaGetCompany,
  prismaUpdateProfile,
  prismaSaveSnapshot,
  prismaListSnapshots,
} from './prismaCompanyRepo.js';

export function isPrismaEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.USE_PRISMA === 'true');
}

async function createCompany(input: Parameters<typeof memCreate>[0]): Promise<CompanyRecord> {
  if (isPrismaEnabled()) {
    const row = await prismaCreateCompany(input);
    if (row) return row;
  }
  return memCreate(input);
}

async function listCompanies(organizationId?: string): Promise<CompanyRecord[]> {
  if (isPrismaEnabled()) {
    const rows = await prismaListCompanies(organizationId);
    if (rows) return rows;
  }
  return memList(organizationId);
}

async function getCompany(id: string): Promise<CompanyRecord | undefined> {
  if (isPrismaEnabled()) {
    const row = await prismaGetCompany(id);
    if (row) return row;
  }
  return memGet(id);
}

async function updateCompanyProfile(
  companyId: string,
  profile: CompanyRecord['latestProfile']
): Promise<CompanyRecord | undefined> {
  if (isPrismaEnabled()) {
    const row = await prismaUpdateProfile(companyId, profile);
    if (row) return row;
  }
  return memUpdate(companyId, profile);
}

async function saveSnapshot(companyId: string, payload: unknown): Promise<AnalysisSnapshot> {
  if (isPrismaEnabled()) {
    const row = await prismaSaveSnapshot(companyId, payload);
    if (row) return row;
  }
  return memSave(companyId, payload);
}

async function listSnapshots(companyId: string): Promise<AnalysisSnapshot[]> {
  if (isPrismaEnabled()) {
    const rows = await prismaListSnapshots(companyId);
    if (rows) return rows;
  }
  return memListSnaps(companyId);
}

async function compareSnapshots(companyId: string) {
  // Prefer memory compare when both snapshots are memory; for Prisma, derive from list
  if (isPrismaEnabled()) {
    const snaps = await listSnapshots(companyId);
    if (snaps.length === 0) return {};
    const latest = snaps[0];
    const previous = snaps[1];
    if (!previous) return { latest };
    const l = latest.payload as any;
    const p = previous.payload as any;
    const deltas: Record<string, { from: unknown; to: unknown }> = {};
    const pairs: Array<[string, () => unknown, () => unknown]> = [
      ['healthScore', () => l?.intelligence?.analysis?.health?.overallScore ?? l?.healthScore, () => p?.intelligence?.analysis?.health?.overallScore ?? p?.healthScore],
      ['survival12m', () => l?.intelligence?.analysis?.survival?.survivalProbability12m ?? l?.survivalProbability12m, () => p?.intelligence?.analysis?.survival?.survivalProbability12m ?? p?.survivalProbability12m],
      ['runwayMonths', () => l?.intelligence?.analysis?.survival?.runwayMonthsBase ?? l?.runwayMonths, () => p?.intelligence?.analysis?.survival?.runwayMonthsBase ?? p?.runwayMonths],
      ['failureRisk', () => l?.intelligence?.analysis?.survival?.failureRisk ?? l?.failureRisk, () => p?.intelligence?.analysis?.survival?.failureRisk ?? p?.failureRisk],
    ];
    for (const [key, getL, getP] of pairs) {
      const to = getL();
      const from = getP();
      if (from !== to) deltas[key] = { from, to };
    }
    return { latest, previous, deltas };
  }
  return memCompare(companyId);
}

export const persistence = {
  mode: () => (isPrismaEnabled() ? 'prisma' : 'memory'),
  createCompany,
  listCompanies,
  getCompany,
  updateCompanyProfile,
  saveSnapshot,
  listSnapshots,
  compareSnapshots,
  getPrisma,
};

export type { CompanyRecord, AnalysisSnapshot };
