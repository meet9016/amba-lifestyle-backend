const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name, storeName: user.storeName, employeeId: user.employeeId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// In-Memory Users store (Only Super Admin is pre-configured; vendors register fresh)
let IN_MEMORY_USERS = [
  {
    _id: 'admin-001',
    name: 'Super Admin',
    email: 'admin@ambalifestyle.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    storeName: 'Amba Central Administration',
    isApproved: true,
    vendorApprovalStatus: 'approved',
    createdAt: new Date('2026-11-01T00:00:00Z')
  }
];

// Register User (Vendor or Customer)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'vendor', phone, storeName, vendorCategory } = req.body;

    if (!email || !password || !name) {
      return next(ApiError.badRequest('Name, email, and password are required'));
    }

    // Check duplicate in-memory
    const existingInMemory = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingInMemory) {
      return next(ApiError.badRequest('An account with this email address already exists.'));
    }

    const isVendor = role === 'vendor';
    const passwordHash = await bcrypt.hash(password, 10);

    let createdDbUser = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        createdDbUser = await User.create({
          name,
          email: email.toLowerCase(),
          password,
          role: isVendor ? 'vendor' : role,
          phone,
          storeName: storeName || (isVendor ? `${name}'s Store` : ''),
          vendorCategory: vendorCategory || 'Handicrafts & Lifestyle',
          isApproved: !isVendor,
          vendorApprovalStatus: isVendor ? 'pending' : 'approved'
        });
      } catch (dbErr) {
        if (dbErr.code === 11000) {
          return next(ApiError.badRequest('An account with this email address already exists.'));
        }
      }
    }

    const assignedId = createdDbUser ? String(createdDbUser._id) : `user-${Date.now()}`;

    const newUserObj = {
      _id: assignedId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: isVendor ? 'vendor' : role,
      phone: phone || '',
      storeName: storeName || (isVendor ? `${name}'s Store` : ''),
      vendorCategory: vendorCategory || 'Handicrafts & Lifestyle',
      isApproved: !isVendor, // Vendors require admin approval
      vendorApprovalStatus: isVendor ? 'pending' : 'approved',
      rejectionReason: '',
      createdAt: new Date()
    };

    IN_MEMORY_USERS.unshift(newUserObj);

    if (isVendor) {
      return ApiResponse.created(res, 'Vendor registration submitted successfully! Your account is pending Admin approval.', {
        user: {
          id: newUserObj._id,
          name: newUserObj.name,
          email: newUserObj.email,
          role: newUserObj.role,
          storeName: newUserObj.storeName,
          vendorApprovalStatus: 'pending',
          isApproved: false
        },
        requiresApproval: true
      });
    }

    const token = generateToken(newUserObj);
    return ApiResponse.created(res, 'Registration successful', {
      user: {
        id: newUserObj._id,
        name: newUserObj.name,
        email: newUserObj.email,
        role: newUserObj.role
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Login User
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(ApiError.badRequest('Please enter email and password'));
    }

    let user = null;

    // Check DB first only if connected
    if (require('mongoose').connection.readyState === 1) {
      try {
        const dbUser = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (dbUser) {
          const isMatch = await dbUser.comparePassword(password);
          if (isMatch) user = dbUser;
        }
      } catch (_) {}
    }

    // Check in-memory fallback
    if (!user) {
      const memUser = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (memUser) {
        const isMatch = await bcrypt.compare(password, memUser.passwordHash);
        if (isMatch) user = memUser;
      }
    }

    if (!user) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    // CHECK VENDOR APPROVAL STATUS
    if (user.role === 'vendor') {
      if (user.vendorApprovalStatus === 'pending') {
        return res.status(403).json({
          success: false,
          approvalStatus: 'pending',
          message: 'Your vendor account is pending Admin approval. You will receive access once approved by the Super Admin.'
        });
      }

      if (user.vendorApprovalStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          approvalStatus: 'rejected',
          message: `Your vendor registration was rejected. Reason: ${user.rejectionReason || 'Application criteria not met.'}`
        });
      }
    }

    const token = generateToken(user);

    return ApiResponse.success(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeName: user.storeName || '',
        vendorApprovalStatus: user.vendorApprovalStatus || 'approved'
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Get current profile
const getProfile = async (req, res, next) => {
  try {
    const user = IN_MEMORY_USERS.find(u => String(u._id) === String(req.user?._id)) || req.user;
    return ApiResponse.success(res, 'Profile fetched', { user });
  } catch (error) {
    next(error);
  }
};

// Admin Vendor Management Endpoints
const getVendors = async (req, res, next) => {
  try {
    const { approvalStatus } = req.query;
    let vendors = [];

    if (require('mongoose').connection.readyState === 1) {
      try {
        const query = { role: 'vendor' };
        if (approvalStatus) query.vendorApprovalStatus = approvalStatus;
        vendors = await User.find(query).select('-password').sort({ createdAt: -1 });
      } catch (_) {}
    }

    if (!vendors || vendors.length === 0) {
      vendors = IN_MEMORY_USERS.filter(u => u.role === 'vendor');
      if (approvalStatus) {
        vendors = vendors.filter(v => v.vendorApprovalStatus === approvalStatus);
      }
    }

    return ApiResponse.success(res, 'Vendors retrieved', vendors);
  } catch (error) {
    next(error);
  }
};

const approveVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    let vendor = null;

    if (require('mongoose').connection.readyState === 1) {
      try {
        vendor = await User.findByIdAndUpdate(
          id,
          {
            vendorApprovalStatus: 'approved',
            isApproved: true,
            approvedAt: new Date(),
            rejectionReason: ''
          },
          { new: true }
        );
      } catch (_) {}
    }

    const memVendor = IN_MEMORY_USERS.find(u => String(u._id) === String(id) || (vendor && u.email === vendor.email));
    if (memVendor) {
      memVendor.vendorApprovalStatus = 'approved';
      memVendor.isApproved = true;
      memVendor.approvedAt = new Date();
      memVendor.rejectionReason = '';
      if (!vendor) vendor = memVendor;
    }

    if (!vendor) {
      return next(ApiError.notFound('Vendor account not found'));
    }

    return ApiResponse.success(res, 'Vendor approved successfully! They can now log in.', vendor);
  } catch (error) {
    next(error);
  }
};

const rejectVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Incomplete artisan credentials' } = req.body;
    let vendor = null;

    if (require('mongoose').connection.readyState === 1) {
      try {
        vendor = await User.findByIdAndUpdate(
          id,
          {
            vendorApprovalStatus: 'rejected',
            isApproved: false,
            rejectionReason: reason
          },
          { new: true }
        );
      } catch (_) {}
    }

    const memVendor = IN_MEMORY_USERS.find(u => String(u._id) === String(id) || (vendor && u.email === vendor.email));
    if (memVendor) {
      memVendor.vendorApprovalStatus = 'rejected';
      memVendor.isApproved = false;
      memVendor.rejectionReason = reason;
      if (!vendor) vendor = memVendor;
    }

    if (!vendor) {
      return next(ApiError.notFound('Vendor account not found'));
    }

    return ApiResponse.success(res, 'Vendor application rejected.', vendor);
  } catch (error) {
    next(error);
  }
};

// Get All Users / Customers (Admin action)
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    let users = [];
    if (require('mongoose').connection.readyState === 1) {
      try {
        users = await User.find(query).select('-password').sort({ createdAt: -1 });
      } catch (err) {
        console.error('Error fetching users from DB:', err.message);
      }
    }

    if (!users || users.length === 0) {
      users = [...IN_MEMORY_USERS];
      if (role && role !== 'all') {
        users = users.filter(u => u.role === role);
      }
      if (search) {
        const s = search.toLowerCase();
        users = users.filter(u =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone && u.phone.includes(s))
        );
      }
    }

    return ApiResponse.success(res, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

// Product Checker Management Endpoints (Admin action)
const createChecker = async (req, res, next) => {
  try {
    const { name, email, password, phone, department, employeeId } = req.body;

    if (!name || !email || !password) {
      return next(ApiError.badRequest('Name, email, and password are required'));
    }

    // Check duplicate in-memory
    const existingInMemory = IN_MEMORY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingInMemory) {
      return next(ApiError.badRequest('An account with this email address already exists.'));
    }

    const empId = employeeId || `CHK-${Date.now().toString().slice(-4)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    let createdDbUser = null;
    if (require('mongoose').connection.readyState === 1) {
      try {
        createdDbUser = await User.create({
          name,
          email: email.toLowerCase(),
          password,
          role: 'checker',
          phone: phone || '',
          employeeId: empId,
          department: department || 'Quality Inspection',
          isApproved: true,
          vendorApprovalStatus: 'approved'
        });
      } catch (dbErr) {
        if (dbErr.code === 11000) {
          return next(ApiError.badRequest('An account with this email address already exists.'));
        }
        return next(ApiError.badRequest(dbErr.message));
      }
    }

    const finalChecker = createdDbUser ? createdDbUser.toObject() : {
      _id: `chk-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role: 'checker',
      phone: phone || '',
      employeeId: empId,
      department: department || 'Quality Inspection',
      isApproved: true,
      vendorApprovalStatus: 'approved',
      createdAt: new Date()
    };

    delete finalChecker.password;

    IN_MEMORY_USERS.push({
      ...finalChecker,
      passwordHash
    });

    return ApiResponse.created(res, `Product Checker ${name} created successfully`, finalChecker);
  } catch (error) {
    next(error);
  }
};

const getCheckers = async (req, res, next) => {
  try {
    let checkers = [];
    if (require('mongoose').connection.readyState === 1) {
      try {
        checkers = await User.find({ role: 'checker' }).select('-password').sort({ createdAt: -1 });
      } catch (_) {}
    }

    if (!checkers || checkers.length === 0) {
      checkers = IN_MEMORY_USERS.filter(u => u.role === 'checker').map(u => {
        const copy = { ...u };
        delete copy.passwordHash;
        return copy;
      });
    }

    return ApiResponse.success(res, 'Product Checkers retrieved successfully', checkers);
  } catch (error) {
    next(error);
  }
};

const deleteChecker = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (require('mongoose').connection.readyState === 1) {
      try {
        await User.findByIdAndDelete(id);
      } catch (_) {}
    }

    IN_MEMORY_USERS = IN_MEMORY_USERS.filter(u => String(u._id) !== String(id));
    return ApiResponse.success(res, 'Checker removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  getVendors,
  approveVendor,
  rejectVendor,
  getUsers,
  createChecker,
  getCheckers,
  deleteChecker
};
