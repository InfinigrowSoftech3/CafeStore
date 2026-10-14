import mongoose from 'mongoose';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import Tenant from '../models/Tenant.js';
import DiningSession from '../models/DiningSession.js';
import { publishTableStatus } from './liveUpdates.js';

/**
 * Synchronizes a table's occupancy status and active bill based on current orders.
 *
 * Lifecycle:
 * AVAILABLE -> OCCUPIED -> WAITING_PAYMENT -> CLEANING (or AVAILABLE) -> AVAILABLE
 */
export const syncTableStatusForOrder = async (tableNumber, tenantId, { session = null, trigger = 'order_change' } = {}) => {
  if (!tableNumber || !tenantId) return null;

  const table = await Table.findOne({ tableNumber, tenantId }).session(session);
  if (!table) return null;

  // Don't override manual maintenance states
  if (['DISABLED', 'RESERVED'].includes(table.status)) {
    return table;
  }

  // Find all non-cancelled orders for this table
  const query = {
    tenantId,
    tableNumber,
    orderStatus: { $ne: 'cancelled' },
  };

  const orders = await Order.find(query).sort({ createdAt: 1 }).session(session).lean();

  // Active unpaid orders that keep a table occupied and accrue a balance
  const unpaidOrders = orders.filter((o) => o.paymentStatus !== 'paid' && o.orderStatus !== 'completed');
  const currentBillAmount = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const tenant = await Tenant.findById(tenantId).select('settings.tableSettings').session(session).lean();
  const cleaningStepEnabled = tenant?.settings?.tableSettings?.cleaningStepEnabled !== false;

  if (unpaidOrders.length > 0) {
    // Table is in service with open tab
    const requestedBill = table.status === 'WAITING_PAYMENT' || orders.some((o) => o.paymentStatus === 'payment_pending');
    table.status = requestedBill ? 'WAITING_PAYMENT' : 'OCCUPIED';
    table.paidAt = null;
  } else {
    // All orders are paid, completed, or cancelled
    if (orders.length > 0 || ['OCCUPIED', 'WAITING_PAYMENT'].includes(table.status)) {
      if (cleaningStepEnabled) {
        table.status = 'CLEANING';
        if (!table.paidAt) table.paidAt = new Date();
      } else {
        table.status = 'AVAILABLE';
        table.currentSessionId = null;
        table.paidAt = null;
        await DiningSession.updateMany(
          { tableNumber, tenantId, status: { $ne: 'CLOSED' } },
          { $set: { status: 'CLOSED', closedAt: new Date() } },
          { session }
        );
      }
    }
  }

  await table.save({ session });
  publishTableStatus(table);
  return { table, currentBillAmount, unpaidOrdersCount: unpaidOrders.length };
};

/**
 * Staff manual action: One-click "Cleaned / Mark Available"
 */
export const markTableCleanedAndAvailable = async (tableId, tenantId, userId = null, { force = false } = {}) => {
  const table = await Table.findOne({ _id: tableId, tenantId });
  if (!table) {
    const error = new Error('Table not found.');
    error.status = 404;
    throw error;
  }

  // Guard: Never free a table that still has open unpaid orders unless force is requested
  const activeUnpaidOrders = await Order.find({
    tenantId,
    tableNumber: table.tableNumber,
    orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
    paymentStatus: { $ne: 'paid' },
  });

  if (activeUnpaidOrders.length > 0) {
    if (!force) {
      const error = new Error('Cannot mark table as Available while an active unpaid order exists.');
      error.code = 'UNPAID_ORDERS_EXIST';
      error.status = 400;
      throw error;
    }
    // Force: automatically settle active unpaid orders on table
    for (const ord of activeUnpaidOrders) {
      ord.orderStatus = 'completed';
      ord.paymentStatus = 'paid';
      await ord.save();
    }
  }

  // Reset table to Available and clear session
  table.status = 'AVAILABLE';
  table.currentSessionId = null;
  table.paidAt = null;
  await table.save();

  // Close any remaining active or open dining sessions on this table
  await DiningSession.updateMany(
    { tableNumber: table.tableNumber, tenantId, status: { $ne: 'CLOSED' } },
    { $set: { status: 'CLOSED', closedAt: new Date(), closedBy: userId } }
  );

  publishTableStatus(table);
  return table;
};

