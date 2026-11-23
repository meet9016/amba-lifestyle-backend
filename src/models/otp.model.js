const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    otp: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ['inquiry_submit', 'inquiry_track', 'auth'],
      default: 'inquiry_submit'
    },
    verified: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600 // 10 minutes TTL
    }
  },
  {
    timestamps: true
  }
);

otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

