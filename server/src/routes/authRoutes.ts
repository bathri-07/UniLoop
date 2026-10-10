import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  getMe,
  registerSchema,
  loginSchema
} from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { protect } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public auth endpoints
router.post('/register', validateBody(registerSchema), register);
router.get('/verify-email', verifyEmail);
router.post('/login', loginLimiter, validateBody(loginSchema), login);

// Protected auth endpoints
router.get('/me', protect, getMe);

export default router;
