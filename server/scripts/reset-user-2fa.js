import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import { runWithSystemTenantAccess } from '../utils/tenantContext.js';

async function main() {
  const email = process.argv[2] || 'dhruvilkyada483@gmail.com';
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB!');

  await runWithSystemTenantAccess(async () => {
    const user = await User.findOne({ email }).select(
      '+twoFactorSecretEncrypted +twoFactorPendingSecretEncrypted +twoFactorLastCodeStep +recoveryCodes'
    );

    if (!user) {
      console.log(`User with email "${email}" not found.`);
      return;
    }

    console.log(`Current state for ${email}:`, {
      id: user._id,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      hasSecret: Boolean(user.twoFactorSecretEncrypted),
      hasPending: Boolean(user.twoFactorPendingSecretEncrypted),
      recoveryCodesCount: user.recoveryCodes?.length || 0,
      verifiedAt: user.twoFactorVerifiedAt,
      disabledAt: user.twoFactorDisabledAt,
    });

    console.log(`\nResetting 2FA for ${email}...`);
    user.twoFactorEnabled = false;
    user.twoFactorSecretEncrypted = '';
    user.twoFactorPendingSecretEncrypted = '';
    user.twoFactorVerifiedAt = null;
    user.twoFactorDisabledAt = null;
    user.twoFactorLastCodeStep = 0;
    user.recoveryCodes = [];

    await user.save();
    console.log(`Successfully reset 2FA for ${email}! The user can now log in directly with password and configure a fresh authenticator.`);
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
