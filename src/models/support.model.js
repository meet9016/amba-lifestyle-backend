const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open'
  },
  category: {
    type: String,
    enum: ['bulk_order', 'pricing_inquiry', 'custom_craft', 'product_spec', 'general'],
    default: 'bulk_order'
  },
  messages: [
    {
      sender: {
        type: String,
        enum: ['customer', 'admin'],
        required: true
      },
      senderName: {
        type: String,
        required: true
      },
      text: {
        type: String,
        required: true
      },
      images: [
        {
          type: String
        }
      ],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

