const { z } = require('zod');

const createProductSchema = z.object({
  title: z.string().trim().min(2, 'Product title is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  category: z.string().trim().min(1, 'Product category is required'),
  description: z.string().optional(),
  discountPrice: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(1),
  sku: z.string().optional(),
  images: z.array(z.string()).optional()
}).passthrough();

module.exports = {
  createProductSchema
};

