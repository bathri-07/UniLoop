import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadImages } from '../controllers/uploadController';
import { protect, requireVerified } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { uploadListingImages } from '../middleware/upload';

const router = Router();

// Wrapper to format Multer exceptions into the uniform API error envelope
const handleMulterUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadListingImages(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Each image must not exceed 5 MB.'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 images permitted.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

router.post(
  '/images',
  protect,
  requireVerified,
  uploadLimiter,
  handleMulterUpload,
  uploadImages
);

export default router;
