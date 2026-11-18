const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const ApiError = require('../utils/apiError');
const User = require('../models/user.model');

const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      // In development or when role header is explicitly passed (e.g. from internal portal)
      if (req.headers['x-user-role'] || process.env.NODE_ENV === 'development') {
        req.user = {
          _id: req.headers['x-user-id'] || 'vendor-store-101',
          name: req.headers['x-user-name'] || 'Jaipur Weaves Partner',
          email: req.headers['x-user-email'] || 'vendor@ambalifestyle.com',
          role: req.headers['x-user-role'] || 'vendor'
        };
        return next();
      }
      return next(ApiError.unauthorized('Authentication required. No token provided.'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attempt to fetch user if DB is connected
    try {
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
    } catch (_) {
      // Fallback to token payload if DB lookup fails or DB not connected
    }

    req.user = {
      _id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'customer'
    };

    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        _id: 'dev-user-id',
        role: req.headers['x-user-role'] || 'admin'
      };
      return next();
    }
    next(ApiError.unauthorized('Invalid or expired token.'));
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role (${req.user?.role || 'Guest'}) is not allowed to access this resource`));
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles
};
