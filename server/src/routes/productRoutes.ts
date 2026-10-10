import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
  updateStatusSchema
} from '../controllers/productController';
import { protect, requireVerified } from '../middleware/auth';
import { validateBody, validateObjectId } from '../middleware/validate';

const router = Router();

// Public discovery endpoints
router.get('/', getProducts);
router.get('/:id', validateObjectId('id'), getProductById);

// Protected listing management endpoints
router.post('/', protect, requireVerified, validateBody(createProductSchema), createProduct);
router.put('/:id', protect, requireVerified, validateObjectId('id'), validateBody(updateProductSchema), updateProduct);
router.patch('/:id/status', protect, requireVerified, validateObjectId('id'), validateBody(updateStatusSchema), updateProductStatus);
router.delete('/:id', protect, requireVerified, validateObjectId('id'), deleteProduct);

export default router;
