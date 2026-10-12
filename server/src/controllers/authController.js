import { AuthService } from '../services/auth/authService.js';
import { User, USER_ROLES } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const AuthController = {
  /**
   * POST /api/auth/register
   * Onboard a new business organization with an owner
   */
  async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      AuthService.setAuthCookie(res, result.token);

      return sendSuccess(
        res,
        {
          user: result.user,
          organization: result.organization,
          token: result.token,
        },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Authenticate user and issue JWT cookie & token
   */
  async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      AuthService.setAuthCookie(res, result.token);

      return sendSuccess(res, {
        user: result.user,
        organization: result.organization,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   * Invalidate session by clearing HttpOnly cookie
   */
  async logout(req, res, next) {
    try {
      AuthService.clearAuthCookie(res);
      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Return authenticated user profile and organization info
   */
  async getMe(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User profile not found', 404, 'NOT_FOUND');
      }

      const organization = await Organization.findById(user.organizationId);

      return sendSuccess(res, {
        user: user.toSafeObject(),
        organization,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/users
   * Business Owner creates a team member (Sales Rep, Sales Manager, Inventory Manager)
   */
  async createUser(req, res, next) {
    try {
      const { name, email, password, role, phone } = req.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw new AppError('A user with this email address already exists', 409, 'EMAIL_TAKEN');
      }

      const newUser = await User.create({
        organizationId: req.user.organizationId,
        name,
        email: email.toLowerCase(),
        passwordHash: password,
        role: role || USER_ROLES.SALES_REP,
        phone: phone || '',
      });

      await AuditLog.create({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'TEAM_MEMBER_CREATED',
        entityType: 'User',
        entityId: newUser._id.toString(),
        changes: { name, email, role },
      });

      return sendSuccess(res, { user: newUser.toSafeObject() }, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/users
   * List all team members within the current organization
   */
  async listUsers(req, res, next) {
    try {
      const users = await User.find({ organizationId: req.user.organizationId })
        .select('-passwordHash')
        .sort({ createdAt: -1 });

      return sendSuccess(res, { users });
    } catch (error) {
      next(error);
    }
  },
};
