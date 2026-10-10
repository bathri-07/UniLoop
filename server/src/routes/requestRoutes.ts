import { Router } from 'express';
import {
  createBuyRequest,
  createBuyRequestSchema,
  updateRequestStatus,
  updateRequestStatusSchema,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getIncomingRequests,
  getOutgoingRequests,
  getRequestById
} from '../controllers/requestController';
import { protect, requireVerified } from '../middleware/auth';
import { validateBody, validateObjectId } from '../middleware/validate';
import { requestLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protected feeds
router.get('/incoming', protect, getIncomingRequests);
router.get('/outgoing', protect, getOutgoingRequests);

// Creation
router.post(
  '/',
  requestLimiter,
  protect,
  requireVerified,
  validateBody(createBuyRequestSchema),
  createBuyRequest
);

// Detail query
router.get('/:id', protect, validateObjectId('id'), getRequestById);

// Unified status patch endpoint matching docs/api.md § 7.4
router.patch(
  '/:id/status',
  protect,
  requireVerified,
  validateObjectId('id'),
  validateBody(updateRequestStatusSchema),
  updateRequestStatus
);

// Semantic convenience endpoints
router.post(
  '/:id/accept',
  protect,
  requireVerified,
  validateObjectId('id'),
  acceptRequest
);

router.post(
  '/:id/reject',
  protect,
  requireVerified,
  validateObjectId('id'),
  rejectRequest
);

router.post(
  '/:id/cancel',
  protect,
  requireVerified,
  validateObjectId('id'),
  cancelRequest
);

export default router;
