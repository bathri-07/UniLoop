import rateLimit from 'express-rate-limit';

// Standard rate limit envelope response matching docs/api.md
const rateLimitResponse = (message: string) => ({
  success: false,
  message
});

/**
 * Production Guardrail & Dedicated E2E Test Process Guardrail:
 * - Rate limit bypass is strictly prohibited in production, regardless of any
 *   environment flags or request headers.
 * - Rate-limit bypass is disabled by default in all environments.
 * - Only activates when the backend process is explicitly launched with
 *   process.env.E2E_TEST = 'true' (or NODE_ENV = 'test') in non-production.
 * - Request headers are NEVER inspected for bypass authorization, preventing
 *   any header spoofing by unauthorized callers.
 */
export const isRateLimitBypassed = (): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.E2E_TEST === 'true' || process.env.NODE_ENV === 'test';
};

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitBypassed(),
  message: rateLimitResponse('Too many requests from this IP, please try again after 15 minutes.')
});

// Auth Login Limiter: Max 10 attempts per 15 mins (AGENTS.md § 2.2)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitBypassed(),
  message: rateLimitResponse('Too many login attempts. Please try again after 15 minutes.')
});

// Buy Requests Limiter: Max 30 requests per 15 mins
export const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitBypassed(),
  message: rateLimitResponse('Too many purchase requests submitted. Please slow down.')
});

// Upload Limiter: Max 10 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitBypassed(),
  message: rateLimitResponse('Hourly image upload limit reached. Please wait before uploading more.')
});

// Handover PIN Verification Limiter: Max 5 attempts per 15 mins
export const handoverPinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isRateLimitBypassed(),
  message: rateLimitResponse('Too many failed PIN attempts. Handover is temporarily locked.')
});
