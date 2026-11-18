const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createCategorySchema,
  updateCategorySchema
} = require('../validations/category.validation');

const router = express.Router();

// Public read routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin protected write routes
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  validate(createCategorySchema),
  createCategory
);

router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  deleteCategory
);

module.exports = router;

