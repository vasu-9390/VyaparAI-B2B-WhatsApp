import jwt from 'jsonwebtoken';
import { User, USER_ROLES } from '../../models/User.js';
import { Organization } from '../../models/Organization.js';
import { AuditLog } from '../../models/AuditLog.js';
import { AppError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';

export const AuthService = {
  /**
   * Register a new business organization along with its initial Business Owner
   */
  async register({ orgName, slug, industry, gstin, ownerName, email, password, phone }) {
    // Check if slug or email is already taken
    const existingOrg = await Organization.findOne({ slug: slug.toLowerCase() });
    if (existingOrg) {
      throw new AppError('An organization with this business handle/slug already exists', 409, 'SLUG_TAKEN');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_TAKEN');
    }

    // 1. Create Organization
    const organization = await Organization.create({
      name: orgName,
      slug: slug.toLowerCase(),
      industry: industry || 'general_b2b',
      gstin: gstin || '',
      email: email.toLowerCase(),
      phone: phone || '',
    });

    // 2. Create Owner User
    const user = await User.create({
      organizationId: organization._id,
      name: ownerName,
      email: email.toLowerCase(),
      passwordHash: password, // Pre-save hook hashes this
      role: USER_ROLES.BUSINESS_OWNER,
      phone: phone || '',
    });

    // 3. Generate Auth Token
    const token = this.generateToken(user);

    // 4. Audit Log
    await AuditLog.create({
      organizationId: organization._id,
      actorId: user._id,
      actorEmail: user.email,
      action: 'ORGANIZATION_REGISTERED',
      entityType: 'Organization',
      entityId: organization._id.toString(),
      changes: { orgName, ownerName, email },
    });

    return {
      user: user.toSafeObject(),
      organization,
      token,
    };
  },

  /**
   * Login with email and password
   */
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact your administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Fetch organization details
    const organization = await Organization.findById(user.organizationId);
    if (!organization || organization.status === 'suspended') {
      throw new AppError('Organization account is suspended or not found', 403, 'ORGANIZATION_SUSPENDED');
    }

    const token = this.generateToken(user);

    return {
      user: user.toSafeObject(),
      organization,
      token,
    };
  },

  /**
   * Generate signed JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  },

  /**
   * Verify signed JWT token
   */
  verifyToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
  },

  /**
   * Set secure HttpOnly cookie on response
   */
  setAuthCookie(res, token) {
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  },

  /**
   * Clear auth cookie on logout
   */
  clearAuthCookie(res) {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });
  },
};
