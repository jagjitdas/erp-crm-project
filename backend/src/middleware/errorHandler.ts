import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

// Catches all errors forwarded via next(err) or thrown in asyncHandler-wrapped routes,
// and returns a consistent JSON error shape with the correct HTTP status code.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Known, intentional API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details ?? undefined,
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // Prisma known request errors (unique constraint, not found, FK violation, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: `A record with this ${(err.meta?.target as string[])?.join(', ') || 'value'} already exists`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Invalid reference to a related record' });
    }
    return res.status(400).json({ success: false, message: 'Database request error', code: err.code });
  }

  // Fallback: unexpected error
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}
