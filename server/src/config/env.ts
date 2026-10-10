import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export interface AppEnv {
  PORT: number;
  NODE_ENV: string;
  CLIENT_URL: string;
  MONGO_URI: string;
  JWT_SECRET: string;
  DEMO_MODE: boolean;
  E2E_TEST: boolean;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

export const validateEnv = (): AppEnv => {
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/uniloop';
  const JWT_SECRET = process.env.JWT_SECRET || '';
  const DEMO_MODE = process.env.DEMO_MODE === 'true';
  const E2E_TEST = process.env.E2E_TEST === 'true';

  // Production Guardrail: Fail immediately if E2E_TEST is enabled in production mode
  if (NODE_ENV === 'production' && E2E_TEST) {
    const errorMsg = 'FATAL CONFIG ERROR: E2E_TEST cannot be enabled in production mode.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Defensive Guardrail: AGENTS.md § 2.4 - Fail immediately if JWT_SECRET is missing or < 32 characters
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    const errorMsg = 'FATAL CONFIG ERROR: JWT_SECRET environment variable is missing or insecure (must be at least 32 characters).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return {
    PORT,
    NODE_ENV,
    CLIENT_URL,
    MONGO_URI,
    JWT_SECRET,
    DEMO_MODE,
    E2E_TEST,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
  };
};

export const env = validateEnv();
