/**
 * Production Environment Configuration Validator
 * Refuses server startup when running in production with unsafe or default credentials.
 */

export const validateEnv = (env = process.env) => {
  if (env.NODE_ENV !== 'production') {
    return { valid: true, errors: [] };
  }

  const errors = [];

  // 1. JWT_SECRET
  const jwtSecret = env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters long.');
  } else if (jwtSecret === 'your_jwt_secret_here_min_32_chars') {
    errors.push('JWT_SECRET cannot be the default placeholder value from .env.example.');
  }

  // 2. TABLE_QR_SECRET
  const tableQrSecret = env.TABLE_QR_SECRET || '';
  if (!tableQrSecret || tableQrSecret.length < 32) {
    errors.push('TABLE_QR_SECRET is required and must be at least 32 characters long.');
  } else if (tableQrSecret === 'your_table_qr_signing_secret_min_32_chars') {
    errors.push('TABLE_QR_SECRET cannot be the default placeholder value from .env.example.');
  }

  // 3. TENANT_CREDENTIALS_ENCRYPTION_KEY
  const tenantKey = env.TENANT_CREDENTIALS_ENCRYPTION_KEY || '';
  if (!tenantKey || tenantKey.length < 32) {
    errors.push('TENANT_CREDENTIALS_ENCRYPTION_KEY is required and must be at least 32 characters long.');
  } else if (tenantKey === 'replace_with_32_byte_base64_key') {
    errors.push('TENANT_CREDENTIALS_ENCRYPTION_KEY cannot be the default placeholder value from .env.example.');
  }

  // 4. SUPER_ADMIN_PASSWORD
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD || '';
  if (!superAdminPassword || superAdminPassword.length < 8) {
    errors.push('SUPER_ADMIN_PASSWORD is required and must be at least 8 characters long.');
  } else if (['password', 'admin', 'superadmin', '12345678', 'SuperAdminTestPass123!'].includes(superAdminPassword)) {
    errors.push('SUPER_ADMIN_PASSWORD cannot be a weak or example default password.');
  }

  // 5. MONGO_URI
  const mongoUri = env.MONGO_URI || '';
  if (!mongoUri) {
    errors.push('MONGO_URI is required in production.');
  } else if (mongoUri.includes('<username>') || mongoUri.includes('<password>') || mongoUri.includes('<cluster>')) {
    errors.push('MONGO_URI cannot contain placeholder values (<username>, <password>, <cluster>) from .env.example.');
  }

  // 6. REDIS_URL
  const redisUrl = env.REDIS_URL || '';
  if (!redisUrl) {
    errors.push('REDIS_URL is required in production.');
  }

  // 7. CORS Origins
  const clientUrl = env.CLIENT_URL || '';
  const allowedOrigins = env.STAGING_ALLOWED_ORIGINS || env.ALLOWED_ORIGINS || '';
  if (!clientUrl && !allowedOrigins) {
    errors.push('CORS origins are required in production (CLIENT_URL must be configured).');
  }

  // 8. Live Razorpay Keys
  const razorpayKeyId = env.RAZORPAY_KEY_ID || '';
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET || '';

  if (!razorpayKeyId) {
    errors.push('RAZORPAY_KEY_ID is required in production.');
  } else if (razorpayKeyId.startsWith('rzp_test_')) {
    errors.push('RAZORPAY_KEY_ID must be a live key in production (cannot start with rzp_test_).');
  } else if (razorpayKeyId.includes('xxxx')) {
    errors.push('RAZORPAY_KEY_ID cannot contain placeholder characters (xxxx).');
  }

  if (!razorpayKeySecret) {
    errors.push('RAZORPAY_KEY_SECRET is required in production.');
  } else if (
    razorpayKeySecret === 'your_razorpay_secret' ||
    razorpayKeySecret === 'placeholder_secret' ||
    razorpayKeySecret.startsWith('test_')
  ) {
    errors.push('RAZORPAY_KEY_SECRET cannot be a placeholder or test secret in production.');
  }

  if (errors.length > 0) {
    const message =
      `[Brewhaus Production Config Error] Refusing to boot with unsafe configuration. Found ${errors.length} violation(s):\n` +
      errors.map((err, i) => `  ${i + 1}. ${err}`).join('\n');
    const error = new Error(message);
    error.code = 'UNSAFE_PRODUCTION_CONFIG';
    error.errors = errors;
    throw error;
  }

  return { valid: true, errors: [] };
};

export default validateEnv;
