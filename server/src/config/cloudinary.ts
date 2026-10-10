import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

// Determine if real, working Cloudinary credentials are provided
export const isCloudinaryConfigured = (): boolean => {
  const name = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;

  if (!name || !key || !secret) return false;
  if (name === 'your_cloud_name' || name === 'demo_cloud' || name === 'uniloop_dev') return false;
  if (key === 'your_api_key' || key === '123456789012345') return false;

  return true;
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
}

export { cloudinary };
