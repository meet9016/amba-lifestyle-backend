const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['vendor', 'customer', 'admin']).default('vendor'),
  phone: z.string().optional(),
  storeName: z.string().trim().optional(),
  vendorCategory: z.string().trim().optional()
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

module.exports = {
  registerSchema,
  loginSchema
};

