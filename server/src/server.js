
import dns from 'node:dns';

// DNS workaround for MongoDB SRV lookup errors.
// Uses Cloudflare and Google public DNS resolvers.
dns.setServers(['1.1.1.1', '8.8.8.8']);

import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

let server;
let isShuttingDown = false;

async function bootstrap() {
  try {
    // 1. Establish MongoDB connection
    await connectDB();

    // 2. Start Express HTTP server only after DB connects
    server = app.listen(env.PORT, () => {
      logger.info(
        `🚀 VyaparAI Backend listening on port ${env.PORT} ` +
        `[Environment: ${env.NODE_ENV}]`
      );

      logger.info(
        `📡 API Health check available at: http://localhost:${env.PORT}/api/health`
      );
    });

    // 3. Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.warn(`Received ${signal}. Shutting down gracefully...`);

      if (server) {
        server.close(async (error) => {
          if (error) {
            logger.error('Error closing HTTP server', error);
          } else {
            logger.info('HTTP server closed');
          }

          try {
            await disconnectDB();
            logger.info('MongoDB disconnected successfully');
            process.exit(error ? 1 : 0);
          } catch (disconnectError) {
            logger.error(
              'Error disconnecting MongoDB',
              disconnectError
            );
            process.exit(1);
          }
        });
      } else {
        try {
          await disconnectDB();
        } catch (error) {
          logger.error('Error disconnecting MongoDB', error);
        }

        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal bootstrap error during server startup', error);
    process.exit(1);
  }
}

// Global unhandled error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection detected', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception detected', error);
  process.exit(1);
});

bootstrap();
