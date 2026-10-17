import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set in environment or .env');
  process.exit(1);
}

// Collections to completely wipe clean for a fresh database
const COLLECTIONS_TO_CLEAR = [
  'tenants',
  'branches',
  'users',
  'categories',
  'products',
  'tables',
  'orders',
  'diningsessions',
  'diningbills',
  'customers',
  'campaigndeliveries',
  'notificationdeliveries',
  'campaigns',
  'notificationcampaigns',
  'pushsubscriptions',
  'inventoryitems',
  'inventorycategories',
  'inventorytransactions',
  'menuinventorymappings',
  'expenses',
  'purchases',
  'suppliers',
  'coupons',
  'reviews',
  'tableservicerequests',
  'payments',
  'paymentledgers',
  'billingwebhookevents',
  'auditevents',
  'platformauditevents',
  'counters',
  'pendingsignups',
  'subscriptions',
  'subscriptioninvoices',
  'usagerecords',
  'contactmessages',
  'galleryitems',
  'marketingsettings',
  'loyaltytransactions',
];

async function cleanDatabase() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  console.log('--- Cleaning all cafes and test data from database ---');
  let totalDeleted = 0;

  for (const colName of COLLECTIONS_TO_CLEAR) {
    try {
      const collection = mongoose.connection.db.collection(colName);
      const count = await collection.countDocuments();
      if (count > 0) {
        const res = await collection.deleteMany({});
        console.log(`✓ Cleared ${colName}: removed ${res.deletedCount} documents`);
        totalDeleted += res.deletedCount;
      } else {
        console.log(`- ${colName} is already empty (0 documents)`);
      }
    } catch (err) {
      console.warn(`Warning clearing ${colName}:`, err.message);
    }
  }

  console.log(`\n✅ Database successfully cleaned! Total documents removed: ${totalDeleted}`);

  // Verify superadmin and platform settings
  const superadminCount = await mongoose.connection.db.collection('superadmins').countDocuments();
  console.log(`Platform superadmins preserved: ${superadminCount}`);

  const settingsCount = await mongoose.connection.db.collection('platformsettings').countDocuments();
  console.log(`Platform settings preserved: ${settingsCount}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

cleanDatabase().catch((err) => {
  console.error('Failed to clean database:', err);
  process.exit(1);
});