/**
 * Staff manual action: Clear, settle, or cancel an active table tab and free table
 */
export const clearTableTab = async (tableId, tenantId, action = 'settle', userId = null) => {
  const table = await Table.findOne({ _id: tableId, tenantId });
  if (!table) {
    const error = new Error('Table not found.');
    error.status = 404;
    throw error;
  }

  const activeOrders = await Order.find({
    tenantId,
    tableNumber: table.tableNumber,
    orderStatus: { $ne: 'cancelled' },
    paymentStatus: { $ne: 'paid' },
  });

  for (const ord of activeOrders) {
    if (action === 'cancel') {
      ord.orderStatus = 'cancelled';
    } else {
      ord.orderStatus = 'completed';
      ord.paymentStatus = 'paid';
    }
    await ord.save();
  }

  table.status = 'AVAILABLE';
  table.currentSessionId = null;
  table.paidAt = null;
  await table.save();

  await DiningSession.updateMany(
    { tableNumber: table.tableNumber, tenantId, status: { $ne: 'CLOSED' } },
    { $set: { status: 'CLOSED', closedAt: new Date(), closedBy: userId } }
  );

  publishTableStatus(table);
  return { table, clearedCount: activeOrders.length, action };
};

/**
 * Checks if a table in CLEANING should be auto-released back to AVAILABLE
 */
export const checkAutoRelease = async (table, autoReleaseMinutes = 5) => {
  if (table.status !== 'CLEANING' || autoReleaseMinutes <= 0) return false;

  const refTime = table.paidAt ? new Date(table.paidAt).getTime() : new Date(table.updatedAt).getTime();
  const elapsedMs = Date.now() - refTime;
  const timeoutMs = autoReleaseMinutes * 60 * 1000;

  if (elapsedMs >= timeoutMs) {
    table.status = 'AVAILABLE';
    table.currentSessionId = null;
    table.paidAt = null;
    await table.save();

    await DiningSession.updateMany(
      { tableNumber: table.tableNumber, tenantId: table.tenantId, status: { $ne: 'CLOSED' } },
      { $set: { status: 'CLOSED', closedAt: new Date() } }
    );

    publishTableStatus(table);
    return true;
  }
  return false;
};

/**
 * Reconciles and repairs existing stuck tables (e.g. T1, T2 stuck in OCCUPIED with no unpaid orders)
 */
export const resetStuckTables = async (tenantId = null) => {
  const filter = {
    status: { $in: ['OCCUPIED', 'WAITING_PAYMENT', 'CLEANING'] },
    active: true,
  };
  if (tenantId) filter.tenantId = tenantId;

  const tables = await Table.find(filter);
  const healed = [];

  for (const table of tables) {
    // Only orders within last 18 hours or active session
    const activeUnpaidOrders = await Order.find({
      tenantId: table.tenantId,
      tableNumber: table.tableNumber,
      orderStatus: { $nin: ['completed', 'cancelled'] },
      paymentStatus: { $ne: 'paid' },
      createdAt: { $gt: new Date(Date.now() - 18 * 60 * 60 * 1000) },
    }).lean();

    if (activeUnpaidOrders.length === 0) {
      // Also settle any ancient orders (> 18h)
      await Order.updateMany(
        {
          tenantId: table.tenantId,
          tableNumber: table.tableNumber,
          orderStatus: { $nin: ['completed', 'cancelled'] },
          paymentStatus: { $ne: 'paid' },
          createdAt: { $lte: new Date(Date.now() - 18 * 60 * 60 * 1000) },
        },
        { $set: { orderStatus: 'completed', paymentStatus: 'paid' } }
      );

      table.status = 'AVAILABLE';
      table.currentSessionId = null;
      table.paidAt = null;
      await table.save();

      await DiningSession.updateMany(
        { tableNumber: table.tableNumber, tenantId: table.tenantId, status: { $ne: 'CLOSED' } },
        { $set: { status: 'CLOSED', closedAt: new Date() } }
      );

      publishTableStatus(table);
      healed.push(table.tableNumber);
    }
  }

  return healed;
};
