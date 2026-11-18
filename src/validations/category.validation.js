const { z } = require('zod');

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .optional(),
  description: z
    .string()
    .trim()
    .optional()
    .default(''),
  image: z
    .string()
    .optional()
    .default(''),
  isActive: z
    .boolean()
    .optional()
    .default(true)
}).passthrough();

const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),
  slug: z
    .string()
    .trim()
    .optional(),
  description: z
    .string()
    .trim()
    .optional(),
  image: z
    .string()
    .optional(),
  isActive: z
    .boolean()
    .optional()
}).passthrough();

const createSubcategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Subcategory name must be at least 2 characters')
    .max(100, 'Subcategory name cannot exceed 100 characters'),
  categoryId: z
    .string()
    .trim()
    .min(1, 'Parent category is required'),
  categoryName: z
    .string()
    .optional(),
  slug: z
    .string()
    .trim()
    .optional(),
  description: z
    .string()
    .trim()
    .optional()
    .default(''),
  image: z
    .string()
    .optional()
    .default(''),
  isActive: z
    .boolean()
    .optional()
    .default(true)
}).passthrough();

const updateSubcategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Subcategory name must be at least 2 characters')
    .max(100, 'Subcategory name cannot exceed 100 characters')
    .optional(),
  categoryId: z
    .string()
    .trim()
    .optional(),
  categoryName: z
    .string()
    .optional(),
  slug: z
    .string()
    .trim()
    .optional(),
  description: z
    .string()
    .trim()
    .optional(),
  image: z
    .string()
    .optional(),
  isActive: z
    .boolean()
    .optional()
}).passthrough();

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema
};

