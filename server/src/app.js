import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { sendError } from './utils/apiResponse.js';

const app = express();

// 1. Security headers
app.use(helmet());

// 2. Allowed frontend origins
const allowedOrigins = [
  'https://vyapar-ai-b2-b-whats-app.vercel.app',
  'https://vyapar-ai-b2-b-whats-app-git-main-vasu21.vercel.app',
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean);

// Remove duplicate origins.
const uniqueOrigins = [...new Set(allowedOrigins)];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header, such as server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    if (uniqueOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`CORS blocked origin: ${origin}`);

    return callback(
      new Error(`Origin ${origin} not allowed by CORS`)
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Hub-Signature-256',
  ],

  optionsSuccessStatus: 204,
};

// Register CORS before routes so preflight requests are handled.
app.use(cors(corsOptions));

// 3. Parse request bodies and cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Request logging
if (env.NODE_ENV !== 'test') {
  app.use(
    morgan(
      ':method :url :status :res[content-length] - :response-time ms'
    )
  );
}

// 5. API rate limiting
app.use('/api', apiLimiter);

// 6. Mount API routes
app.use('/api', apiRoutes);

// 7. Handle unknown routes
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: [${req.method}] ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
});

// 8. Centralized error handler
app.use(errorHandler);

export default app;