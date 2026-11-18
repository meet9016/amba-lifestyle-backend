const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [60, 'Name cannot exceed 60 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'vendor', 'customer'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  storeName: {
    type: String,
    trim: true,
    default: ''
  },
  vendorCategory: {
    type: String,
    default: 'Handicrafts & Lifestyle'
  },
  vendorApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date
  },
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
