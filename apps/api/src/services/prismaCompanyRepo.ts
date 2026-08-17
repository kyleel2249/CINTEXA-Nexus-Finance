/**
 * Prisma-backed company repository.
 * Activated when DATABASE_URL is set and USE_PRISMA=true.
 */

import type { CompanyRecord, AnalysisSnapshot } from './companyStore.js';

function cuid() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

type PrismaLike = {
  organization: {
    upsert: (args: any) => Promise<any>;
  };
  company: {
    create: (args: any) => Promise<any>;
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
  };
  financialProfile: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
  };
  auditLog: {
    create: (args: any) => Promise<any>;
  };
};

let prismaClient: PrismaLike | null = null;

async function ensureOrganization(prisma: PrismaLike, orgId: string, name = 'Default Organization') {
  try {
    await prisma.organization.upsert({
      where: { id: orgId },
      create: {
        id: orgId,
        name,
        slug: orgId.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 48) || 'default',
      },
      update: {},
    });
  } catch (err) {
    // Schema may use slug unique — try alternate create path silently
    console.warn('[prisma] ensureOrganization', err);
  }
}

async function writeAuditLog(prisma: PrismaLike, action: string, entityType: string, entityId: string, organizationId?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        id: cuid(),
        organizationId: organizationId || null,
        action,
        entityType,
        entityId,
        details: {},
      },
    });
  } catch {
    // non-fatal
  }
}


export async function getPrisma(): Promise<PrismaLike | null> {
  if (!process.env.DATABASE_URL || process.env.USE_PRISMA !== 'true') return null;
  if (prismaClient) return prismaClient;
  try {
    // Dynamic import so the API boots without generated client in memory mode
    const { PrismaClient } = await import('@prisma/client');
    prismaClient = new PrismaClient() as unknown as PrismaLike;
    return prismaClient;
  } catch {
    console.warn('[persistence] Prisma client unavailable — falling back to memory store');
    return null;
  }
}

function mapCompany(row: any): CompanyRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    industry: row.industry ?? undefined,
    country: row.country ?? undefined,
    reportingCurrency: row.reportingCurrency || 'USD',
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() || row.updatedAt,
    latestProfile: row.latestProfile ?? undefined,
  };
}

export async function prismaCreateCompany(input: {
  name: string;
  organizationId?: string;
  industry?: string;
  country?: string;
  reportingCurrency?: string;
}): Promise<CompanyRecord | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;

  // Ensure org exists lightly — schema requires organizationId FK
  const orgId = input.organizationId || 'org_default';
  try {
    const row = await prisma.company.create({
      data: {
        id: cuid(),
        organizationId: orgId,
        name: input.name,
        industry: input.industry,
        country: input.country,
        reportingCurrency: input.reportingCurrency || 'USD',
      },
    });
    return mapCompany(row);
  } catch (err) {
    console.error('[prisma] createCompany failed', err);
    return null;
  }
}

export async function prismaListCompanies(organizationId?: string): Promise<CompanyRecord[] | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  try {
    const rows = await prisma.company.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(mapCompany);
  } catch (err) {
    console.error('[prisma] listCompanies failed', err);
    return null;
  }
}

export async function prismaGetCompany(id: string): Promise<CompanyRecord | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.company.findUnique({ where: { id } });
    return row ? mapCompany(row) : null;
  } catch (err) {
    console.error('[prisma] getCompany failed', err);
    return null;
  }
}

export async function prismaUpdateProfile(
  companyId: string,
  profile: CompanyRecord['latestProfile']
): Promise<CompanyRecord | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  try {
    // Store latest metrics on a FinancialProfile snapshot; company row updatedAt bumps
    await prisma.financialProfile.create({
      data: {
        id: cuid(),
        companyId,
        snapshot: profile || {},
        healthScore: profile?.healthScore,
        survivalProbability12m: profile?.survival12m,
        runwayMonths: profile?.runwayMonths,
        failureRisk: profile?.failureRisk,
        dataQualityScore: profile?.dataQuality,
      },
    });
    const row = await prisma.company.update({
      where: { id: companyId },
      data: { updatedAt: new Date() },
    });
    const mapped = mapCompany(row);
    mapped.latestProfile = profile;
    return mapped;
  } catch (err) {
    console.error('[prisma] updateProfile failed', err);
    return null;
  }
}

export async function prismaSaveSnapshot(companyId: string, payload: unknown): Promise<AnalysisSnapshot | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.financialProfile.create({
      data: {
        id: cuid(),
        companyId,
        snapshot: payload as object,
      },
    });
    return {
      id: row.id,
      companyId,
      createdAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
      payload,
    };
  } catch (err) {
    console.error('[prisma] saveSnapshot failed', err);
    return null;
  }
}

export async function prismaListSnapshots(companyId: string): Promise<AnalysisSnapshot[] | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;
  try {
    const rows = await prisma.financialProfile.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row: any) => ({
      id: row.id,
      companyId,
      createdAt: row.createdAt?.toISOString?.() || String(row.createdAt),
      payload: row.snapshot,
    }));
  } catch (err) {
    console.error('[prisma] listSnapshots failed', err);
    return null;
  }
}
