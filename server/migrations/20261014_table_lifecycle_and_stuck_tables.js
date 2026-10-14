/**
 * Migration: 20261014_table_lifecycle_and_stuck_tables.js
 *
 * 1. Ensures compound index { tenantId: 1, status: 1 } on tables collection.
 * 2. Reconciles and heals existing stuck tables (e.g. T1, T2 stuck in OCCUPIED
 *    or WAITING_PAYMENT with 0 active unpaid orders) back to AVAILABLE.
 * 3. Closes any lingering orphaned dining sessions on healed tables.
 *
 * Idempotent: safe to run multiple times.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetStuckTables } from '../services/tableLifecycle.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

export async function runMigration() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafe-app';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  console.log('[Migration] Connected to MongoDB. Running table lifecycle reconciliation...');

  // Ensure index on tables collection
  try {
    const tableCollection = mongoose.connection.collection('tables');
    await tableCollection.createIndex({ tenantId: 1, status: 1 }, { background: true });
    console.log('[Migration] Ensured index: tenantId_1_status_1 on tables collection');
  } catch (err) {
    console.warn('[Migration] Index creation notice:', err.message);
  }

  // Reconcile and heal stuck tables across all tenants
  const healed = await resetStuckTables();
  console.log(`[Migration] Reconciled and freed ${healed.length} stuck tables:`, healed.length > 0 ? healed.join(', ') : 'None (all tables already in sync)');

  return { success: true, healedCount: healed.length, healedTables: healed };
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMainModule) {
  runMigration()
    .then((result) => {
      console.log('[Migration] Complete:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
