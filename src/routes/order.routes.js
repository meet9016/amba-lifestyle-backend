const express = require('express');
const { getOrders, createOrder, updateOrderStatus } = require('../controllers/order.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verifyToken, getOrders);
router.post('/', verifyToken, createOrder);
router.patch('/:id/status', verifyToken, authorizeRoles('admin', 'vendor'), updateOrderStatus);

module.exports = router;

