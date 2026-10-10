import { Router } from 'express';
import {
  createBuyRequest,
  createBuyRequestSchema
} from '../controllers/requestController';
import { protect, requireVerified } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { requestLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protected: Verified students can submit purchase requests
router.post(
  '/',
  requestLimiter,
  protect,
  requireVerified,
  validateBody(createBuyRequestSchema),
  createBuyRequest
);

export default router;
