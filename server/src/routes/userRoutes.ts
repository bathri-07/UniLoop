import { Router } from 'express';
import { getMyListings } from '../controllers/productController';
import { protect } from '../middleware/auth';

const router = Router();

// Protected user management endpoints
router.get('/me/listings', protect, getMyListings);

export default router;
