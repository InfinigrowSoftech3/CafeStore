import express from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { adminOnly, ownerOrManager, protect } from '../middleware/auth.js';
import { writeAuditLog } from '../services/auditLog.js';
import { parsePagination, formatPagination } from '../utils/pagination.js';

const router = express.Router();

// GET /api/categories — public
router.get('/', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Vary': 'X-Tenant-Slug, X-Tenant-Id, X-Table-Token, Origin',
    });
    const { page, limit, skip } = parsePagination(req);
    const filter = { active: true };
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ sortOrder: 1, name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .select('name description icon active sortOrder createdAt updatedAt tenantId')
        .lean(),
      Category.countDocuments(filter),
    ]);
    res.json({
      categories,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all (admin/staff)
router.get('/all', protect, ownerOrManager, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const filter = {};
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ sortOrder: 1, name: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .select('name description icon active sortOrder createdAt updatedAt tenantId')
        .lean(),
      Category.countDocuments(filter),
    ]);
    res.json({
      categories,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categories — admin/staff
// SECURITY: Mass assignment protection - explicit field allowlist
router.post('/', protect, ownerOrManager, async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'icon', 'active', 'sortOrder'];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    const category = await Category.create(update);
    res.status(201).json({ category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/categories/:id — admin/staff
// SECURITY: Mass assignment protection - explicit field allowlist
router.put('/:id', protect, ownerOrManager, async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'icon', 'active', 'sortOrder'];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true
    });
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.json({ category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/categories/:id — admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const productsCount = await Product.countDocuments({ category: req.params.id });
    if (productsCount > 0) {
      return res.status(409).json({
        error: `Cannot delete category: ${productsCount} product(s) are assigned to it. Deactivate the category instead or reassign the products first.`,
        code: 'CATEGORY_IN_USE',
        productCount: productsCount,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    await writeAuditLog({ actor: req.user, action: 'menu.category_deleted', targetType: 'Category', targetId: category._id, details: { name: category.name } });
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
