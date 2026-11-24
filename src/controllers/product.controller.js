const Product = require('../models/product.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// In-memory data store for live session fallback
let IN_MEMORY_PRODUCTS = [];

// Get products with status filters
const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const { status, approvalStatus, vendor, category, search, all, company, companyName } = req.query;
    const targetCompany = (companyName || company || '').trim();
    const userRole = req.headers['x-user-role'] || req.user?.role;
    const isAdmin = userRole === 'admin';
    const isVendor = userRole === 'vendor';

    // Database query first if connected
    if (require('mongoose').connection.readyState === 1) {
      try {
        const dbQuery = {};
        if (category && category !== 'All' && category !== 'all') {
          dbQuery.category = { $regex: new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
        }
        if (targetCompany && targetCompany !== 'All' && targetCompany !== 'all') {
          dbQuery.$or = [
            { companyName: targetCompany },
            { vendorName: targetCompany },
            { companyName: { $regex: new RegExp(`^${targetCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { vendorName: { $regex: new RegExp(`^${targetCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
          ];
        }
        if (vendor) {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(vendor)) {
            dbQuery.$or = [{ vendor: vendor }, { vendor: new mongoose.Types.ObjectId(vendor) }, { vendor: String(vendor) }];
          } else {
            dbQuery.vendor = vendor;
          }
        }
        if (search) {
          const s = search.trim();
          const mongoose = require('mongoose');
          const searchConditions = [
            { title: { $regex: s, $options: 'i' } },
            { vendorName: { $regex: s, $options: 'i' } },
            { companyName: { $regex: s, $options: 'i' } },
            { category: { $regex: s, $options: 'i' } }
          ];
          if (mongoose.Types.ObjectId.isValid(s)) {
            searchConditions.push({ _id: new mongoose.Types.ObjectId(s) });
          }
          dbQuery.$or = searchConditions;
        }

        if (approvalStatus && approvalStatus !== 'all') {
          dbQuery.approvalStatus = approvalStatus;
          if (approvalStatus === 'approved') {
            dbQuery.status = { $ne: 'inactive' };
          }
        } else if (status && status !== 'all') {
          if (status === 'active') {
            dbQuery.approvalStatus = 'approved';
            dbQuery.status = { $ne: 'inactive' };
          } else if (status === 'inactive') {
            dbQuery.$or = [
              { status: 'inactive' },
              { approvalStatus: { $in: ['inactive', 'rejected', 'pending'] } }
            ];
          } else {
            dbQuery.status = status;
          }
        } else if (!isAdmin && !isVendor && all !== 'true') {
          // Public storefront only sees active & approved products
          dbQuery.approvalStatus = 'approved';
          dbQuery.status = { $ne: 'inactive' };
        }

        const total = await Product.countDocuments(dbQuery);
        const products = await Product.find(dbQuery)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });

        // Global stats for dashboard/admin metrics
        const allProductsCount = await Product.countDocuments({});
        const activeCount = await Product.countDocuments({
          approvalStatus: 'approved',
          status: { $ne: 'inactive' }
        });
        const inactiveCount = Math.max(0, allProductsCount - activeCount);

        // Fetch distinct companies
        let companiesList = [];
        try {
          const dbCompanies = await Product.distinct('companyName');
          const dbVendors = await Product.distinct('vendorName');
          companiesList = [...new Set([...dbCompanies, ...dbVendors].map(s => (s || '').trim()).filter(Boolean))];
        } catch (_) {}

        return res.status(200).json({
          success: true,
          message: 'Products retrieved successfully',
          data: products,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
          },
          stats: {
            total: allProductsCount,
            active: activeCount,
            inactive: inactiveCount
          },
          companies: companiesList
        });
      } catch (err) {
        console.error('Error fetching products from DB:', err.message);
        // Fallback to in-memory store
      }
    }

    // Filter in-memory products
    let filtered = [...IN_MEMORY_PRODUCTS];

    if (category && category !== 'All' && category !== 'all') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (targetCompany && targetCompany !== 'All' && targetCompany !== 'all') {
      const tc = targetCompany.toLowerCase();
      filtered = filtered.filter(p => (p.companyName || p.vendorName)?.toLowerCase() === tc);
    }

    if (vendor) {
      filtered = filtered.filter(p => String(p.vendor) === String(vendor));
    }

    if (search) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(s) ||
        p.vendorName?.toLowerCase().includes(s) ||
        p.companyName?.toLowerCase().includes(s) ||
        String(p._id || p.id).toLowerCase().includes(s)
      );
    }

    if (approvalStatus && approvalStatus !== 'all') {
      filtered = filtered.filter(p => p.approvalStatus === approvalStatus);
      if (approvalStatus === 'approved') {
        filtered = filtered.filter(p => p.status !== 'inactive');
      }
    } else if (status && status !== 'all') {
      if (status === 'active') {
        filtered = filtered.filter(p => p.approvalStatus === 'approved' && p.status !== 'inactive');
      } else if (status === 'inactive') {
        filtered = filtered.filter(p => p.approvalStatus !== 'approved' || p.status === 'inactive');
      } else {
        filtered = filtered.filter(p => p.status === status);
      }
    } else if (!isAdmin && !isVendor && all !== 'true') {
      // Default for storefront: only show active approved products
      filtered = filtered.filter(p => p.approvalStatus === 'approved' && p.status !== 'inactive');
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    const memTotal = IN_MEMORY_PRODUCTS.length;
    const memActive = IN_MEMORY_PRODUCTS.filter(p => p.approvalStatus === 'approved' && p.status !== 'inactive').length;
    const memInactive = Math.max(0, memTotal - memActive);

    const memCompanies = [...new Set(IN_MEMORY_PRODUCTS.map(p => (p.companyName || p.vendorName || '').trim()).filter(Boolean))];

    return res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      },
      stats: {
        total: memTotal,
        active: memActive,
        inactive: memInactive
      },
      companies: memCompanies
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

