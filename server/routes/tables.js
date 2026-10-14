import express from 'express';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import Table from '../models/Table.js';
import Tenant from '../models/Tenant.js';
import Order from '../models/Order.js';
import { adminOnly, ownerOrManager, protect } from '../middleware/auth.js';
import { checkTableLimit } from '../middleware/planLimits.js';
import { createTableQrToken, verifyTableQrToken } from '../utils/tableQr.js';
import { getTenantContext } from '../utils/tenantContext.js';
import { writeAuditLog } from '../services/auditLog.js';
import { parsePagination, formatPagination } from '../utils/pagination.js';
import {
  markTableCleanedAndAvailable,
  checkAutoRelease,
  syncTableStatusForOrder,
} from '../services/tableLifecycle.js';
import { openLiveStream, publishTableStatus } from '../services/liveUpdates.js';

const router = express.Router();

// SSE Live Stream for Table & Floor Plan updates
router.get('/events', protect, ownerOrManager, (req, res) => openLiveStream(req, res, 'admin'));

const getTrustedClientUrl = () => {
  const configured = String(process.env.CUSTOMER_APP_URL || process.env.CLIENT_URL || 'https://cafe.infinigrowsoftech.com').trim();
  if (!configured) throw new Error('CUSTOMER_APP_URL or CLIENT_URL is not configured.');

  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('CUSTOMER_APP_URL is invalid.');
  }
  if (process.env.NODE_ENV === 'production' && parsed.hostname === 'localhost') {
    throw new Error('Production QR codes cannot use localhost. Configure CUSTOMER_APP_URL with the live customer domain.');
  }

  return configured.replace(/\/$/, '');
};

const generateQR = async (table, tenantId = table.tenantId, tenantSlug = null) => {
  const effectiveTenantId = tenantId || table.tenantId || getTenantContext()?.tenantId;
  let slug = tenantSlug;
  if (!slug && effectiveTenantId) {
    const tenantDoc = await Tenant.findById(effectiveTenantId).select('slug').lean();
    slug = tenantDoc?.slug;
  }
  const cafeIdentifier = slug || String(effectiveTenantId);
  const token = createTableQrToken(table._id, effectiveTenantId);
  const tableNum = table.tableNumber ?? 1;
  const url = `${getTrustedClientUrl()}/menu?cafe=${encodeURIComponent(cafeIdentifier)}&table=${encodeURIComponent(tableNum)}&tableToken=${encodeURIComponent(token)}`;
  const qrCode = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#1a0f08', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });
  return { qrCode, qrUrl: url };
};

const refreshStaleQrCodes = async (tables, tenantId = null, tenantSlug = null) => {
  const refreshed = await Promise.all(tables.map(async (table) => {
    let existingClaims = null;
    let existingCafe = null;
    try {
      const parsed = new URL(table.qrUrl);
      existingClaims = verifyTableQrToken(parsed.searchParams.get('tableToken'));
      existingCafe = parsed.searchParams.get('cafe');
    } catch {
      // Missing or malformed QR URLs are regenerated below.
    }
    const effectiveTenantId = tenantId || table.tenantId || getTenantContext()?.tenantId;
    let expectedSlug = tenantSlug;
    if (!expectedSlug && effectiveTenantId) {
      const tenantDoc = await Tenant.findById(effectiveTenantId).select('slug').lean();
      expectedSlug = tenantDoc?.slug;
    }
    const expectedCafe = expectedSlug || String(effectiveTenantId);
    if (
      existingClaims?.tableId === String(table._id) &&
      String(existingClaims?.tenantId) === String(effectiveTenantId) &&
      existingCafe &&
      existingCafe.toLowerCase() === expectedCafe.toLowerCase() &&
      table.qrCode
    ) {
      return table;
    }
    const { qrCode, qrUrl } = await generateQR(table, effectiveTenantId, expectedSlug);
    table.qrCode = qrCode;
    table.qrUrl = qrUrl;
    await table.save();
    return table;
  }));
  return refreshed;
};

