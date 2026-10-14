/**
 * Migration: 20261013_compound_indexes.js
 * Adds compound indexes starting with tenantId on hot query filters across:
 * - orders
 * - customers
 * - products
 * - inventorytransactions
 * - notificationdeliveries
 *
 * Idempotent with rollback capability (--rollback).
 * DO NOT RUN AGAINST PRODUCTION WITHOUT PROPER AUTHORIZATION.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

export const COMPOUND_INDEX_DEFINITIONS = [
  // Orders
  {
    collection: 'orders',
    key: { tenantId: 1, tableNumber: 1, createdAt: -1 },
    name: 'tenantId_1_tableNumber_1_createdAt_-1',
  },
  {
    collection: 'orders',
    key: { tenantId: 1, diningSessionId: 1, createdAt: -1 },
    name: 'tenantId_1_diningSessionId_1_createdAt_-1',
  },
  {
    collection: 'orders',
    key: { tenantId: 1, customerId: 1, createdAt: -1 },
    name: 'tenantId_1_customerId_1_createdAt_-1',
  },

  // Customers
  {
    collection: 'customers',
    key: { tenantId: 1, status: 1, createdAt: -1 },
    name: 'tenantId_1_status_1_createdAt_-1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, marketingConsent: 1, status: 1 },
    name: 'tenantId_1_marketingConsent_1_status_1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, notificationPermission: 1, status: 1 },
    name: 'tenantId_1_notificationPermission_1_status_1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, createdAt: -1 },
    name: 'tenantId_1_createdAt_-1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, totalSpent: -1 },
    name: 'tenantId_1_totalSpent_-1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, totalOrders: -1 },
    name: 'tenantId_1_totalOrders_-1',
  },
  {
    collection: 'customers',
    key: { tenantId: 1, lastOrderAt: -1 },
    name: 'tenantId_1_lastOrderAt_-1',
  },

  // Products
  {
    collection: 'products',
    key: { tenantId: 1, available: 1 },
    name: 'tenantId_1_available_1',
  },
  {
    collection: 'products',
    key: { tenantId: 1, popular: 1 },
    name: 'tenantId_1_popular_1',
  },
  {
    collection: 'products',
    key: { tenantId: 1, kitchenStation: 1 },
    name: 'tenantId_1_kitchenStation_1',
  },
  {
    collection: 'products',
    key: { tenantId: 1, createdAt: -1 },
    name: 'tenantId_1_createdAt_-1',
  },

  // Inventory Transactions
  {
    collection: 'inventorytransactions',
    key: { tenantId: 1, inventoryItem: 1, createdAt: -1 },
    name: 'tenantId_1_inventoryItem_1_createdAt_-1',
  },
  {
    collection: 'inventorytransactions',
    key: { tenantId: 1, type: 1, createdAt: -1 },
    name: 'tenantId_1_type_1_createdAt_-1',
  },
  {
    collection: 'inventorytransactions',
    key: { tenantId: 1, createdAt: -1 },
    name: 'tenantId_1_createdAt_-1',
  },
  {
    collection: 'inventorytransactions',
    key: { tenantId: 1, orderId: 1 },
    name: 'tenantId_1_orderId_1',
  },

  // Notification Deliveries
  {
    collection: 'notificationdeliveries',
    key: { tenantId: 1, campaignId: 1, status: 1 },
    name: 'tenantId_1_campaignId_1_status_1',
  },
  {
    collection: 'notificationdeliveries',
    key: { tenantId: 1, customerId: 1, createdAt: -1 },
    name: 'tenantId_1_customerId_1_createdAt_-1',
  },
  {
    collection: 'notificationdeliveries',
    key: { tenantId: 1, status: 1, createdAt: -1 },
    name: 'tenantId_1_status_1_createdAt_-1',
  },
  {
    collection: 'notificationdeliveries',
    key: { tenantId: 1, createdAt: -1 },
    name: 'tenantId_1_createdAt_-1',
  },
  {
    collection: 'notificationdeliveries',
    key: { tenantId: 1, subscriptionId: 1 },
    name: 'tenantId_1_subscriptionId_1',
  },
];

export const migrateCompoundIndexes = async () => {
  console.log('[Migration] Applying compound tenant indexes...');
  for (const def of COMPOUND_INDEX_DEFINITIONS) {
    try {
      const coll = mongoose.connection.collection(def.collection);
      await coll.createIndex(def.key, { name: def.name, background: true });
      console.log(`[Migration] Created index: ${def.collection}.${def.name}`);
    } catch (err) {
      console.warn(`[Migration] Notice for index ${def.collection}.${def.name}:`, err.message);
    }
  }
};

export const rollbackCompoundIndexes = async () => {
  console.log('[Rollback] Dropping compound tenant indexes...');
  for (const def of COMPOUND_INDEX_DEFINITIONS) {
    try {
      const coll = mongoose.connection.collection(def.collection);
      await coll.dropIndex(def.name);
      console.log(`[Rollback] Dropped index: ${def.collection}.${def.name}`);
    } catch (err) {
      if (err.codeName !== 'IndexNotFound') {
        console.warn(`[Rollback] Notice for index ${def.collection}.${def.name}:`, err.message);
      }
    }
  }
};

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI);
  if (process.argv.includes('--rollback')) {
    await rollbackCompoundIndexes();
    console.log('[Migration] Rollback completed.');
  } else {
    await migrateCompoundIndexes();
    console.log('[Migration] Compound indexes applied successfully.');
  }
};

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  run()
    .catch((error) => {
      console.error(`Migration failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => mongoose.disconnect());
}
