import { Request, Response, NextFunction } from 'express';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';

/**
 * POST /api/v1/upload/images
 * Upload listing images to Cloudinary via Multer memory buffer.
 */
export const uploadImages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one image file is required (form key: images)'
      });
      return;
    }

    if (files.length > 5) {
      res.status(400).json({
        success: false,
        message: 'A maximum of 5 images can be uploaded per listing'
      });
      return;
    }

    // Explicit Cloudinary Configuration Check - Prompt constraint
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        success: false,
        message:
          'Cloudinary image storage is not configured. Please supply valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env to enable live image uploads.'
      });
      return;
    }

    // Upload each buffer stream to Cloudinary
    const uploadPromises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'campus_exchange/listings',
            resource_type: 'image'
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Upload to Cloudinary failed'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(file.buffer);
      });
    });

    const urls = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: {
        images: urls
      }
    });
  } catch (error) {
    next(error);
  }
};
