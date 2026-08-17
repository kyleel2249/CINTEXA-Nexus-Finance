/**
 * Dual-mode persistence: Prisma when DATABASE_URL is set, otherwise in-memory companyStore.
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
} from './companyStore.js';

export function isPrismaEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.USE_PRISMA === 'true');
}

/**
 * Company operations — currently memory-backed.
 * When USE_PRISMA=true and Prisma client is generated, swap implementations here.
 */
export const persistence = {
  mode: () => (isPrismaEnabled() ? 'prisma' : 'memory'),
  createCompany: memCreate,
  listCompanies: memList,
  getCompany: memGet,
  updateCompanyProfile: memUpdate,
  saveSnapshot: memSave,
  listSnapshots: memListSnaps,
  compareSnapshots: memCompare,
};

export type { CompanyRecord };
