const User = require('../models/user.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Get all users (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.role) query.role = req.query.role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return ApiResponse.paginated(res, 'Users fetched successfully', users, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    return ApiResponse.success(res, 'Profile updated successfully', user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateProfile
};

