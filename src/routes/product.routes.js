const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  approveProduct,
  rejectProduct,
  deleteProduct
} = require('../controllers/product.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createProductSchema } = require('../validations/product.validation');

const router = express.Router();

// Public & filtered routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Vendor & Admin create product with Zod Validation
router.post('/', verifyToken, authorizeRoles('admin', 'vendor'), validate(createProductSchema), createProduct);

// Admin approval & rejection routes
router.patch('/:id/approve', verifyToken, authorizeRoles('admin'), approveProduct);
router.patch('/:id/reject', verifyToken, authorizeRoles('admin'), rejectProduct);

// Delete product
router.delete('/:id', verifyToken, authorizeRoles('admin', 'vendor'), deleteProduct);

module.exports = router;
