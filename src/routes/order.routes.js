const express = require('express');
const {
  getOrders,
  getOrderById,
  createOrder,
  assignVendor,
  updateVendorProgress,
  submitQualityInspection
} = require('../controllers/order.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, createOrder);
router.patch('/:id/assign-vendor', verifyToken, authorizeRoles('admin'), assignVendor);
router.patch('/:id/vendor-progress', verifyToken, authorizeRoles('vendor', 'admin'), updateVendorProgress);
router.patch('/:id/inspection', verifyToken, authorizeRoles('admin', 'checker'), submitQualityInspection);

module.exports = router;
