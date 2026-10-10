import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';

interface JwtPayload {
  id: string;
  role: string;
  college: string;
}

/**
 * Middleware to protect routes and verify JWT authentication.
 * Reloads the user from MongoDB to enforce real-time suspension state.
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid Bearer token.'
      });
      return;
    }

    // Verify token validity
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Reload active user from database (do not trust stale payload claims)
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
      return;
    }

    // Account Suspension Gate - AGENTS.md § 2.5 & docs/security.md § 4.2
    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact campus administration.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.'
      });
      return;
    }
    next(error);
  }
};

/**
 * Middleware to enforce campus email verification before executing sensitive actions.
 */
export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.isVerified) {
    res.status(403).json({
      success: false,
      message: 'Please verify your campus email before performing this action.'
    });
    return;
  }
  next();
};
