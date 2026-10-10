import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { getDbStatus } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import collegeRoutes from './routes/collegeRoutes';
import productRoutes from './routes/productRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import requestRoutes from './routes/requestRoutes';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers (Helmet) - AGENTS.md § 2.1 & docs/security.md § 1.1
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows Cloudinary images
      contentSecurityPolicy: false // Allows Vite dev hot-reloading
    })
  );

  // 2. Strict CORS Origin Whitelisting - AGENTS.md § 2.1 & docs/security.md § 1.2
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy: Unauthorized origin'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // 3. Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting on API endpoints
  app.use('/api/v1', apiLimiter);

  // 5. Health Check Endpoint - Requirement for Phase 1 Definition of Done
  app.get('/api/v1/health', (req: Request, res: Response) => {
    const dbStatus = getDbStatus();
    res.status(200).json({
      success: true,
      message: 'UniLoop API is healthy and operational',
      data: {
        status: 'ok',
        service: 'UniLoop Campus Exchange Backend',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: dbStatus,
        environment: env.NODE_ENV,
        demoMode: env.DEMO_MODE
      }
    });
  });

  // 6. Application API Routes (Phases 2 & 3)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/colleges', collegeRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/upload', uploadRoutes);
  app.use('/api/v1/requests', requestRoutes);

  // 6. Handle 404 for undefined routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`
    });
  });

  // 7. Centralized Error Handler (must be mounted last)
  app.use(errorHandler);

  return app;
};
