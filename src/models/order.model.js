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
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      title: String,
      price: Number,
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'cod'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  subTotal: Number,
  shippingFee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

