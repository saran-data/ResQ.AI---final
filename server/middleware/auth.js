import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verify JWT token middleware
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Extract token from "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database (without password)
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid - user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Token verification failed' });
  }
};

/**
 * Check if user has required role
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'admin';
    const resourceUserId = req.body[userIdField] || req.params[userIdField] || req.query[userIdField];
    const isOwner = resourceUserId && resourceUserId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied - insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional auth - adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next(); // No token, continue without user
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next(); // No token, continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Invalid token, continue without user
    next();
  }
};