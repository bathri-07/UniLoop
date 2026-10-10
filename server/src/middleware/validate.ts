import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import mongoose from 'mongoose';

/**
 * Middleware to validate request body against a strict Zod schema.
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed for request payload',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Middleware to validate route parameter ObjectId format.
 */
export const validateObjectId = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid identifier format for parameter '${paramName}'`
      });
      return;
    }
    next();
  };
};
