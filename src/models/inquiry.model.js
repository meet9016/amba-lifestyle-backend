const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    inquiryNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: 'fashion'
    },
    size: {
      type: String,
      required: true,
      trim: true
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    quantity: {
      type: Number,
      default: 1
    },
    description: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'quoted', 'approved', 'rejected'],
      default: 'pending'
    },
    quotedPrice: {
      type: Number,
      default: 0
    },
    adminNotes: {
      type: String,
      default: ''
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ['customer', 'admin'],
          default: 'customer'
        },
        senderName: {
          type: String,
          default: ''
        },
        message: {
          type: String,
          required: true
        },
        attachments: {
          type: [String],
          default: []
        },
        isSeen: {
          type: Boolean,
          default: false
        },
        readByAdmin: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    timeline: [
      {
        status: { type: String, required: true },
        note: { type: String, default: '' },
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes for faster lookups
inquirySchema.index({ email: 1, createdAt: -1 });
inquirySchema.index({ status: 1 });

module.exports = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);

