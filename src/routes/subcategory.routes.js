const express = require('express');
const {
  getSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
} = require('../controllers/category.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createSubcategorySchema,
  updateSubcategorySchema
} = require('../validations/category.validation');

const router = express.Router();

// Public read routes
router.get('/', getSubcategories);
router.get('/:id', getSubcategoryById);

// Admin protected write routes
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  validate(createSubcategorySchema),
  createSubcategory
);

router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  validate(updateSubcategorySchema),
  updateSubcategory
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  deleteSubcategory
);

module.exports = router;

