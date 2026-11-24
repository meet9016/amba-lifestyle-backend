const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [140, 'Title cannot exceed 140 characters']
  },
  slug: {
    type: String,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be positive']
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  },
  subCategory: {
    type: String,
    default: 'Handcrafted Goods'
  },
  stock: {
    type: Number,
    required: [true, 'Product stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: [{
    type: String
  }],
  vendor: {
    type: mongoose.Schema.Types.Mixed, // allows ObjectId or String ID
    required: true
  },
  vendorName: {
    type: String,
    default: ''
  },
  companyName: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'published', 'draft', 'out_of_stock'],
    default: 'pending_approval'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: String
  },
  tierPricing: [
    {
      minQty: Number,
      maxQty: Number,
      price: Number
    }
  ],
  specifications: {
    type: Map,
    of: String
  },
  rating: {
    type: Number,
    default: 4.8
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
