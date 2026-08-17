/**
 * Simple in-memory rate limiter (per IP).
 * Production: use Redis-backed limiter.
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

const hits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX = Number(process.env.RATE_LIMIT_MAX || 120);

export function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (process.env.RATE_LIMIT_DISABLED === 'true') return next();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > MAX) {
    return next(new AppError(429, 'Rate limit exceeded', 'RATE_LIMITED'));
  }
  next();
}
