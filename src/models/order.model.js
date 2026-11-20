const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    company: { type: String, default: '' }
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false
      },
      title: String,
      price: Number,
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      imageUrl: String,
      category: String,
      subCategory: String,
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],
  customRequirements: {
    type: String,
    default: ''
  },
  referenceImages: [
    {
      type: String
    }
  ],
  assignedVendor: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  assignedVendorName: {
    type: String,
    default: ''
  },
  assignedAt: {
    type: Date
  },
  assignedChecker: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  assignedCheckerName: {
    type: String,
    default: ''
  },
  assignedCheckerEmail: {
    type: String,
    default: ''
  },
  passedToCheckerAt: {
    type: Date
  },
  orderStage: {
    type: String,
    enum: [
      'pending_admin_review',
      'assigned_to_vendor',
      'vendor_preparing',
      'ready_for_inspection',
      'under_inspection',
      'quality_failed',
      'quality_approved',
      'completed'
    ],
    default: 'pending_admin_review'
  },
  inspectionReport: {
    inspectorName: { type: String, default: '' },
    inspectedAt: { type: Date },
    qualityCheckPassed: { type: Boolean, default: false },
    quantityVerified: { type: Boolean, default: false },
    specificationsMatched: { type: Boolean, default: false },
    defectNotes: { type: String, default: '' },
    inspectionPhotos: [{ type: String }],
    status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' }
  },
  vendorCorrectionNotes: {
    type: String,
    default: ''
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  },
  subTotal: Number,
  totalAmount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);


