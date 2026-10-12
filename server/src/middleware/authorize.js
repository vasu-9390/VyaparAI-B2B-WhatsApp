import { AppError } from './errorHandler.js';

/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles Roles that are permitted to access this endpoint
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required prior to authorization check', 401, 'UNAUTHORIZED'));
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Permission denied: role '${req.user.role}' is not authorized to perform this operation.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
