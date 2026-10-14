import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { adminOnly, ownerOrManager, protect } from '../middleware/auth.js';
import { checkMenuItemLimit } from '../middleware/planLimits.js';
import { escapeRegex } from '../utils/orderSecurity.js';
import { checkAvailability } from '../services/inventoryService.js';
import { openLiveStream, publishLiveUpdate } from '../services/liveUpdates.js';
import { isProductScheduledAvailable } from '../utils/productAvailability.js';
import { writeAuditLog } from '../services/auditLog.js';
import { getRedisClient } from '../config/redis.js';
import { parsePagination, formatPagination } from '../utils/pagination.js';

const router = express.Router();

router.get('/events', (req, res) => openLiveStream(req, res, 'menu'));

export const clearMenuCache = async (tenantId) => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    if (tenantId) {
      await redis.incr(`menu:version:${tenantId}`);
    } else {
      await redis.incr('menu:version:global');
    }
  } catch (err) {
    console.warn('[Menu Cache] Invalidation error:', err.message);
  }
};

// GET /api/menu — public
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'private, no-cache');
    res.set('Vary', 'X-Tenant-Slug, X-Tenant-Id, X-Table-Token, Origin');
    const { category, search, sort, popular, veg, vegOnly } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });

    const redis = getRedisClient();
    let cacheKey = null;

    if (redis) {
      try {
        const tenantId = String(req.tenantId || req.tenant?._id || 'global');
        const versionKey = `menu:version:${tenantId}`;
        let version = await redis.get(versionKey);
        if (!version) {
          version = '1';
          await redis.set(versionKey, '1');
        }

        const querySignature = JSON.stringify({ category, search, sort, popular, veg: veg || vegOnly, page, limit });
        const queryHash = crypto.createHash('sha256').update(querySignature).digest('hex').slice(0, 16);
        cacheKey = `menu:cache:${tenantId}:v${version}:${queryHash}`;

        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.warn('[Menu Cache] Redis check error, proceeding to DB:', err.message);
        cacheKey = null;
      }
    }

    let query = {};

    if (category && category !== 'all') query.category = category;
    if (popular === 'true') query.popular = true;
    if (veg === 'true' || vegOnly === 'true') query.isVeg = true;
    if (search) {
      // SECURITY: Escape regex special characters and limit search length
      if (String(search).length > 100) {
        return res.status(400).json({ error: 'Search query is too long.' });
      }
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    let sortObj = { createdAt: -1, _id: -1 };
    if (sort === 'price_asc') sortObj = { price: 1, _id: 1 };
    if (sort === 'price_desc') sortObj = { price: -1, _id: -1 };
    if (sort === 'popular') sortObj = { popular: -1, rating: -1, _id: -1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name icon')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Attach inventory availability to each product
    let availability = {};
    try {
      const productIds = products.map(p => p._id);
      availability = await checkAvailability(productIds);
    } catch (err) {
      // Non-fatal: if inventory check fails, don't break the menu
      console.error('[Inventory] Availability check failed:', err.message);
    }

    const productsWithAvailability = products.map(p => {
      const maxQty = availability[String(p._id)];
      // null = no inventory mapping (unlimited), 0 = out of stock
      return {
        ...p,
        scheduledAvailable: isProductScheduledAvailable(p),
        maxOrderableQty: maxQty === Infinity ? null : (maxQty ?? null),
        inventoryAvailable: maxQty === undefined || maxQty === Infinity || maxQty > 0,
      };
    });

    const responsePayload = {
      products: productsWithAvailability,
      pagination: formatPagination({ page, limit, total }),
    };
    if (redis && cacheKey) {
      try {
        await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 20);
      } catch (err) {
        console.warn('[Menu Cache] Redis save error:', err.message);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID.' });
    }
    const product = await Product.findById(req.params.id).populate('category', 'name icon');
    if (!product) return res.status(404).json({ error: 'Item not found.' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu — admin/staff
// SECURITY: Mass assignment protection - explicit field allowlist
router.post('/', protect, ownerOrManager, checkMenuItemLimit, async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'price', 'image', 'category', 'available', 'availableFrom', 'availableUntil', 'popular', 'variants', 'addons', 'prepTime'];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    const product = await Product.create(update);
    await product.populate('category', 'name icon');
    await writeAuditLog({ actor: req.user, action: 'menu.product_created', targetType: 'Product', targetId: product._id, details: { name: product.name, price: product.price } });
    await clearMenuCache(req.tenantId || req.tenant?._id);
    publishLiveUpdate('menu', 'availability', { productId: String(product._id), available: product.available });
    res.status(201).json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/menu/:id — admin/staff
// SECURITY: Mass assignment protection - explicit field allowlist
router.put('/:id', protect, ownerOrManager, async (req, res) => {
  try {
    const allowedFields = ['name', 'description', 'price', 'image', 'category', 'available', 'availableFrom', 'availableUntil', 'popular', 'variants', 'addons', 'prepTime'];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    const before = await Product.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Item not found.' });
    const startsAt = Object.prototype.hasOwnProperty.call(update, 'availableFrom') ? update.availableFrom : before.availableFrom;
    const endsAt = Object.prototype.hasOwnProperty.call(update, 'availableUntil') ? update.availableUntil : before.availableUntil;
    if (startsAt && Number.isNaN(new Date(startsAt).getTime())) return res.status(400).json({ error: 'Availability start time is invalid.' });
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) return res.status(400).json({ error: 'Availability end time is invalid.' });
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) return res.status(400).json({ error: 'Availability must end after it starts.' });
    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true
    }).populate('category', 'name icon');
    if (!product) return res.status(404).json({ error: 'Item not found.' });
    if (['price', 'variants', 'addons'].some((field) => Object.prototype.hasOwnProperty.call(update, field))) {
      const beforePrice = { price: before.price, variants: before.variants || [], addons: before.addons || [] };
      const afterPrice = { price: product.price, variants: product.variants || [], addons: product.addons || [] };
      if (JSON.stringify(beforePrice) !== JSON.stringify(afterPrice)) {
        await writeAuditLog({ actor: req.user, action: 'menu.price_changed', targetType: 'Product', targetId: product._id, details: { before: beforePrice, after: afterPrice } });
      }
    }
    await clearMenuCache(req.tenantId || req.tenant?._id);
    if (Object.prototype.hasOwnProperty.call(update, 'available')) {
      publishLiveUpdate('menu', 'availability', { productId: String(product._id), available: product.available });
    }
    res.json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/menu/:id — admin
router.delete('/:id', protect, ownerOrManager, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Item not found.' });
    await writeAuditLog({ actor: req.user, action: 'menu.product_deleted', targetType: 'Product', targetId: product._id, details: { name: product.name } });
    await clearMenuCache(req.tenantId || req.tenant?._id);
    publishLiveUpdate('menu', 'removed', { productId: String(product._id) });
    res.json({ message: 'Item deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
