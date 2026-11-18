const Category = require('../models/category.model');
const Subcategory = require('../models/subcategory.model');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Seed categories for immediate fallback / bootstrap
let IN_MEMORY_CATEGORIES = [
  {
    _id: 'cat-1',
    name: 'Ethnic Wear',
    slug: 'ethnic-wear',
    description: 'Traditional Indian apparel, handloom sarees, lehengas and festive wear.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z')
  },
  {
    _id: 'cat-2',
    name: 'Men Handcraft',
    slug: 'men-handcraft',
    description: 'Artisanal kurtas, Nehru jackets, silk stoles and handmade menswear.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-02T10:00:00Z'),
    updatedAt: new Date('2026-11-02T10:00:00Z')
  },
  {
    _id: 'cat-3',
    name: 'Home Decor',
    slug: 'home-decor',
    description: 'Handcrafted brassware, traditional wall hangings, floral urli bowls and artifacts.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-03T10:00:00Z'),
    updatedAt: new Date('2026-11-03T10:00:00Z')
  },
  {
    _id: 'cat-4',
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Handwoven jute rugs, artisanal linen, natural throws and living accessories.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-04T10:00:00Z'),
    updatedAt: new Date('2026-11-04T10:00:00Z')
  },
  {
    _id: 'cat-5',
    name: 'Pottery & Crafts',
    slug: 'pottery-crafts',
    description: 'Authentic Jaipur blue pottery, terracotta planters, ceramic dinnerware.',
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-05T10:00:00Z'),
    updatedAt: new Date('2026-11-05T10:00:00Z')
  }
];

let IN_MEMORY_SUBCATEGORIES = [
  {
    _id: 'subcat-1',
    name: 'Sarees & Handlooms',
    slug: 'sarees-handlooms',
    categoryId: 'cat-1',
    categoryName: 'Ethnic Wear',
    description: 'Banarasi, Chanderi, Kanjeevaram and Tussar silk sarees.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-01T11:00:00Z'),
    updatedAt: new Date('2026-11-01T11:00:00Z')
  },
  {
    _id: 'subcat-2',
    name: 'Lehengas & Kurtis',
    slug: 'lehengas-kurtis',
    categoryId: 'cat-1',
    categoryName: 'Ethnic Wear',
    description: 'Embroidered festive lehengas and block-printed cotton kurtis.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-01T11:30:00Z'),
    updatedAt: new Date('2026-11-01T11:30:00Z')
  },
  {
    _id: 'subcat-3',
    name: 'Kurta Pajama Sets',
    slug: 'kurta-pajama-sets',
    categoryId: 'cat-2',
    categoryName: 'Men Handcraft',
    description: 'Hand block printed and handloom cotton kurta pajama sets.',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-02T11:00:00Z'),
    updatedAt: new Date('2026-11-02T11:00:00Z')
  },
  {
    _id: 'subcat-4',
    name: 'Artisanal Metalware',
    slug: 'artisanal-metalware',
    categoryId: 'cat-3',
    categoryName: 'Home Decor',
    description: 'Solid brass urli bowls, dhokra crafts and engraved lamps.',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-03T11:00:00Z'),
    updatedAt: new Date('2026-11-03T11:00:00Z')
  },
  {
    _id: 'subcat-5',
    name: 'Rugs & Carpets',
    slug: 'rugs-carpets',
    categoryId: 'cat-4',
    categoryName: 'Home & Living',
    description: 'Hand-knotted wool carpets and natural braided jute rugs.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-04T11:00:00Z'),
    updatedAt: new Date('2026-11-04T11:00:00Z')
  },
  {
    _id: 'subcat-6',
    name: 'Blue Pottery & Ceramics',
    slug: 'blue-pottery-ceramics',
    categoryId: 'cat-5',
    categoryName: 'Pottery & Crafts',
    description: 'Hand-painted glazed ceramic plates, bowls and vases.',
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    createdAt: new Date('2026-11-05T11:00:00Z'),
    updatedAt: new Date('2026-11-05T11:00:00Z')
  }
];

// Helper to count subcategories for a category
const getSubCount = (catId) => {
  return IN_MEMORY_SUBCATEGORIES.filter(s => s.categoryId === String(catId)).length;
};

// ==========================================
// CATEGORY CONTROLLER METHODS
// ==========================================

