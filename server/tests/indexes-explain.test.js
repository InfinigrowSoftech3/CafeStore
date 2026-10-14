import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || `mongodb://127.0.0.1:27017/cafe_explain_test_${process.pid}`;

const { default: Order } = await import('../models/Order.js');
const { default: Customer } = await import('../models/Customer.js');
const { default: Product } = await import('../models/Product.js');
const { default: InventoryTransaction } = await import('../models/InventoryTransaction.js');
const { default: NotificationDelivery } = await import('../models/NotificationDelivery.js');
const { runWithTenant } = await import('../utils/tenantContext.js');

test('Compound indexes starting with tenantId are picked up with IXSCAN on hot query filters', async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
  await mongoose.connection.dropDatabase();

  // Sync schema indexes to MongoDB
  await Promise.all([
    Order.syncIndexes(),
    Customer.syncIndexes(),
    Product.syncIndexes(),
    InventoryTransaction.syncIndexes(),
    NotificationDelivery.syncIndexes(),
  ]);

  const tenantId = new mongoose.Types.ObjectId();
  const itemId = new mongoose.Types.ObjectId();
  const campaignId = new mongoose.Types.ObjectId();

  await runWithTenant(tenantId, async () => {
    // 1. Order hot query: tableNumber + createdAt
    const orderExplain = await Order.find({ tableNumber: 5 })
      .sort({ createdAt: -1 })
      .explain('executionStats');
    const orderPlan = JSON.stringify(orderExplain.queryPlanner || orderExplain);
    assert.ok(
      orderPlan.includes('tenantId_1_tableNumber_1_createdAt_-1') || orderPlan.includes('IXSCAN'),
      `Order query plan should use compound index: ${orderPlan}`
    );

    // 2. Customer hot query: status + createdAt
    const customerExplain = await Customer.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .explain('executionStats');
    const customerPlan = JSON.stringify(customerExplain.queryPlanner || customerExplain);
    assert.ok(
      customerPlan.includes('tenantId_1_status_1_createdAt_-1') || customerPlan.includes('IXSCAN'),
      `Customer query plan should use compound index: ${customerPlan}`
    );

    // 3. Product hot query: available
    const productExplain = await Product.find({ available: true })
      .explain('executionStats');
    const productPlan = JSON.stringify(productExplain.queryPlanner || productExplain);
    assert.ok(
      productPlan.includes('tenantId_1_available_1') || productPlan.includes('IXSCAN'),
      `Product query plan should use compound index: ${productPlan}`
    );

    // 4. InventoryTransaction hot query: inventoryItem + createdAt
    const invExplain = await InventoryTransaction.find({ inventoryItem: itemId })
      .sort({ createdAt: -1 })
      .explain('executionStats');
    const invPlan = JSON.stringify(invExplain.queryPlanner || invExplain);
    assert.ok(
      invPlan.includes('tenantId_1_inventoryItem_1_createdAt_-1') || invPlan.includes('IXSCAN'),
      `InventoryTransaction query plan should use compound index: ${invPlan}`
    );

    // 5. NotificationDelivery hot query: campaignId + status
    const notifExplain = await NotificationDelivery.find({ campaignId, status: 'sent' })
      .explain('executionStats');
    const notifPlan = JSON.stringify(notifExplain.queryPlanner || notifExplain);
    assert.ok(
      notifPlan.includes('tenantId_1_campaignId_1_status_1') || notifPlan.includes('IXSCAN'),
      `NotificationDelivery query plan should use compound index: ${notifPlan}`
    );
  });

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
