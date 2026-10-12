
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

// 1. HTTP Security Headers
app.use(helmet());

// 2. CORS configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

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
  })
);

// 3. Body and Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(
    morgan(
      ':method :url :status :res[content-length] - :response-time ms'
    )
  );
}

// 5. Rate Limiting
app.use('/api', apiLimiter);

// 6. Mount API Routes
app.use('/api', apiRoutes);

// 7. 404 Not Found Handler
app.use((req, res) => {
  return sendError(
    res,
    `Route not found: [${req.method}] ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
});

// 8. Centralized Error Handler
app.use(errorHandler);

export default app;
