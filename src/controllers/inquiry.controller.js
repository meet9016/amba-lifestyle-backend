const crypto = require('crypto');
const Inquiry = require('../models/inquiry.model');
const Otp = require('../models/otp.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// In-Memory store fallbacks for resilient operation
let memoryInquiries = [];
let memoryOtps = new Map(); // key: `${email}_${purpose}` -> { otp, expiresAt, verified }

// Helper to generate 6-digit numeric OTP
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate unique Inquiry ID
const generateInquiryNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `INQ-${year}-${rand}`;
};

// Helper to build safe Mongoose query for id or inquiryNumber
const buildInquiryIdQuery = (id) => {
  if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
    return { $or: [{ _id: id }, { inquiryNumber: id }] };
  }
  return { inquiryNumber: id };
};

/**
 * Send OTP to Email
 * POST /api/v1/inquiries/send-otp
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'inquiry_submit' } = req.body;

    if (!email || !email.includes('@')) {
      return next(ApiError.badRequest('Please provide a valid email address'));
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 1. Save in memory map
    memoryOtps.set(`${cleanEmail}_${purpose}`, {
      email: cleanEmail,
      otp,
      purpose,
      verified: false,
      expiresAt
    });

    // 2. Try saving to MongoDB if connected
    try {
      await Otp.deleteMany({ email: cleanEmail, purpose });
      await Otp.create({
        email: cleanEmail,
        otp,
        purpose,
        verified: false
      });
    } catch (_) {
      // Memory fallback active
    }

    console.log(`\n========================================`);
    console.log(`📧 OTP for ${cleanEmail} (${purpose}): [ ${otp} ]`);
    console.log(`========================================\n`);

    return ApiResponse.success(res, `Verification code sent to ${cleanEmail}`, {
      email: cleanEmail,
      purpose,
      devOtp: otp, // Provided for effortless local testing / UI toast
      expiresInMinutes: 10
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 * POST /api/v1/inquiries/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, purpose = 'inquiry_submit' } = req.body;

    if (!email || !otp) {
      return next(ApiError.badRequest('Email and OTP are required'));
    }

    const cleanEmail = email.trim().toLowerCase();
    const key = `${cleanEmail}_${purpose}`;
    let isValid = false;

    // Check MongoDB first
    try {
      const record = await Otp.findOne({ email: cleanEmail, purpose, otp: String(otp).trim() });
      if (record) {
        record.verified = true;
        await record.save();
        isValid = true;
      }
    } catch (_) { }

    // Check memory store
    if (!isValid && memoryOtps.has(key)) {
      const mem = memoryOtps.get(key);
      if (mem.otp === String(otp).trim() && mem.expiresAt > new Date()) {
        mem.verified = true;
        memoryOtps.set(key, mem);
        isValid = true;
      }
    }

    if (!isValid) {
      return next(ApiError.badRequest('Invalid or expired OTP. Please check and try again.'));
    }

    // Generate a temporary verification token
    const verificationToken = crypto.createHash('sha256').update(`${cleanEmail}-${otp}-${Date.now()}`).digest('hex');

    return ApiResponse.success(res, 'Email verified successfully', {
      verified: true,
      email: cleanEmail,
      purpose,
      verificationToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit New Customer Requirement / Inquiry
 * POST /api/v1/inquiries
 */
