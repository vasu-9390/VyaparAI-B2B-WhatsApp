import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/apiResponse.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  logger.error(`Error processing request [${req.method} ${req.originalUrl}]`, err, {
    ip: req.ip,
    user: req.user ? req.user.id : null,
  });

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Request validation failed', 422, 'VALIDATION_ERROR', details);
  }

  // 2. Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return sendError(
      res,
      `A record with this ${field} (${value}) already exists.`,
      409,
      'DUPLICATE_KEY_ERROR',
      [{ field, value }]
    );
  }

  // 3. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, `Invalid format for resource identifier: ${err.value}`, 400, 'INVALID_ID');
  }

  // 4. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 'Database validation error', 422, 'DB_VALIDATION_ERROR', details);
  }

  // 5. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  // 6. Custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // 7. General Server Error (Default 500)
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'An unexpected internal server error occurred' : err.message;
  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
}