// Create product (Admin / Vendor action)
const createProduct = async (req, res, next) => {
  try {
    const title = (req.body.title || req.body.name || '').trim();
    const price = Number(req.body.price);
    const description = (req.body.description || title || 'Handcrafted artisan product').trim();
    const discountPrice = req.body.discountPrice ? Number(req.body.discountPrice) : 0;
    const category = (req.body.category || 'Handcrafted Products').trim();
    const subCategory = (req.body.subCategory || 'General').trim();
    const stock = Number(req.body.stock) || 10;
    
    const rawImages = req.body.images || (req.body.img ? [req.body.img] : req.body.imageUrl ? [req.body.imageUrl] : []);
    const images = Array.isArray(rawImages) && rawImages.length > 0 
      ? rawImages 
      : (typeof rawImages === 'string' && rawImages ? [rawImages] : ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80']);

    const isAdmin = req.user?.role === 'admin' || req.headers['x-user-role'] === 'admin';
    const companyName = (req.body.companyName || req.body.vendorName || req.user?.storeName || '').trim();

    const newProductData = {
      title,
      description,
      price,
      discountPrice,
      category,
      subCategory,
      stock,
      images,
      vendor: req.user?._id || req.user?.id || req.body.vendor || req.headers['x-user-id'] || 'admin',
      vendorName: companyName,
      companyName: companyName,
      status: isAdmin ? 'approved' : 'pending_approval',
      approvalStatus: isAdmin ? 'approved' : 'pending',
      approvedAt: isAdmin ? new Date() : undefined,
      approvedBy: isAdmin ? (req.user?.email || 'admin@ambalifestyle.com') : undefined,
      tierPricing: req.body.tierPricing || [
        { minQty: 1, maxQty: 5, price },
        { minQty: 6, price: Math.round(price * 0.85) }
      ],
      specifications: req.body.specifications || {},
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

    return ApiResponse.created(res, 'Product created successfully and published to catalog.', finalProduct);
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

// Update / Edit product (Admin action)
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const title = (req.body.title || req.body.name || '').trim();
    const price = req.body.price !== undefined ? Number(req.body.price) : undefined;
    const rawImages = req.body.images || (req.body.img ? [req.body.img] : req.body.imageUrl ? [req.body.imageUrl] : undefined);
    const images = rawImages ? (Array.isArray(rawImages) ? rawImages : [rawImages]) : undefined;
    const category = req.body.category;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (price !== undefined) updateFields.price = price;
    if (images && images.length > 0) updateFields.images = images;
    if (category) updateFields.category = category;
    if (req.body.companyName !== undefined || req.body.vendorName !== undefined) {
      const comp = (req.body.companyName || req.body.vendorName || '').trim();
      if (comp) {
        updateFields.companyName = comp;
        updateFields.vendorName = comp;
      }
    }
    if (req.body.stock !== undefined) updateFields.stock = Number(req.body.stock);
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    if (req.body.approvalStatus !== undefined) updateFields.approvalStatus = req.body.approvalStatus;
    if (req.body.isActive !== undefined) {
      const active = Boolean(req.body.isActive);
      updateFields.isActive = active;
      updateFields.status = active ? 'approved' : 'inactive';
      updateFields.approvalStatus = active ? 'approved' : 'inactive';
    }

    let updatedDoc = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        updatedDoc = await Product.findByIdAndUpdate(id, updateFields, { new: true });
      } catch (err) {
        console.error('DB error updating product:', err.message);
      }
    }

    // Update in-memory
    const memIndex = IN_MEMORY_PRODUCTS.findIndex(p => String(p._id) === String(id));
    if (memIndex !== -1) {
      IN_MEMORY_PRODUCTS[memIndex] = {
        ...IN_MEMORY_PRODUCTS[memIndex],
        ...updateFields
      };
    }

    const result = updatedDoc ? updatedDoc.toObject() : (IN_MEMORY_PRODUCTS[memIndex] || { _id: id, ...updateFields });

    return ApiResponse.success(res, 'Product updated successfully', result);
  } catch (error) {
    next(error);
  }
};

// Clear all products (Admin reset catalog)
const clearAllProducts = async (req, res, next) => {
  try {
    IN_MEMORY_PRODUCTS = [];
    if (require('mongoose').connection.readyState === 1) {
      try {
        await Product.deleteMany({});
      } catch (err) {
        console.error('DB error clearing products:', err.message);
      }
    }
    return ApiResponse.success(res, 'All products cleared from catalog', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  approveProduct,
  rejectProduct,
  deleteProduct,
  clearAllProducts
};
