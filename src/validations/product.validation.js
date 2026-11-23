const { z } = require('zod');

const createProductSchema = z.object({
  title: z.string().trim().optional(),
  name: z.string().trim().optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  category: z.string().trim().optional().default('Handcrafted Products'),
  description: z.string().optional(),
  discountPrice: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().optional().default(10),
  sku: z.string().optional(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  img: z.string().optional(),
  imageUrl: z.string().optional()
}).passthrough().refine(data => !!(data.title || data.name), {
  message: 'Product name/title is required',
  path: ['name']
});

module.exports = {
  createProductSchema
};
