import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  try {
    console.log('[UniLoop] Initializing backend application...');
    
    // Connect to database before accepting incoming requests
    await connectDB();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`[UniLoop] Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`[UniLoop] Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('[UniLoop] Shutting down gracefully...');
      server.close(() => {
        console.log('[UniLoop] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[UniLoop] Fatal error during startup:', error);
    process.exit(1);
  }
};

startServer();
