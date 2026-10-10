import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { College } from '../models/College';
import { env } from '../config/env';

// 1. Zod Validation Schemas - docs/security.md § 3.1
export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60).trim(),
    email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    collegeId: z.string().min(1, 'College ID is required'),
    phone: z
      .string()
      .regex(/^(?:\+91|91)?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number')
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required')
  })
  .strict();

/**
 * Generate a standard JWT Bearer token
 */
const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      college: user.college
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/v1/auth/register
 * Register a student account with institutional campus email domain validation.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, collegeId, phone } = req.body;

    // Validate collegeId format
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid college identifier format'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'A student account with this email address already exists.'
      });
      return;
    }

    // Fetch and validate college
    const college = await College.findById(collegeId);
    if (!college || !college.isActive) {
      res.status(400).json({
        success: false,
        message: 'Selected college is invalid or currently inactive'
      });
      return;
    }

    // Campus Email Domain Validation - AGENTS.md § 2.5 & docs/api.md § 3.1
    const emailParts = email.split('@');
    const domain = emailParts[1];

    if (!domain || !college.allowedEmailDomains.includes(domain)) {
      res.status(400).json({
        success: false,
        message: 'Email domain is not authorized for selected campus'
      });
      return;
    }

    // Secure Verification Token Generation (stored as SHA-256 hash)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiry

    // Create student account
    const user = await User.create({
      name,
      email,
      password,
      college: college._id,
      phone,
      role: 'student', // Never trust client-supplied role
      isSuspended: false, // Never trust client-supplied suspension state
      isVerified: false, // Always starts unverified
      verificationToken: hashedToken,
      verificationTokenExpires: tokenExpires
    });

    // In DEMO_MODE & Development, construct on-screen verification link for instant testing
    let verificationUrl: string | undefined;
    if (env.DEMO_MODE && env.NODE_ENV === 'development') {
      verificationUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your campus email.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          college: user.college,
          isVerified: user.isVerified,
          role: user.role
        },
        ...(verificationUrl ? { verificationUrl, rawToken } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/verify-email?token=<token>
 * Verify campus email token, enforce 1-time usage and expiry.
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawToken = req.query.token as string;

    if (!rawToken || typeof rawToken !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
      return;
    }

    // Hash token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: new Date() }
    }).select('+verificationToken +verificationTokenExpires');

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token.'
      });
      return;
    }

    // Mark verified and invalidate token (one-time use)
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Campus email successfully verified! You may now log in and trade.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 * Log in student, verify credentials, enforce suspension & verification gates.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Explicitly select password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid campus email or password'
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid campus email or password'
      });
      return;
    }

    // Suspension Gate - AGENTS.md § 2.5
    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact campus administration.'
      });
      return;
    }

    // Email Verification Gate
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Please verify your campus email before logging in.'
      });
      return;
    }

    const token = generateToken(user);

    // Prepare response user object without password
    const userObj = user.toObject();
    delete (userObj as any).password;
    delete (userObj as any).verificationToken;
    delete (userObj as any).verificationTokenExpires;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userObj
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * Return profile of currently authenticated student.
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const user = await User.findById(req.user._id).populate('college', 'name campusLocation pickupLocations');

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};