const getCategories = async (req, res, next) => {
  try {
    try {
      const dbCategories = await Category.find().sort({ createdAt: -1 });
      if (dbCategories && dbCategories.length > 0) {
        // Also fetch subcategory counts
        const categoriesWithCount = await Promise.all(
          dbCategories.map(async (cat) => {
            const count = await Subcategory.countDocuments({ category: cat._id });
            const catObj = cat.toObject();
            return {
              ...catObj,
              subcategoriesCount: count
            };
          })
        );
        return ApiResponse.success(res, 'Categories retrieved successfully', categoriesWithCount);
      }
    } catch (_) {
      // DB offline or empty, use in-memory
    }

    const categoriesWithCount = IN_MEMORY_CATEGORIES.map(cat => ({
      ...cat,
      subcategoriesCount: getSubCount(cat._id)
    }));

    return ApiResponse.success(res, 'Categories retrieved successfully', categoriesWithCount);
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      const dbCat = await Category.findById(id);
      if (dbCat) {
        const subcategories = await Subcategory.find({ category: id });
        return ApiResponse.success(res, 'Category details retrieved', {
          ...dbCat.toObject(),
          subcategories
        });
      }
    } catch (_) {}

    const memCat = IN_MEMORY_CATEGORIES.find(c => String(c._id) === String(id));
    if (!memCat) {
      return next(ApiError.notFound('Category not found'));
    }

    const subcategories = IN_MEMORY_SUBCATEGORIES.filter(s => String(s.categoryId) === String(id));
    return ApiResponse.success(res, 'Category details retrieved', {
      ...memCat,
      subcategories
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, isActive } = req.body;
    const computedSlug = slug ? slugify(slug) : slugify(name);

    let createdCategory = null;

    try {
      // Check duplicate slug in DB
      const existing = await Category.findOne({
        $or: [{ name: name.trim() }, { slug: computedSlug }]
      });
      if (existing) {
        return next(ApiError.badRequest('Category with this name or slug already exists'));
      }

      createdCategory = await Category.create({
        name: name.trim(),
        slug: computedSlug,
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });
    } catch (_) {}

    if (!createdCategory) {
      const existingMem = IN_MEMORY_CATEGORIES.find(
        c => c.name.toLowerCase() === name.trim().toLowerCase() || c.slug === computedSlug
      );
      if (existingMem) {
        return next(ApiError.badRequest('Category with this name or slug already exists'));
      }

      createdCategory = {
        _id: `cat-${Date.now()}`,
        name: name.trim(),
        slug: computedSlug,
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      IN_MEMORY_CATEGORIES.unshift(createdCategory);
    }

    return ApiResponse.created(res, 'Category created successfully', {
      ...createdCategory.toObject ? createdCategory.toObject() : createdCategory,
      subcategoriesCount: 0
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, isActive } = req.body;

    let updated = null;

    try {
      const updateData = {};
      if (name) {
        updateData.name = name.trim();
        if (!slug) updateData.slug = slugify(name);
      }
      if (slug) updateData.slug = slugify(slug);
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      updated = await Category.findByIdAndUpdate(id, updateData, { new: true });
    } catch (_) {}

    if (!updated) {
      const idx = IN_MEMORY_CATEGORIES.findIndex(c => String(c._id) === String(id));
      if (idx === -1) {
        return next(ApiError.notFound('Category not found'));
      }

      IN_MEMORY_CATEGORIES[idx] = {
        ...IN_MEMORY_CATEGORIES[idx],
        name: name ? name.trim() : IN_MEMORY_CATEGORIES[idx].name,
        slug: slug ? slugify(slug) : (name ? slugify(name) : IN_MEMORY_CATEGORIES[idx].slug),
        description: description !== undefined ? description : IN_MEMORY_CATEGORIES[idx].description,
        image: image !== undefined ? image : IN_MEMORY_CATEGORIES[idx].image,
        isActive: isActive !== undefined ? Boolean(isActive) : IN_MEMORY_CATEGORIES[idx].isActive,
        updatedAt: new Date()
      };
      updated = IN_MEMORY_CATEGORIES[idx];

      // Update categoryName in subcategories if name changed
      if (name) {
        IN_MEMORY_SUBCATEGORIES.forEach(s => {
          if (String(s.categoryId) === String(id)) {
            s.categoryName = name.trim();
          }
        });
      }
    }

    return ApiResponse.success(res, 'Category updated successfully', {
      ...updated.toObject ? updated.toObject() : updated,
      subcategoriesCount: getSubCount(id)
    });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await Category.findByIdAndDelete(id);
      await Subcategory.deleteMany({ category: id });
    } catch (_) {}

    IN_MEMORY_CATEGORIES = IN_MEMORY_CATEGORIES.filter(c => String(c._id) !== String(id));
    IN_MEMORY_SUBCATEGORIES = IN_MEMORY_SUBCATEGORIES.filter(s => String(s.categoryId) !== String(id));

    return ApiResponse.success(res, 'Category and related subcategories deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBCATEGORY CONTROLLER METHODS
// ==========================================

const getSubcategories = async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    try {
      const query = categoryId ? { category: categoryId } : {};
      const dbSubs = await Subcategory.find(query).populate('category', 'name slug').sort({ createdAt: -1 });
      if (dbSubs && dbSubs.length > 0) {
        const formatted = dbSubs.map(s => {
          const obj = s.toObject();
          return {
            ...obj,
            categoryId: obj.category?._id || obj.category,
            categoryName: obj.category?.name || obj.categoryName || 'General'
          };
        });
        return ApiResponse.success(res, 'Subcategories retrieved successfully', formatted);
      }
    } catch (_) {}

    let filtered = [...IN_MEMORY_SUBCATEGORIES];
    if (categoryId) {
      filtered = filtered.filter(s => String(s.categoryId) === String(categoryId));
    }

    return ApiResponse.success(res, 'Subcategories retrieved successfully', filtered);
  } catch (error) {
    next(error);
  }
};

const getSubcategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      const dbSub = await Subcategory.findById(id).populate('category', 'name slug');
      if (dbSub) {
        return ApiResponse.success(res, 'Subcategory retrieved', dbSub);
      }
    } catch (_) {}

    const memSub = IN_MEMORY_SUBCATEGORIES.find(s => String(s._id) === String(id));
    if (!memSub) {
      return next(ApiError.notFound('Subcategory not found'));
    }

    return ApiResponse.success(res, 'Subcategory retrieved', memSub);
  } catch (error) {
    next(error);
  }
};