// GET /api/tables — public
router.get('/', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const filter = { active: true };
    const [tables, total] = await Promise.all([
      Table.find(filter)
        .sort({ tableNumber: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Table.countDocuments(filter),
    ]);
    res.json({
      tables,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve signed table QR tokens on the server. The signature and expiry are
// checked before a table number is returned to the customer app.
router.get('/qr/validate', async (req, res) => {
  try {
    const claims = verifyTableQrToken(req.query.token);
    if (!claims) return res.status(400).json({ valid: false, error: 'Invalid or expired table QR code.', code: 'INVALID_TABLE_QR' });
    if (String(claims.tenantId) !== String(req.tenantId)) return res.status(404).json({ valid: false, error: 'Invalid or expired table QR code.', code: 'INVALID_TABLE_QR' });
    const table = await Table.findOne({ _id: claims.tableId, active: true }).select('tableNumber label').lean();
    if (!table) return res.status(404).json({ valid: false, error: 'Invalid or expired table QR code.', code: 'INVALID_TABLE_QR' });
    return res.json({ valid: true, table: { tableNumber: table.tableNumber, label: table.label }, expiresAt: claims.expiresAt });
  } catch (error) {
    return res.status(400).json({ valid: false, error: 'Invalid or expired table QR code.', code: 'INVALID_TABLE_QR' });
  }
});

// GET /api/tables/floor-plan — admin/staff (Visual Floor Plan with live table metrics)
router.get('/floor-plan', protect, ownerOrManager, async (req, res) => {
  try {
    const { branchId, floor } = req.query;
    const { page, limit, skip } = parsePagination(req, 50, 100);
    const filter = { active: true };
    if (branchId) filter.branchId = branchId;
    if (floor && floor !== 'ALL') filter.floor = floor;

    const [tables, total, tenantDoc] = await Promise.all([
      Table.find(filter)
        .populate('assignedWaiter', 'name email')
        .sort({ floor: 1, tableNumber: 1, _id: 1 })
        .skip(skip)
        .limit(limit),
      Table.countDocuments(filter),
      Tenant.findById(req.tenantId).select('settings.tableSettings').lean(),
    ]);

    const tableSettings = tenantDoc?.settings?.tableSettings || {};
    const cleaningStepEnabled = tableSettings.cleaningStepEnabled !== false;
    const autoReleaseMinutes = Number(tableSettings.autoReleaseMinutes ?? 5);

    // Query non-cancelled orders across these tables
    const tableNumbers = tables.map(t => t.tableNumber);
    const nonCancelledOrders = await Order.find({
      tenantId: req.tenantId,
      tableNumber: { $in: tableNumbers },
      orderStatus: { $ne: 'cancelled' },
    }).sort({ createdAt: 1 }).lean();

    // Group non-cancelled orders by tableNumber
    const ordersByTable = {};
    for (const ord of nonCancelledOrders) {
      if (!ordersByTable[ord.tableNumber]) {
        ordersByTable[ord.tableNumber] = [];
      }
      ordersByTable[ord.tableNumber].push(ord);
    }

    const enrichedTables = await Promise.all(tables.map(async (tableDoc) => {
      const table = tableDoc.toObject();
      const tableOrders = ordersByTable[table.tableNumber] || [];

      // Open, unpaid orders that keep a table occupied and accrue a balance
      const unpaidOrders = tableOrders.filter(
        (o) => o.paymentStatus !== 'paid' && o.orderStatus !== 'completed'
      );
      const totalUnpaidBill = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalItemsCount = unpaidOrders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0);
      const earliestOrder = unpaidOrders[0];

      let effectiveStatus = table.status || 'AVAILABLE';

      // 1. Check auto-release for CLEANING tables
      if (table.status === 'CLEANING') {
        const released = await checkAutoRelease(tableDoc, autoReleaseMinutes);
        if (released) {
          effectiveStatus = 'AVAILABLE';
          table.status = 'AVAILABLE';
          table.currentSessionId = null;
          table.paidAt = null;
        } else {
          effectiveStatus = 'CLEANING';
        }
      } else if (['DISABLED', 'RESERVED'].includes(table.status)) {
        effectiveStatus = table.status;
      } else if (unpaidOrders.length > 0) {
        // Active orders with open balance
        effectiveStatus = table.status === 'WAITING_PAYMENT' ? 'WAITING_PAYMENT' : 'OCCUPIED';
        if (tableDoc.status !== effectiveStatus) {
          tableDoc.status = effectiveStatus;
          await tableDoc.save();
        }
      } else {
        // All orders on table are settled/paid/completed or no orders at all!
        if (['OCCUPIED', 'WAITING_PAYMENT'].includes(table.status)) {
          // Heal stuck table immediately
          if (cleaningStepEnabled) {
            effectiveStatus = 'CLEANING';
            tableDoc.status = 'CLEANING';
            tableDoc.paidAt = tableDoc.paidAt || new Date();
          } else {
            effectiveStatus = 'AVAILABLE';
            tableDoc.status = 'AVAILABLE';
            tableDoc.currentSessionId = null;
            tableDoc.paidAt = null;
          }
          await tableDoc.save();
          publishTableStatus(tableDoc);
        } else {
          effectiveStatus = table.status || 'AVAILABLE';
        }
      }

      return {
        ...table,
        status: effectiveStatus,
        effectiveStatus,
        activeOrdersCount: unpaidOrders.length,
        currentBillAmount: Number(totalUnpaidBill.toFixed(2)),
        totalItemsCount,
        occupiedSince: earliestOrder ? earliestOrder.createdAt : null,
        activeOrders: unpaidOrders.map(o => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          total: o.total,
          itemsSummary: o.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || '',
          createdAt: o.createdAt,
        })),
      };
    }));

    const floors = [...new Set(tables.map(t => t.floor || 'Ground Floor'))];

    res.json({
      success: true,
      tables: enrichedTables,
      floors,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tables — admin/staff
router.get('/all', protect, ownerOrManager, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req, 50, 100);
    const [rawTables, total] = await Promise.all([
      Table.find().sort({ tableNumber: 1, _id: 1 }).skip(skip).limit(limit),
      Table.countDocuments(),
    ]);
    const tables = await refreshStaleQrCodes(
      rawTables,
      req.tenantId,
      req.tenant?.slug
    );
    res.json({
      tables,
      pagination: formatPagination(page, limit, total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tables/:number/validate — public (validate table exists)
router.get('/:number/validate', async (req, res) => {
  try {
    const tableNumber = Number(req.params.number);
    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      return res.status(400).json({ valid: false, error: 'Invalid table number.' });
    }

    const table = await Table.findOne({
      tableNumber,
      active: true
    });
    if (!table) return res.status(404).json({ valid: false, error: 'Invalid table number.' });
    res.json({ valid: true, table: { tableNumber: table.tableNumber, label: table.label } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tables — admin/staff
router.post('/', protect, ownerOrManager, checkTableLimit, async (req, res) => {
  try {
    const { tableNumber, seats, label, floor, shape, assignedWaiter, branchId } = req.body;
    const normalizedTableNumber = Number(tableNumber);
    const normalizedSeats = Number(seats ?? 4);
    if (!Number.isInteger(normalizedTableNumber) || normalizedTableNumber <= 0) {
      return res.status(400).json({ error: 'Table number must be a positive integer.' });
    }
    if (!Number.isInteger(normalizedSeats) || normalizedSeats < 1 || normalizedSeats > 50) {
      return res.status(400).json({ error: 'Seats must be an integer between 1 and 50.' });
    }

    const table = new Table({
      tenantId: req.tenantId,
      branchId: branchId || null,
      tableNumber: normalizedTableNumber,
      seats: normalizedSeats,
      label: String(label || '').trim().slice(0, 100),
      floor: String(floor || 'Ground Floor').trim().slice(0, 100),
      shape: ['square', 'round', 'rectangle'].includes(shape) ? shape : 'square',
      assignedWaiter: assignedWaiter || null,
    });
    const { qrCode, qrUrl } = await generateQR(table, req.tenantId, req.tenant?.slug);
    table.qrCode = qrCode;
    table.qrUrl = qrUrl;
    await table.save();
    res.status(201).json({ table });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/tables/:id — admin/staff
// SECURITY: Mass assignment protection - explicit field allowlist
router.put('/:id', protect, ownerOrManager, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    // Only allow these fields to be updated
    const allowedFields = ['tableNumber', 'seats', 'label', 'active', 'status', 'floor', 'shape', 'assignedWaiter', 'branchId'];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(update, 'tableNumber')) {
      update.tableNumber = Number(update.tableNumber);
      if (!Number.isInteger(update.tableNumber) || update.tableNumber <= 0) {
        return res.status(400).json({ error: 'Table number must be a positive integer.' });
      }
    }
    if (Object.prototype.hasOwnProperty.call(update, 'seats')) {
      update.seats = Number(update.seats);
      if (!Number.isInteger(update.seats) || update.seats < 1 || update.seats > 50) {
        return res.status(400).json({ error: 'Seats must be an integer between 1 and 50.' });
      }
    }

    if (update.tableNumber !== undefined && update.tableNumber !== table.tableNumber) {
      const { qrCode, qrUrl } = await generateQR(
        { _id: table._id, tableNumber: update.tableNumber, tenantId: req.tenantId },
        req.tenantId,
        req.tenant?.slug
      );
      update.qrCode = qrCode;
      update.qrUrl = qrUrl;
    }

    const updated = await Table.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ table: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tables/:id/mark-available — admin/staff (One-click Cleaned & Mark Available)
router.post('/:id/mark-available', protect, ownerOrManager, async (req, res) => {
  try {
    const table = await markTableCleanedAndAvailable(req.params.id, req.tenantId, req.user?._id);
    res.json({ success: true, table, message: `Table ${table.tableNumber} is now clean and available.` });
  } catch (error) {
    const status = error.status || 400;
    res.status(status).json({ error: error.message, code: error.code || 'MARK_AVAILABLE_FAILED' });
  }
});

// PATCH /api/tables/:id/status — admin/staff (Change table status)
router.patch('/:id/status', protect, ownerOrManager, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'WAITING_PAYMENT', 'CLEANING', 'DISABLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }

    if (status === 'AVAILABLE') {
      const table = await markTableCleanedAndAvailable(req.params.id, req.tenantId, req.user?._id);
      return res.json({ success: true, table });
    }

    const table = await Table.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    table.status = status;
    if (status === 'CLEANING') {
      table.paidAt = new Date();
    }
    await table.save();
    publishTableStatus(table);

    res.json({ success: true, table });
  } catch (error) {
    const statusCode = error.status || 400;
    res.status(statusCode).json({ error: error.message, code: error.code });
  }
});

// POST /api/tables/transfer — admin/staff (Transfer open orders between tables)
router.post('/transfer', protect, ownerOrManager, async (req, res) => {
  try {
    const fromTableNumber = Number(req.body.fromTableNumber);
    const toTableNumber = Number(req.body.toTableNumber);

    if (!fromTableNumber || !toTableNumber) {
      return res.status(400).json({ error: 'Both fromTableNumber and toTableNumber are required.' });
    }
    if (fromTableNumber === toTableNumber) {
      return res.status(400).json({ error: 'Source and destination tables must be different.' });
    }

    const [fromTable, toTable] = await Promise.all([
      Table.findOne({ tableNumber: fromTableNumber, active: true }),
      Table.findOne({ tableNumber: toTableNumber, active: true }),
    ]);

    if (!fromTable) return res.status(404).json({ error: `Source Table ${fromTableNumber} not found.` });
    if (!toTable) return res.status(404).json({ error: `Destination Table ${toTableNumber} not found.` });

    const result = await Order.updateMany(
      {
        tableNumber: fromTableNumber,
        orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      },
      {
        $set: { tableNumber: toTableNumber },
      }
    );

    fromTable.status = 'AVAILABLE';
    toTable.status = 'OCCUPIED';
    await Promise.all([fromTable.save(), toTable.save()]);

    await writeAuditLog({
      actor: req.user,
      action: 'table.transferred',
      targetType: 'Table',
      targetId: toTable._id,
      details: { fromTableNumber, toTableNumber, transferredCount: result.modifiedCount },
    });

    res.json({
      success: true,
      message: `Successfully transferred ${result.modifiedCount} active order(s) from Table ${fromTableNumber} to Table ${toTableNumber}.`,
      transferredCount: result.modifiedCount,
      fromTable,
      toTable,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tables/merge — admin/staff (Merge open orders into target table)
router.post('/merge', protect, ownerOrManager, async (req, res) => {
  try {
    const sourceTableNumber = Number(req.body.sourceTableNumber);
    const targetTableNumber = Number(req.body.targetTableNumber);

    if (!sourceTableNumber || !targetTableNumber) {
      return res.status(400).json({ error: 'Both sourceTableNumber and targetTableNumber are required.' });
    }
    if (sourceTableNumber === targetTableNumber) {
      return res.status(400).json({ error: 'Source and target tables must be different.' });
    }

    const [sourceTable, targetTable] = await Promise.all([
      Table.findOne({ tableNumber: sourceTableNumber, active: true }),
      Table.findOne({ tableNumber: targetTableNumber, active: true }),
    ]);

    if (!sourceTable) return res.status(404).json({ error: `Source Table ${sourceTableNumber} not found.` });
    if (!targetTable) return res.status(404).json({ error: `Target Table ${targetTableNumber} not found.` });

    const result = await Order.updateMany(
      {
        tableNumber: sourceTableNumber,
        orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
      },
      {
        $set: { tableNumber: targetTableNumber },
      }
    );

    sourceTable.status = 'AVAILABLE';
    targetTable.status = 'OCCUPIED';
    await Promise.all([sourceTable.save(), targetTable.save()]);

    res.json({
      success: true,
      message: `Merged ${result.modifiedCount} order(s) into Table ${targetTableNumber}.`,
      mergedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/tables/:id/regenerate-qr — admin/staff
router.post('/:id/regenerate-qr', protect, ownerOrManager, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    const { qrCode, qrUrl } = await generateQR(table, req.tenantId, req.tenant?.slug);
    table.qrCode = qrCode;
    table.qrUrl = qrUrl;
    await table.save();

    res.json({ table });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tables/:id — admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    await writeAuditLog({ actor: req.user, action: 'table.deleted', targetType: 'Table', targetId: table._id, details: { tableNumber: table.tableNumber } });
    res.json({ message: 'Table deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST bulk create tables — admin/staff
router.post('/bulk', protect, ownerOrManager, async (req, res) => {
  try {
    const count = Number(req.body.count);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: 'Count must be an integer between 1 and 100.' });
    }

    const existing = await Table.find().sort({ tableNumber: -1 }).limit(1);
    let startNum = existing.length ? existing[0].tableNumber + 1 : 1;

    const tables = [];
    for (let i = 0; i < count; i++) {
      const tableNumber = startNum + i;
      const tableId = new mongoose.Types.ObjectId();
      const tableObj = { _id: tableId, tableNumber, seats: 4, tenantId: req.tenantId };
      const { qrCode, qrUrl } = await generateQR(tableObj, req.tenantId, req.tenant?.slug);
      tables.push({
        ...tableObj,
        qrCode,
        qrUrl,
        active: true,
      });
    }

    const created = await Table.insertMany(tables);
    res.status(201).json({ tables: created, count: created.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
