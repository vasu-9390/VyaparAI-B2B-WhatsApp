import { AuthService } from '../services/auth/authService.js';
import { User } from '../models/User.js';
import { AppError } from './errorHandler.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Ensure user still exists and is active in database
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new AppError('User session expired or user deactivated', 401, 'UNAUTHORIZED');
    }

    // Attach user and organization context to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId.toString(),
    };

    req.organizationId = user.organizationId;

    next();
  } catch (error) {
    next(error);
  }
}
