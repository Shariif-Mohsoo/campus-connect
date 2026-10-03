import jwt from 'jsonwebtoken';
import { config } from '../../shared/config/env.js';

/**
 * Generate signed JWT for authenticated user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      category: user.category || null,
      department: user.department
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

/**
 * Verify JWT token string
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};
