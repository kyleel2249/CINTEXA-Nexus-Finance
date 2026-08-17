/**
 * Optional API key gate.
 * When API_KEY env is set, require header x-api-key (except /health and /).
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export function apiKeyMiddleware(req: Request, _res: Response, next: NextFunction) {
  const expected = process.env.API_KEY;
  if (!expected) return next();

  if (req.path === '/' || req.path === '/health' || req.path.startsWith('/health')) {
    return next();
  }

  const provided = req.header('x-api-key');
  if (!provided || provided !== expected) {
    return next(new AppError(401, 'Invalid or missing API key', 'UNAUTHORIZED'));
  }
  next();
}