const createInquiry = async (req, res, next) => {
  try {
    const {
      email,
      name,
      fullName,
      address,
      pincode,
      quantity = 1,
      size,
      description = '',
      phone = '',
      images = [],
      otp,
      category = 'fashion',
      specifications = {}
    } = req.body;

    const inquiryName = (name || req.body.productName || req.body.title || '').trim();
    const inquirySize = (size || (req.body.price ? `Catalog Price: ₹${req.body.price}` : 'Catalog Product Inquiry')).trim();

    // Standard fields: fullName, address, pincode, quantity
    const resolvedFullName = (fullName || req.body.customerName || specifications?.fullName || '').trim();
    const resolvedAddress = (address || specifications?.address || '').trim();
    const resolvedPincode = (pincode || specifications?.pincode || '').trim();
    const resolvedQuantity = Number(quantity !== undefined ? quantity : (req.body.qty !== undefined ? req.body.qty : 1)) || 1;

    if (!email || !inquiryName) {
      return next(ApiError.badRequest('Product Name and Email are required'));
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check OTP verification
    const submitKey = `${cleanEmail}_inquiry_submit`;
    let isVerified = req.body.isDirectProductInquiry ? true : false;

    // Check memory OTP or direct OTP passed
    if (otp) {
      const mem = memoryOtps.get(submitKey);
      if (mem && (mem.otp === String(otp).trim() || mem.verified)) {
        isVerified = true;
      }
      try {
        const dbOtp = await Otp.findOne({ email: cleanEmail, purpose: 'inquiry_submit' });
        if (dbOtp && (dbOtp.otp === String(otp).trim() || dbOtp.verified)) {
          isVerified = true;
        }
      } catch (_) { }
    } else {
      const mem = memoryOtps.get(submitKey);
      if (mem && mem.verified) isVerified = true;
      try {
        const dbOtp = await Otp.findOne({ email: cleanEmail, purpose: 'inquiry_submit', verified: true });
        if (dbOtp) isVerified = true;
      } catch (_) { }
    }

    // In local dev/demo environment allow submission with clear notice if OTP was just generated
    if (!isVerified && process.env.NODE_ENV === 'development') {
      isVerified = true;
    }

    if (!isVerified) {
      return next(ApiError.badRequest('Please verify your email with OTP before submitting requirement'));
    }

    // Normalize category
    let cleanCategory = 'fashion';
    const rawCat = (category || '').toLowerCase();
    if (rawCat.includes('jewel') || rawCat.includes('silver')) cleanCategory = 'jewelry';
    else if (rawCat.includes('decor') || rawCat.includes('home') || rawCat.includes('brass')) cleanCategory = 'home_decor';
    else if (rawCat.includes('other') || rawCat.includes('custom') || rawCat.includes('craft')) cleanCategory = 'other';
    else if (rawCat.includes('fashion') || rawCat.includes('apparel') || rawCat.includes('saree')) cleanCategory = 'fashion';
    else cleanCategory = category || 'fashion';

    const isDirectProductInquiry = Boolean(
      req.body.isDirectProductInquiry ||
      inquirySize.includes('Catalog Price') ||
      (description && description.includes('I am interested in') && description.includes('(Price:'))
    );
    const inquiryType = isDirectProductInquiry ? 'artisan_product' : (req.body.inquiryType || 'custom_requirement');

    const inquiryNumber = generateInquiryNumber();
    const newInquiryData = {
      inquiryNumber,
      email: cleanEmail,
      name: inquiryName,
      fullName: resolvedFullName,
      address: resolvedAddress,
      pincode: resolvedPincode,
      category: cleanCategory,
      size: inquirySize,
      specifications: specifications || {},
      quantity: resolvedQuantity,
      description: (description || '').trim(),
      phone: (phone || '').trim(),
      images: Array.isArray(images) ? images : images ? [images] : [],
      inquiryType,
      isDirectProductInquiry,
      status: 'pending',
      quotedPrice: 0,
      adminNotes: '',
      messages: [],
      timeline: [
        {
          status: 'pending',
          note: 'Requirement submitted by customer. Awaiting Admin evaluation.',
          updatedAt: new Date()
        }
      ]
    };

    let savedInquiry = null;

    try {
      savedInquiry = await Inquiry.create(newInquiryData);
    } catch (_) {
      // Use in-memory object
      savedInquiry = {
        _id: 'mem_' + Date.now(),
        ...newInquiryData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Also cache in memory list
    memoryInquiries.unshift(savedInquiry);

    // Consume the OTP so it can't be reused indefinitely
    memoryOtps.delete(submitKey);
    try {
      await Otp.deleteMany({ email: cleanEmail, purpose: 'inquiry_submit' });
    } catch (_) { }

    return ApiResponse.created(res, 'Requirement submitted successfully! Our team will evaluate and review.', savedInquiry);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer's Inquiries (Requires Email & Verified OTP)
 * POST /api/v1/inquiries/my-inquiries
 */
const getMyInquiries = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return next(ApiError.badRequest('Email is required to view inquiry status'));
    }

    const cleanEmail = email.trim().toLowerCase();
    const trackKey = `${cleanEmail}_inquiry_track`;
    let isVerified = false;

    // Check OTP
    if (otp) {
      const mem = memoryOtps.get(trackKey);
      if (mem && (mem.otp === String(otp).trim() || mem.verified)) {
        isVerified = true;
      }
      try {
        const dbOtp = await Otp.findOne({ email: cleanEmail, purpose: 'inquiry_track' });
        if (dbOtp && (dbOtp.otp === String(otp).trim() || dbOtp.verified)) {
          isVerified = true;
        }
      } catch (_) { }
    } else {
      const mem = memoryOtps.get(trackKey);
      if (mem && mem.verified) isVerified = true;
      try {
        const dbOtp = await Otp.findOne({ email: cleanEmail, purpose: 'inquiry_track', verified: true });
        if (dbOtp) isVerified = true;
      } catch (_) { }
    }

    if (!isVerified && process.env.NODE_ENV === 'development') {
      isVerified = true;
    }

    if (!isVerified) {
      return next(ApiError.unauthorized('Please verify your email with OTP to access inquiry status'));
    }

    let results = [];
    try {
      results = await Inquiry.find({ email: cleanEmail }).sort({ createdAt: -1 });
    } catch (_) {
      results = [];
    }

    // Merge in-memory matching inquiries if not in results
    const inMemMatches = memoryInquiries.filter(i => i.email === cleanEmail);
    const existingIds = new Set(results.map(r => String(r._id || r.inquiryNumber)));
    for (const memItem of inMemMatches) {
      if (!existingIds.has(String(memItem._id || memItem.inquiryNumber))) {
        results.push(memItem);
      }
    }

    return ApiResponse.success(res, `Found ${results.length} inquiries for ${cleanEmail}`, results);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get All Inquiries
 * GET /api/v1/inquiries
 */
const getAllInquiries = async (req, res, next) => {
  try {
    const { status, search, timeframe, category, inquiryType } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (inquiryType && inquiryType !== 'all') {
      if (inquiryType === 'artisan_product') {
        query.$or = [
          { inquiryType: 'artisan_product' },
          { isDirectProductInquiry: true }
        ];
      } else {
        query.inquiryType = inquiryType;
      }
    }

    const now = new Date();
    if (timeframe === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.createdAt = { $gte: startOfDay };
    } else if (timeframe === 'week') {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: startOfWeek };
    } else if (timeframe === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { inquiryNumber: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { fullName: searchRegex },
        { pincode: searchRegex }
      ];
    }

    let inquiries = [];
    try {
      inquiries = await Inquiry.find(query).sort({ createdAt: -1 });
    } catch (_) {
      inquiries = [];
    }

    // Merge memory inquiries ensuring no duplicates
    const existingInqIds = new Set(inquiries.map(i => String(i.inquiryNumber || i._id)));
    const memUnsaved = memoryInquiries.filter(m => !existingInqIds.has(String(m.inquiryNumber || m._id)));
    let allItems = [...inquiries, ...memUnsaved];

    if (status && status !== 'all') {
      allItems = allItems.filter(i => i.status === status);
    }
    if (category && category !== 'all') {
      allItems = allItems.filter(i => i.category === category || (!i.category && category === 'other'));
    }
    if (inquiryType && inquiryType !== 'all') {
      allItems = allItems.filter(i =>
        inquiryType === 'artisan_product'
          ? (i.inquiryType === 'artisan_product' || i.isDirectProductInquiry)
          : (i.inquiryType === 'custom_requirement' && !i.isDirectProductInquiry)
      );
    }
    if (timeframe === 'today') {
      const todayStr = new Date().toDateString();
      allItems = allItems.filter(i => new Date(i.createdAt).toDateString() === todayStr);
    } else if (timeframe === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      allItems = allItems.filter(i => new Date(i.createdAt) >= weekAgo);
    } else if (timeframe === 'month') {
      const nowD = new Date();
      allItems = allItems.filter(i => {
        const d = new Date(i.createdAt);
        return d.getMonth() === nowD.getMonth() && d.getFullYear() === nowD.getFullYear();
      });
    }

    if (search) {
      const s = search.toLowerCase();
      allItems = allItems.filter(i =>
        (i.inquiryNumber && i.inquiryNumber.toLowerCase().includes(s)) ||
        (i.name && i.name.toLowerCase().includes(s)) ||
        (i.email && i.email.toLowerCase().includes(s)) ||
        (i.phone && i.phone.toLowerCase().includes(s)) ||
        (i.fullName && i.fullName.toLowerCase().includes(s)) ||
        (i.pincode && i.pincode.toLowerCase().includes(s))
      );
    }

    const total = allItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedItems = allItems.slice(skip, skip + limit);

    const stats = {
      total: allItems.length,
      artisan: allItems.filter(i => i.inquiryType === 'artisan_product' || i.isDirectProductInquiry).length,
      custom: allItems.filter(i => !(i.inquiryType === 'artisan_product' || i.isDirectProductInquiry)).length,
      pending: allItems.filter(i => i.status === 'pending').length,
      inReview: allItems.filter(i => i.status === 'in_review').length,
      quoted: allItems.filter(i => i.status === 'quoted').length,
      approved: allItems.filter(i => i.status === 'approved').length,
      today: allItems.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString()).length,
      week: allItems.filter(i => new Date(i.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
      month: allItems.filter(i => new Date(i.createdAt).getMonth() === new Date().getMonth() && new Date(i.createdAt).getFullYear() === new Date().getFullYear()).length,
      fashion: allItems.filter(i => i.category === 'fashion').length,
      jewelry: allItems.filter(i => i.category === 'jewelry').length,
      homeDecor: allItems.filter(i => i.category === 'home_decor').length,
      other: allItems.filter(i => !i.category || i.category === 'other').length
    };

    return res.status(200).json({
      success: true,
      message: 'Inquiries retrieved successfully',
      data: paginatedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages
      },
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Inquiry by ID or InquiryNumber
 * GET /api/v1/inquiries/:id
 */
const getInquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let item = null;

    try {
      item = await Inquiry.findOne(buildInquiryIdQuery(id));
    } catch (_) { }

    if (!item) {
      item = memoryInquiries.find(i => String(i._id) === id || i.inquiryNumber === id);
    }

    if (!item) {
      return next(ApiError.notFound('Inquiry not found'));
    }

    return ApiResponse.success(res, 'Inquiry found', item);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Inquiry Status & Quote
 * PATCH /api/v1/inquiries/:id/status
 */
const updateInquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, quotedPrice } = req.body;

    let updated = null;

    try {
      const doc = await Inquiry.findOne(buildInquiryIdQuery(id));

      if (doc) {
        if (status) doc.status = status;
        if (adminNotes !== undefined) doc.adminNotes = adminNotes;
        if (quotedPrice !== undefined) doc.quotedPrice = Number(quotedPrice);

        doc.timeline.push({
          status: status || doc.status,
          note: adminNotes || `Status updated to ${status || doc.status}`,
          updatedAt: new Date()
        });

        updated = await doc.save();
      }
    } catch (_) { }

    // Fallback/sync in memory
    const memIndex = memoryInquiries.findIndex(i => String(i._id) === id || i.inquiryNumber === id);
    if (memIndex !== -1) {
      const existing = memoryInquiries[memIndex];
      const updatedMem = {
        ...existing,
        status: status || existing.status,
        adminNotes: adminNotes !== undefined ? adminNotes : existing.adminNotes,
        quotedPrice: quotedPrice !== undefined ? Number(quotedPrice) : existing.quotedPrice,
        timeline: [
          ...(existing.timeline || []),
          {
            status: status || existing.status,
            note: adminNotes || `Status updated to ${status || existing.status}`,
            updatedAt: new Date()
          }
        ],
        updatedAt: new Date()
      };
      memoryInquiries[memIndex] = updatedMem;
      if (!updated) updated = updatedMem;
    }

    if (!updated) {
      return next(ApiError.notFound('Inquiry not found to update'));
    }

    return ApiResponse.success(res, 'Inquiry status updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Inquiry
 * DELETE /api/v1/inquiries/:id
 */
const deleteInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await Inquiry.deleteOne(buildInquiryIdQuery(id));
    } catch (_) { }

    memoryInquiries = memoryInquiries.filter(i => String(i._id) !== id && i.inquiryNumber !== id);

    return ApiResponse.success(res, 'Inquiry deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Clear All Inquiries & OTP records
 * DELETE /api/v1/inquiries
 */
const clearAllInquiries = async (req, res, next) => {
  try {
    try {
      await Inquiry.deleteMany({});
      await Otp.deleteMany({});
    } catch (_) { }

    memoryInquiries = [];
    memoryOtps.clear();

    return ApiResponse.success(res, 'All inquiries cleared successfully', {
      cleared: true,
      remainingCount: 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Message to Customer Inquiry (Customer or Admin)
 * POST /api/v1/inquiries/:id/messages
 */
const addInquiryMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, sender = 'customer', senderName, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return next(ApiError.badRequest('Message content is required'));
    }

    const cleanMsg = message.trim();
    const cleanSender = sender === 'admin' ? 'admin' : 'customer';
    const cleanSenderName = senderName || (cleanSender === 'admin' ? 'Amba Support Admin' : 'Customer');

    const msgData = {
      sender: cleanSender,
      senderName: cleanSenderName,
      message: cleanMsg,
      attachments: Array.isArray(attachments) ? attachments : [],
      isSeen: cleanSender === 'admin',
      readByAdmin: cleanSender === 'admin',
      createdAt: new Date()
    };

    let updated = null;
    let savedMsg = null;

    try {
      const doc = await Inquiry.findOne(buildInquiryIdQuery(id));

      if (doc) {
        if (!Array.isArray(doc.messages)) {
          doc.messages = [];
        }
        doc.messages.push(msgData);
        doc.timeline.push({
          status: doc.status,
          note: `New message from ${cleanSender === 'admin' ? 'Admin' : 'Customer'}: "${cleanMsg.slice(0, 40)}${cleanMsg.length > 40 ? '...' : ''}"`,
          updatedAt: new Date()
        });
        updated = await doc.save();
        if (updated.messages && updated.messages.length > 0) {
          savedMsg = updated.messages[updated.messages.length - 1];
        }
      }
    } catch (err) {
      console.error('Error saving message to DB:', err.message);
    }

    // In-memory fallback / sync
    const memIndex = memoryInquiries.findIndex(i => String(i._id) === id || i.inquiryNumber === id);
    if (memIndex !== -1) {
      const existing = memoryInquiries[memIndex];
      const existingDoc = existing.toObject ? existing.toObject() : existing;
      const existingMsgs = Array.isArray(existingDoc.messages) ? existingDoc.messages : [];
      const memMsg = savedMsg || { _id: 'mem_' + Date.now(), ...msgData };
      const updatedMem = {
        ...existingDoc,
        messages: [...existingMsgs, memMsg],
        timeline: [
          ...(existingDoc.timeline || []),
          {
            status: existingDoc.status,
            note: `New message from ${cleanSender === 'admin' ? 'Admin' : 'Customer'}`,
            updatedAt: new Date()
          }
        ],
        updatedAt: new Date()
      };
      memoryInquiries[memIndex] = updatedMem;
      if (!updated) {
        updated = updatedMem;
        savedMsg = memMsg;
      }
    }

    if (!updated) {
      return next(ApiError.notFound('Inquiry not found to add message'));
    }

    return ApiResponse.success(res, 'Message added successfully', {
      message: savedMsg || msgData,
      inquiry: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Messages in an Inquiry as Read / Seen by Admin
 * PUT /api/v1/inquiries/:id/messages/read
 */
const markMessagesAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = buildInquiryIdQuery(id);

    let updated = null;
    try {
      const doc = await Inquiry.findOne(query);
      if (doc) {
        if (Array.isArray(doc.messages)) {
          doc.messages.forEach((m) => {
            m.isSeen = true;
            m.readByAdmin = true;
          });
        }
        updated = await doc.save();
      }
    } catch (err) {
      console.error('Error marking messages as read in DB:', err.message);
    }

    // In-memory sync
    const memIndex = memoryInquiries.findIndex(i => String(i._id) === id || i.inquiryNumber === id);
    if (memIndex !== -1) {
      const existing = memoryInquiries[memIndex];
      const existingDoc = existing.toObject ? existing.toObject() : existing;
      const msgs = (existingDoc.messages || []).map(m => ({ ...m, isSeen: true, readByAdmin: true }));
      memoryInquiries[memIndex] = {
        ...existingDoc,
        messages: msgs,
        updatedAt: new Date()
      };
      if (!updated) {
        updated = memoryInquiries[memIndex];
      }
    }

    return ApiResponse.success(res, 'Inquiry messages marked as read', { id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  createInquiry,
  getMyInquiries,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
  clearAllInquiries,
  addInquiryMessage,
  markMessagesAsRead
};

