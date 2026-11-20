const Product = require('../models/product.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// In-memory data store for live session fallback
let IN_MEMORY_PRODUCTS = [];

// Get products with status filters
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const { status, approvalStatus, vendor, category, search, all } = req.query;
    const userRole = req.headers['x-user-role'] || req.user?.role;
    const isAdmin = userRole === 'admin';
    const isVendor = userRole === 'vendor';

    // Database query first if connected
    if (require('mongoose').connection.readyState === 1) {
      try {
        const dbQuery = {};
        if (category && category !== 'All') dbQuery.category = category;
        if (vendor) {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(vendor)) {
            dbQuery.$or = [{ vendor: vendor }, { vendor: new mongoose.Types.ObjectId(vendor) }, { vendor: String(vendor) }];
          } else {
            dbQuery.vendor = vendor;
          }
        }
        if (search) dbQuery.title = { $regex: search, $options: 'i' };

        if (approvalStatus && approvalStatus !== 'all') {
          dbQuery.approvalStatus = approvalStatus;
        } else if (status && status !== 'all') {
          dbQuery.status = status;
        } else if (!isAdmin && !isVendor && all !== 'true') {
          // Public storefront only sees approved products
          dbQuery.approvalStatus = 'approved';
        }

        const total = await Product.countDocuments(dbQuery);
        const products = await Product.find(dbQuery)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        return ApiResponse.paginated(res, 'Products retrieved successfully', products, {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        });
      } catch (err) {
        console.error('Error fetching products from DB:', err.message);
        // Fallback to in-memory store
      }
    }

    // Filter in-memory products
    let filtered = [...IN_MEMORY_PRODUCTS];

    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (vendor) {
      filtered = filtered.filter(p => String(p.vendor) === String(vendor));
    }

    if (search) {
      filtered = filtered.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
    }

    if (approvalStatus && approvalStatus !== 'all') {
      filtered = filtered.filter(p => p.approvalStatus === approvalStatus);
    } else if (status && status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    } else if (!isAdmin && !isVendor && all !== 'true') {
      // Default for storefront: only show approved products
      filtered = filtered.filter(p => p.approvalStatus === 'approved');
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return ApiResponse.paginated(res, 'Products retrieved successfully', paginated, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    next(error);
  }
};

// Get single product by id
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try DB first
    try {
      const dbProduct = await Product.findById(id);
      if (dbProduct) {
        return ApiResponse.success(res, 'Product found', dbProduct);
      }
    } catch (_) {}

    // Find in memory
    const product = IN_MEMORY_PRODUCTS.find(p => String(p._id) === String(id));
    if (!product) {
      return next(ApiError.notFound('Product not found'));
    }

    return ApiResponse.success(res, 'Product found', product);
  } catch (error) {
    next(error);
  }
};

// Create product (Vendor action)
const createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      category,
      subCategory,
      stock,
      images,
      vendorName,
      tierPricing,
      specifications
    } = req.body;

    const newProductData = {
      title,
      description: description || title,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : 0,
      category,
      subCategory: subCategory || 'Handcrafted',
      stock: Number(stock) || 10,
      images: Array.isArray(images) && images.length > 0 ? images : (req.body.imageUrl ? [req.body.imageUrl] : []),
      vendor: req.user?._id || req.user?.id || req.body.vendor || req.headers['x-user-id'] || 'vendor',
      vendorName: vendorName || req.user?.storeName || req.user?.name || req.body.vendorName || req.headers['x-user-name'] || 'Vendor Partner',
      status: 'pending_approval',
      approvalStatus: 'pending',
      tierPricing: tierPricing || [
        { minQty: 1, maxQty: 5, price: Number(price) },
        { minQty: 6, price: Math.round(Number(price) * 0.85) }
      ],
      specifications: specifications || {},
      rating: 5.0,
      numReviews: 0
    };

    let savedProduct = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        savedProduct = await Product.create(newProductData);
      } catch (dbErr) {
        console.error('MongoDB Product.create error:', dbErr);
        return next(ApiError.badRequest(dbErr.message));
      }
    }

    const finalProduct = savedProduct ? savedProduct.toObject() : {
      ...newProductData,
      _id: `prod-${Date.now()}`,
      createdAt: new Date()
    };

    // Save to in-memory store
    IN_MEMORY_PRODUCTS.unshift(finalProduct);

    return ApiResponse.created(res, 'Product submitted successfully. It will be visible on storefront after Admin approval.', finalProduct);
  } catch (error) {
    next(error);
  }
};

// Approve product (Admin action)
const approveProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    let updatedDoc = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        updatedDoc = await Product.findByIdAndUpdate(
          id,
          {
            approvalStatus: 'approved',
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: req.user?.email || req.headers['x-user-email'] || 'admin@ambalifestyle.com',
            rejectionReason: ''
          },
          { new: true }
        );
      } catch (err) {
        console.error('DB error approving product:', err.message);
      }
    }

    // Update in-memory
    const product = IN_MEMORY_PRODUCTS.find(p => String(p._id) === String(id));
    if (product) {
      product.approvalStatus = 'approved';
      product.status = 'approved';
      product.approvedAt = new Date();
      product.approvedBy = req.user?.email || 'admin@ambalifestyle.com';
      product.rejectionReason = '';
    }

    const result = updatedDoc ? updatedDoc.toObject() : (product || { _id: id, approvalStatus: 'approved' });

    return ApiResponse.success(res, 'Product approved successfully! It is now LIVE on the customer storefront.', result);
  } catch (error) {
    next(error);
  }
};

// Reject product (Admin action)
const rejectProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Information incomplete or image quality inadequate' } = req.body;

    let updatedDoc = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        updatedDoc = await Product.findByIdAndUpdate(
          id,
          {
            approvalStatus: 'rejected',
            status: 'rejected',
            rejectionReason: reason
          },
          { new: true }
        );
      } catch (err) {
        console.error('DB error rejecting product:', err.message);
      }
    }

    // Update in-memory
    const product = IN_MEMORY_PRODUCTS.find(p => String(p._id) === String(id));
    if (product) {
      product.approvalStatus = 'rejected';
      product.status = 'rejected';
      product.rejectionReason = reason;
    }

    const result = updatedDoc ? updatedDoc.toObject() : (product || { _id: id, approvalStatus: 'rejected' });

    return ApiResponse.success(res, 'Product rejected.', result);
  } catch (error) {
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    IN_MEMORY_PRODUCTS = IN_MEMORY_PRODUCTS.filter(p => String(p._id) !== String(id));

    if (require('mongoose').connection.readyState === 1) {
      try {
        await Product.findByIdAndDelete(id);
      } catch (err) {
        console.error('DB error deleting product:', err.message);
      }
    }

    return ApiResponse.success(res, 'Product deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  approveProduct,
  rejectProduct,
  deleteProduct
};
