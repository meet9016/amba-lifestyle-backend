const express = require('express');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const subcategoryRoutes = require('./subcategory.routes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Amba Lifestyle API',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);

module.exports = router;

