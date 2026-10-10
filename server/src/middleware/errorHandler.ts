import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed for request payload',
      errors: formattedErrors
    });
    return;
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource identifier format'
    });
    return;
  }

  // Handle Mongoose duplicate key error (11000)
  if ((err as any).code === 11000) {
    const duplicateKey = Object.keys((err as any).keyPattern || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${duplicateKey} already exists`
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Pipeline]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors ? { errors: err.errors } : {})
  });
};
