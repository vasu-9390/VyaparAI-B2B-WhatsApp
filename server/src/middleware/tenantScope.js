import { AppError } from './errorHandler.js';

/**
 * Tenant Scoping Middleware
 * Enforces organization boundary on all queries and mutations
 */
export function tenantScope(req, res, next) {
  if (!req.user || !req.user.organizationId) {
    return next(new AppError('No organization context detected in session', 403, 'TENANT_CONTEXT_MISSING'));
  }

  // Inject standard organization filter for queries
  req.tenantFilter = { organizationId: req.user.organizationId };

  // If request contains body, ensure organizationId cannot be spoofed to another tenant
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body.organizationId = req.user.organizationId;
  }

  next();
}
