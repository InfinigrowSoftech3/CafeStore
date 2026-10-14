import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import DiningSession from '../models/DiningSession.js';
import { runWithTenant, runWithSystemTenantAccess } from '../utils/tenantContext.js';
import {
  syncTableStatusForOrder,
  markTableCleanedAndAvailable,
  checkAutoRelease,
  resetStuckTables,
} from '../services/tableLifecycle.js';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_lifecycle_${process.pid}`;

test('TABLE LIFECYCLE: State transitions, cleaning step, auto-release & session isolation', async (t) => {
  const uri = process.env.MONGO_URI;
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(uri);
    } catch {
      console.log('Skipping live DB tests: local MongoDB not reachable.');
      return;
    }
  }

  let tenant;
  let tenantId;

  await runWithSystemTenantAccess(async () => {
    tenant = await Tenant.create({
      name: 'Brewhaus Table Test',
      slug: `table-test-${Date.now()}`,
      status: 'active',
      plan: 'pro',
      settings: {
        tableSettings: {
          cleaningStepEnabled: true,
          autoReleaseMinutes: 5,
        },
      },
    });
    tenantId = tenant._id;
  });

  await t.test('1. Unpaid order keeps table OCCUPIED with open balance', async () => {
    await runWithTenant(tenantId, async () => {
      const table = await Table.create({
        tenantId,
        tableNumber: 101,
        seats: 4,
        status: 'AVAILABLE',
      });

      const order = await Order.create({
        tenantId,
        tableNumber: 101,
        orderNumber: 'ORD-101-A',
        orderStatus: 'preparing',
        paymentStatus: 'pending',
        items: [{ name: 'Espresso', price: 150, quantity: 2, itemTotal: 300 }],
        subtotal: 300,
        tax: 15,
        total: 315,
      });

      const result = await syncTableStatusForOrder(101, tenantId);
      assert.equal(result.table.status, 'OCCUPIED');
      assert.equal(result.currentBillAmount, 315);
      assert.equal(result.unpaidOrdersCount, 1);
    });
  });

  await t.test('2. Order paid transitions table to CLEANING (when cleaningStepEnabled: true)', async () => {
    await runWithTenant(tenantId, async () => {
      await Order.updateOne(
        { tenantId, tableNumber: 101, orderNumber: 'ORD-101-A' },
        { $set: { paymentStatus: 'paid', orderStatus: 'completed' } }
      );

      const result = await syncTableStatusForOrder(101, tenantId);
      assert.equal(result.table.status, 'CLEANING');
      assert.equal(result.currentBillAmount, 0);
      assert.equal(result.unpaidOrdersCount, 0);
      assert.ok(result.table.paidAt);
    });
  });

  await t.test('3. Staff marks table Cleaned / Available with one click', async () => {
    await runWithTenant(tenantId, async () => {
      const table = await Table.findOne({ tenantId, tableNumber: 101 });
      const freed = await markTableCleanedAndAvailable(table._id, tenantId);
      assert.equal(freed.status, 'AVAILABLE');
      assert.equal(freed.currentSessionId, null);
      assert.equal(freed.paidAt, null);
    });
  });

  await t.test('4. Guard: Never free a table that still has an active unpaid order', async () => {
    await runWithTenant(tenantId, async () => {
      const table = await Table.create({
        tenantId,
        tableNumber: 102,
        seats: 2,
        status: 'OCCUPIED',
      });

      await Order.create({
        tenantId,
        tableNumber: 102,
        orderNumber: 'ORD-102-UNPAID',
        orderStatus: 'preparing',
        paymentStatus: 'pending',
        items: [{ name: 'Cappuccino', price: 200, quantity: 1, itemTotal: 200 }],
        subtotal: 200,
        tax: 10,
        total: 210,
      });

      await assert.rejects(
        async () => {
          await markTableCleanedAndAvailable(table._id, tenantId);
        },
        (err) => {
          assert.equal(err.code, 'UNPAID_ORDERS_EXIST');
          return true;
        }
      );

      const reloaded = await Table.findById(table._id);
      assert.equal(reloaded.status, 'OCCUPIED');
    });
  });

  await t.test('5. Split bill / multiple orders: free only after ALL orders are settled', async () => {
    await runWithTenant(tenantId, async () => {
      const table = await Table.create({
        tenantId,
        tableNumber: 103,
        seats: 6,
        status: 'OCCUPIED',
      });

      const ord1 = await Order.create({
        tenantId,
        tableNumber: 103,
        orderNumber: 'ORD-103-1',
        orderStatus: 'served',
        paymentStatus: 'paid',
        items: [{ name: 'Croissant', price: 100, quantity: 1, itemTotal: 100 }],
        subtotal: 100,
        tax: 5,
        total: 105,
      });

      const ord2 = await Order.create({
        tenantId,
        tableNumber: 103,
        orderNumber: 'ORD-103-2',
        orderStatus: 'served',
        paymentStatus: 'pending',
        items: [{ name: 'Cold Brew', price: 180, quantity: 1, itemTotal: 180 }],
        subtotal: 180,
        tax: 9,
        total: 189,
      });

      // 1 order is paid, but 1 order is still unpaid
      const intermediate = await syncTableStatusForOrder(103, tenantId);
      assert.equal(intermediate.table.status, 'OCCUPIED');
      assert.equal(intermediate.currentBillAmount, 189);
      assert.equal(intermediate.unpaidOrdersCount, 1);

      // Now settle second order
      await Order.updateOne({ _id: ord2._id }, { $set: { paymentStatus: 'paid', orderStatus: 'completed' } });
      const finalResult = await syncTableStatusForOrder(103, tenantId);
      assert.equal(finalResult.table.status, 'CLEANING');
      assert.equal(finalResult.currentBillAmount, 0);
      assert.equal(finalResult.unpaidOrdersCount, 0);
    });
  });

  await t.test('6. Straight to AVAILABLE when cleaningStepEnabled is false', async () => {
    await runWithSystemTenantAccess(async () => {
      await Tenant.updateOne(
        { _id: tenantId },
        { $set: { 'settings.tableSettings.cleaningStepEnabled': false } }
      );
    });

    await runWithTenant(tenantId, async () => {
      const table = await Table.create({
        tenantId,
        tableNumber: 104,
        seats: 4,
        status: 'OCCUPIED',
      });

      await Order.create({
        tenantId,
        tableNumber: 104,
        orderNumber: 'ORD-104-FAST',
        orderStatus: 'completed',
        paymentStatus: 'paid',
        items: [{ name: 'Latte', price: 160, quantity: 1, itemTotal: 160 }],
        subtotal: 160,
        tax: 8,
        total: 168,
      });

      const result = await syncTableStatusForOrder(104, tenantId);
      assert.equal(result.table.status, 'AVAILABLE');
      assert.equal(result.currentBillAmount, 0);
    });
  });

  await t.test('7. Auto-release table after timeout', async () => {
    await runWithTenant(tenantId, async () => {
      const pastTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      const table = await Table.create({
        tenantId,
        tableNumber: 105,
        seats: 4,
        status: 'CLEANING',
        paidAt: pastTime,
      });

      const released = await checkAutoRelease(table, 5); // 5 min timeout
      assert.equal(released, true);
      assert.equal(table.status, 'AVAILABLE');
    });
  });

  await t.test('8. Reconcile stuck tables (T1, T2 stuck with 0 active unpaid orders)', async () => {
    await runWithTenant(tenantId, async () => {
      // Simulate stuck tables with no active unpaid orders
      await Table.create([
        { tenantId, tableNumber: 1, seats: 4, status: 'OCCUPIED' },
        { tenantId, tableNumber: 2, seats: 2, status: 'WAITING_PAYMENT' },
      ]);

      const healed = await resetStuckTables(tenantId);
      assert.ok(healed.includes(1));
      assert.ok(healed.includes(2));

      const t1 = await Table.findOne({ tenantId, tableNumber: 1 });
      const t2 = await Table.findOne({ tenantId, tableNumber: 2 });
      assert.equal(t1.status, 'AVAILABLE');
      assert.equal(t2.status, 'AVAILABLE');
    });
  });

  await t.test('9. New customer scanning QR on an Available table starts a fresh clean session', async () => {
    await runWithTenant(tenantId, async () => {
      // Create table in AVAILABLE status
      const table = await Table.create({
        tenantId,
        tableNumber: 106,
        seats: 4,
        status: 'AVAILABLE',
        currentSessionId: null,
      });

      // Old session from a previous visit
      const oldSession = await DiningSession.create({
        tenantId,
        tableNumber: 106,
        tokenHash: 'old_stale_hash_from_previous_guest',
        status: 'CLOSED',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // When table is AVAILABLE, new customer scan must create a fresh session
      const freshSession = await DiningSession.create({
        tenantId,
        tableNumber: 106,
        tokenHash: 'fresh_customer_token_hash',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000),
      });

      table.currentSessionId = freshSession._id;
      table.status = 'AVAILABLE';
      await table.save();

      assert.notEqual(String(table.currentSessionId), String(oldSession._id));
      assert.equal(String(table.currentSessionId), String(freshSession._id));

      // No old orders should be attached to this session
      const ordersInSession = await Order.find({ diningSessionId: freshSession._id });
      assert.equal(ordersInSession.length, 0);
    });
  });

  await runWithSystemTenantAccess(async () => {
    await Order.deleteMany({ tenantId });
    await Table.deleteMany({ tenantId });
    await DiningSession.deleteMany({ tenantId });
    await Tenant.deleteOne({ _id: tenantId });
  });

  await mongoose.connection.close();
});
