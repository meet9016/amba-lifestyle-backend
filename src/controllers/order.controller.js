const Order = require('../models/order.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Clean In-memory orders store (starts empty for end-to-end testing)
let memoryOrders = [];

// Get orders (filtered by role)
const getOrders = async (req, res, next) => {
  try {
    const role = req.user?.role || req.headers['x-user-role'] || 'admin';
    const userId = String(req.user?._id || req.headers['x-user-id'] || '');
    const userEmail = req.user?.email || req.headers['x-user-email'] || '';

    let dbOrders = [];
    try {
      const query = {};
      if (role === 'customer') {
        if (req.user?._id) query.$or = [{ customer: req.user._id }, { 'customerInfo.email': userEmail }];
      } else if (role === 'vendor') {
        query.$or = [{ assignedVendor: userId }, { 'items.vendor': userId }];
      } else if (role === 'checker') {
        query.$or = [
          { assignedChecker: userId },
          { assignedCheckerEmail: req.user?.email || userEmail },
          { orderStage: { $in: ['ready_for_inspection', 'under_inspection', 'quality_failed', 'quality_approved'] } }
        ];
      }
      dbOrders = await Order.find(query).sort({ createdAt: -1 });
    } catch (_) {
      dbOrders = [];
    }

    // Merge or fallback to memory orders
    let finalOrders = dbOrders.length > 0 ? dbOrders : memoryOrders;

    if (role === 'customer') {
      finalOrders = finalOrders.filter(
        o => o.customerInfo?.email === userEmail || String(o.customer) === userId
      );
    } else if (role === 'vendor') {
      finalOrders = finalOrders.filter(
        o => String(o.assignedVendor) === userId
      );
    } else if (role === 'checker') {
      finalOrders = finalOrders.filter(
        o => String(o.assignedChecker) === userId ||
             o.assignedCheckerEmail === (req.user?.email || userEmail) ||
             ['ready_for_inspection', 'under_inspection', 'quality_failed', 'quality_approved'].includes(o.orderStage)
      );
    }

    return ApiResponse.success(res, 'Orders retrieved successfully', finalOrders);
  } catch (error) {
    next(error);
  }
};

// Get single order by ID or orderNumber
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let order = null;
    try {
      order = await Order.findOne({
        $or: [{ _id: id }, { orderNumber: id }]
      });
    } catch (_) {}

    if (!order) {
      order = memoryOrders.find(o => o._id === id || o.orderNumber === id);
    }

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    return ApiResponse.success(res, 'Order details retrieved', order);
  } catch (error) {
    next(error);
  }
};

// Create bulk order from customer frontend
const createOrder = async (req, res, next) => {
  try {
    const {
      items,
      customerInfo,
      customRequirements,
      referenceImages,
      totalAmount
    } = req.body;

    const orderNumber = `AMB-ORD-${Date.now().toString().slice(-6)}`;

    const newOrderPayload = {
      orderNumber,
      customer: req.user?._id || null,
      customerInfo: customerInfo || {
        name: req.user?.name || 'Valued B2B Buyer',
        email: req.user?.email || 'buyer@enterprise.in',
        phone: req.user?.phone || '+91 98000 00000',
        company: 'Retail Partner'
      },
      items: items || [],
      customRequirements: customRequirements || '',
      referenceImages: referenceImages || [],
      assignedVendor: null,
      assignedVendorName: '',
      orderStage: 'pending_admin_review',
      orderStatus: 'pending',
      totalAmount: Number(totalAmount) || 0,
      inspectionReport: {
        status: 'pending',
        qualityCheckPassed: false,
        quantityVerified: false,
        specificationsMatched: false,
        defectNotes: '',
        inspectionPhotos: []
      },
      createdAt: new Date()
    };

    let created = null;
    try {
      created = await Order.create(newOrderPayload);
    } catch (_) {
      newOrderPayload._id = `ord-${Date.now()}`;
      created = newOrderPayload;
    }

    memoryOrders.unshift(created);

    return ApiResponse.created(res, 'Bulk order submitted successfully! It is now under Admin review.', created);
  } catch (error) {
    next(error);
  }
};

