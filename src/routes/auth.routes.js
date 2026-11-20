const express = require('express');
const {
  register,
  login,
  getProfile,
  getVendors,
  approveVendor,
  rejectVendor,
  getUsers,
  createChecker,
  getCheckers,
  deleteChecker
} = require('../controllers/auth.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

const router = express.Router();

// Public Auth Endpoints with Zod Validation
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/profile', verifyToken, getProfile);

// Admin User & Customer Management Endpoint
router.get('/users', verifyToken, authorizeRoles('admin'), getUsers);

// Admin Vendor Approval Management Endpoints
router.get('/vendors', verifyToken, authorizeRoles('admin'), getVendors);
router.patch('/vendors/:id/approve', verifyToken, authorizeRoles('admin'), approveVendor);
router.patch('/vendors/:id/reject', verifyToken, authorizeRoles('admin'), rejectVendor);

// Product Checker Management Endpoints
router.post('/checkers', verifyToken, authorizeRoles('admin'), createChecker);
router.get('/checkers', getCheckers);
router.delete('/checkers/:id', verifyToken, authorizeRoles('admin'), deleteChecker);

module.exports = router;
