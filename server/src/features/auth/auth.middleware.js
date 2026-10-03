import { verifyToken } from './token.service.js';
import { store } from '../../shared/database/store.js';

/**
 * Middleware: Verify Bearer Token and load authenticated user
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = store.getUserById(decoded._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};

/**
 * Middleware: Optional Auth (populates req.user if valid token present, doesn't reject if missing)
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = store.getUserById(decoded._id);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Gracefully ignore token errors for optional routes
  }
  next();
};

/**
 * Middleware: Require specified roles (e.g. requireRole('admin'))
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
};

export const requireAdmin = requireRole('admin');
