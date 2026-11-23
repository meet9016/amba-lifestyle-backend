const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  approveProduct,
  rejectProduct,
  deleteProduct,
  clearAllProducts
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

// Clear all products (reset catalog)
router.delete('/clear-all', verifyToken, authorizeRoles('admin'), clearAllProducts);

// Update / Edit product
router.put('/:id', verifyToken, authorizeRoles('admin', 'vendor'), updateProduct);
router.patch('/:id', verifyToken, authorizeRoles('admin', 'vendor'), updateProduct);

// Delete product
router.delete('/:id', verifyToken, authorizeRoles('admin', 'vendor'), deleteProduct);

module.exports = router;