const createSubcategory = async (req, res, next) => {
  try {
    const { name, categoryId, categoryName, slug, description, image, isActive } = req.body;
    const computedSlug = slug ? slugify(slug) : slugify(name);

    // Resolve parent category name
    let resolvedCategoryName = categoryName;
    if (!resolvedCategoryName) {
      const parentCat = IN_MEMORY_CATEGORIES.find(c => String(c._id) === String(categoryId));
      if (parentCat) resolvedCategoryName = parentCat.name;
    }

    let createdSub = null;

    try {
      createdSub = await Subcategory.create({
        name: name.trim(),
        slug: computedSlug,
        category: categoryId,
        categoryName: resolvedCategoryName || 'General',
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });
    } catch (_) {}

    if (!createdSub) {
      createdSub = {
        _id: `subcat-${Date.now()}`,
        name: name.trim(),
        slug: computedSlug,
        categoryId: String(categoryId),
        categoryName: resolvedCategoryName || 'General',
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      IN_MEMORY_SUBCATEGORIES.unshift(createdSub);
    }

    return ApiResponse.created(res, 'Subcategory created successfully', createdSub);
  } catch (error) {
    next(error);
  }
};

const updateSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, categoryId, categoryName, slug, description, image, isActive } = req.body;

    let updated = null;

    try {
      const updateData = {};
      if (name) {
        updateData.name = name.trim();
        if (!slug) updateData.slug = slugify(name);
      }
      if (slug) updateData.slug = slugify(slug);
      if (categoryId) updateData.category = categoryId;
      if (categoryName) updateData.categoryName = categoryName;
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      updated = await Subcategory.findByIdAndUpdate(id, updateData, { new: true }).populate('category', 'name slug');
    } catch (_) {}

    if (!updated) {
      const idx = IN_MEMORY_SUBCATEGORIES.findIndex(s => String(s._id) === String(id));
      if (idx === -1) {
        return next(ApiError.notFound('Subcategory not found'));
      }

      let parentName = categoryName;
      if (categoryId && !parentName) {
        const cat = IN_MEMORY_CATEGORIES.find(c => String(c._id) === String(categoryId));
        if (cat) parentName = cat.name;
      }

      IN_MEMORY_SUBCATEGORIES[idx] = {
        ...IN_MEMORY_SUBCATEGORIES[idx],
        name: name ? name.trim() : IN_MEMORY_SUBCATEGORIES[idx].name,
        slug: slug ? slugify(slug) : (name ? slugify(name) : IN_MEMORY_SUBCATEGORIES[idx].slug),
        categoryId: categoryId || IN_MEMORY_SUBCATEGORIES[idx].categoryId,
        categoryName: parentName || IN_MEMORY_SUBCATEGORIES[idx].categoryName,
        description: description !== undefined ? description : IN_MEMORY_SUBCATEGORIES[idx].description,
        image: image !== undefined ? image : IN_MEMORY_SUBCATEGORIES[idx].image,
        isActive: isActive !== undefined ? Boolean(isActive) : IN_MEMORY_SUBCATEGORIES[idx].isActive,
        updatedAt: new Date()
      };
      updated = IN_MEMORY_SUBCATEGORIES[idx];
    }

    return ApiResponse.success(res, 'Subcategory updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

const deleteSubcategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await Subcategory.findByIdAndDelete(id);
    } catch (_) {}

    IN_MEMORY_SUBCATEGORIES = IN_MEMORY_SUBCATEGORIES.filter(s => String(s._id) !== String(id));

    return ApiResponse.success(res, 'Subcategory deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
};