// Admin assigns order to a Vendor
const assignVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vendorId, vendorName } = req.body;

    if (!vendorId && !vendorName) {
      return next(ApiError.badRequest('Vendor details are required'));
    }

    const updates = {
      assignedVendor: vendorId,
      assignedVendorName: vendorName || 'Assigned Vendor Partner',
      assignedAt: new Date(),
      orderStage: 'assigned_to_vendor',
      orderStatus: 'processing'
    };

    let order = null;
    try {
      order = await Order.findByIdAndUpdate(id, updates, { new: true });
    } catch (_) {}

    const memIdx = memoryOrders.findIndex(o => o._id === id || o.orderNumber === id);
    if (memIdx !== -1) {
      memoryOrders[memIdx] = { ...memoryOrders[memIdx], ...updates };
      order = memoryOrders[memIdx];
    }

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    return ApiResponse.success(res, `Order assigned to vendor ${updates.assignedVendorName}`, order);
  } catch (error) {
    next(error);
  }
};

// Vendor updates progress: 'vendor_preparing' or passes to 'ready_for_inspection'
const updateVendorProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, notes, checkerId, checkerName, checkerEmail } = req.body;

    const validStages = ['vendor_preparing', 'ready_for_inspection'];
    if (!validStages.includes(stage)) {
      return next(ApiError.badRequest('Invalid stage for vendor update. Allowed: vendor_preparing, ready_for_inspection'));
    }

    const updates = {
      orderStage: stage,
      ...(notes ? { vendorCorrectionNotes: notes } : {}),
      ...(checkerId ? { assignedChecker: checkerId } : {}),
      ...(checkerName ? { assignedCheckerName: checkerName } : {}),
      ...(checkerEmail ? { assignedCheckerEmail: checkerEmail } : {}),
      ...(stage === 'ready_for_inspection' ? { passedToCheckerAt: new Date() } : {})
    };

    let order = null;
    try {
      order = await Order.findByIdAndUpdate(id, updates, { new: true });
    } catch (_) {}

    const memIdx = memoryOrders.findIndex(o => o._id === id || o.orderNumber === id);
    if (memIdx !== -1) {
      memoryOrders[memIdx] = { ...memoryOrders[memIdx], ...updates };
      order = memoryOrders[memIdx];
    }

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    const msg =
      stage === 'ready_for_inspection'
        ? 'Products marked ready and submitted to Product Checker for Quality Inspection!'
        : 'Order status updated to Manufacturing & Preparation.';

    return ApiResponse.success(res, msg, order);
  } catch (error) {
    next(error);
  }
};

// Product Checker conducts quality inspection & files report
const submitQualityInspection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      inspectorName,
      qualityCheckPassed,
      quantityVerified,
      specificationsMatched,
      defectNotes,
      inspectionPhotos,
      decision // 'pass' or 'fail'
    } = req.body;

    const isPass = decision === 'pass';
    const newStage = isPass ? 'quality_approved' : 'quality_failed';
    const inspectionReport = {
      inspectorName: inspectorName || req.user?.name || req.headers['x-user-name'] || 'Amba Quality Inspector',
      inspectedAt: new Date(),
      qualityCheckPassed: Boolean(qualityCheckPassed),
      quantityVerified: Boolean(quantityVerified),
      specificationsMatched: Boolean(specificationsMatched),
      defectNotes: defectNotes || '',
      inspectionPhotos: inspectionPhotos || [],
      status: isPass ? 'passed' : 'failed'
    };

    const updates = {
      orderStage: newStage,
      inspectionReport,
      orderStatus: isPass ? 'completed' : 'processing'
    };

    let order = null;
    try {
      order = await Order.findByIdAndUpdate(id, updates, { new: true });
    } catch (_) {}

    const memIdx = memoryOrders.findIndex(o => o._id === id || o.orderNumber === id);
    if (memIdx !== -1) {
      memoryOrders[memIdx] = { ...memoryOrders[memIdx], ...updates };
      order = memoryOrders[memIdx];
    }

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    const msg = isPass
      ? 'Quality Inspection PASSED. Product certified and approved!'
      : 'Quality Inspection FAILED. Order returned to vendor for correction.';

    return ApiResponse.success(res, msg, order);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  assignVendor,
  updateVendorProgress,
  submitQualityInspection
};
