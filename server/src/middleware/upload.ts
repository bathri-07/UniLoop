import multer from 'multer';
import { Request } from 'express';

// Multer memory storage configuration (AGENTS.md § 2.2 & docs/architecture.md § 2)
const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, and WebP images are permitted.'));
  }
};

export const uploadListingImages = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file ceiling
    files: 5 // Maximum 5 files
  },
  fileFilter
}).array('images', 5);
