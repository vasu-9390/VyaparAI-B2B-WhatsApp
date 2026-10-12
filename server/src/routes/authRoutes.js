import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, createUserSchema } from '../validators/authSchemas.js';
import { USER_ROLES } from '../models/User.js';

const router = Router();

// Public routes (Rate limited to avoid brute force)
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.getMe);

// Team member management (Scoped to tenant, only Business Owners and Sales Managers)
router.post(
  '/users',
  authenticate,
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER),
  validate(createUserSchema),
  AuthController.createUser
);

router.get(
  '/users',
  authenticate,
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BUSINESS_OWNER, USER_ROLES.SALES_MANAGER),
  AuthController.listUsers
);

export default router;
