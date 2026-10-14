import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Tenant from '../models/Tenant.js';
import Table from '../models/Table.js';
import Order from '../models/Order.js';
import DiningSession from '../models/DiningSession.js';
import { encryptTenantCredentials } from '../utils/tenantSecrets.js';
import { runWithSystemTenantAccess } from '../utils/tenantContext.js';

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  await runWithSystemTenantAccess(async () => {
    // 1. Inspect Tenants
    const tenants = await Tenant.find({}).lean();
    console.log(`\nFound ${tenants.length} tenants:`);
    for (const t of tenants) {
      console.log(`- ID: ${t._id}, Name: "${t.name}", Slug: "${t.slug}", Status: ${t.status}`);
    }

    // 2. Add Razorpay test credentials to all tenants
    const testKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TmatdXAEohz9Gw';
    const testKeySecret = process.env.RAZORPAY_KEY_SECRET || 'ENq91PXgDgahd6N49PQAROBz';
    const testWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'brewhauscafe';

    console.log(`\nApplying Razorpay test credentials (${testKeyId}) to all tenants...`);
    const encrypted = encryptTenantCredentials({
      keyId: testKeyId,
      keySecret: testKeySecret,
      webhookSecret: testWebhookSecret,
    });

    for (const t of tenants) {
      await Tenant.updateOne(
        { _id: t._id },
        { $set: { paymentCredentialsEncrypted: encrypted } }
      );
      console.log(`✓ Updated payment credentials for tenant: ${t.name} (${t.slug})`);
    }

    // 3. Inspect Tables & Orders
    console.log('\nInspecting tables across all tenants...');
    const tables = await Table.find({ active: true }).sort({ tenantId: 1, tableNumber: 1 });
    for (const tbl of tables) {
      const orders = await Order.find({
        tenantId: tbl.tenantId,
        tableNumber: tbl.tableNumber,
        orderStatus: { $ne: 'cancelled' },
      }).lean();

      const unpaid = orders.filter((o) => o.paymentStatus !== 'paid' && o.orderStatus !== 'completed');
      const unpaidTotal = unpaid.reduce((s, o) => s + (o.total || 0), 0);
      console.log(`- Table T${tbl.tableNumber} (ID: ${tbl._id}, Status: ${tbl.status}, Tenant: ${tbl.tenantId}): ${orders.length} total orders, ${unpaid.length} unpaid (Total: ₹${unpaidTotal})`);
      for (const u of unpaid) {
        console.log(`    * Order #${u.orderNumber}: ₹${u.total}, orderStatus=${u.orderStatus}, paymentStatus=${u.paymentStatus}, createdAt=${u.createdAt}`);
      }
    }

    // 4. Clean up stuck test orders for Velvet (tenant 6ac61d8032404ed2119f4fa8) on T1 and T2
    console.log('\nCleaning up stuck test orders for Velvet on T1 and T2...');
    const velvetTenantId = new mongoose.Types.ObjectId('6ac61d8032404ed2119f4fa8');
    const updateResult = await Order.collection.updateMany(
      {
        tenantId: velvetTenantId,
        tableNumber: { $in: [1, 2] },
        paymentStatus: { $ne: 'paid' },
      },
      {
        $set: {
          orderStatus: 'completed',
          paymentStatus: 'paid',
          updatedAt: new Date(),
        },
      }
    );
    console.log(`✓ Settled stuck orders for Velvet:`, updateResult);

    // Also settle any orders across all tenants that are pending test orders older than 2 days
    const staleOrdersResult = await Order.collection.updateMany(
      {
        orderStatus: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'delivered'] },
        paymentStatus: { $ne: 'paid' },
        createdAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      {
        $set: {
          orderStatus: 'completed',
          paymentStatus: 'paid',
          updatedAt: new Date(),
        },
      }
    );
    console.log(`✓ Settled stale orders across tenants:`, staleOrdersResult);

    // 5. Reset Velvet tables to AVAILABLE
    const updatedTables = await Table.collection.updateMany(
      { tenantId: velvetTenantId, tableNumber: { $in: [1, 2] } },
      { $set: { status: 'AVAILABLE', currentSessionId: null, paidAt: null } }
    );
    console.log(`✓ Reset Velvet tables to AVAILABLE:`, updatedTables);

    await DiningSession.collection.updateMany(
      { tenantId: velvetTenantId, tableNumber: { $in: [1, 2] }, status: { $ne: 'CLOSED' } },
      { $set: { status: 'CLOSED', closedAt: new Date() } }
    );
  });

  console.log('\nDone! Closing DB connection.');
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
