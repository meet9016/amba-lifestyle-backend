const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Subcategory slug is required'],
    lowercase: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Parent category is required']
  },
  categoryName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound unique index for category + slug
subcategorySchema.index({ category: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Subcategory', subcategorySchema);

