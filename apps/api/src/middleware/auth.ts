/**
 * Auth & tenancy middleware stubs
 * Production: verify Firebase / JWT, load org membership, enforce RBAC.
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export type OrgRole = 'OWNER' | 'ADMIN' | 'CFO' | 'AUDITOR' | 'ANALYST' | 'VIEWER';

export interface AuthContext {
  userId: string;
  email?: string;
  organizationId: string;
  role: OrgRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Development passthrough — attaches a default analyst context.
 * Set REQUIRE_AUTH=true to enforce Authorization header presence.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const requireAuth = process.env.REQUIRE_AUTH === 'true';
  const header = req.header('authorization');

  if (!header) {
    if (requireAuth) {
      return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    }
    req.auth = {
      userId: 'dev_user',
      email: 'dev@cintexa.local',
      organizationId: 'org_default',
      role: 'ANALYST',
    };
    return next();
  }

  // Placeholder: parse Bearer token and resolve user/org
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) {
    return next(new AppError(401, 'Invalid authorization header', 'UNAUTHORIZED'));
  }

  req.auth = {
    userId: 'token_user',
    organizationId: req.header('x-organization-id') || 'org_default',
    role: (req.header('x-role') as OrgRole) || 'ANALYST',
  };
  next();
}

const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 1,
  ANALYST: 2,
  AUDITOR: 3,
  CFO: 4,
  ADMIN: 5,
  OWNER: 6,
};

export function requireRole(minRole: OrgRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    if (ROLE_RANK[req.auth.role] < ROLE_RANK[minRole]) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }
    next();
  };
}
