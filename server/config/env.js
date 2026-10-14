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

  // 2. TABLE_QR_SECRET (falls back to JWT_SECRET if not explicitly set)
  const tableQrSecret = env.TABLE_QR_SECRET || env.JWT_SECRET || '';
  if (!tableQrSecret || tableQrSecret.length < 32) {
    errors.push('TABLE_QR_SECRET (or JWT_SECRET) is required and must be at least 32 characters long.');
  } else if (tableQrSecret === 'your_table_qr_signing_secret_min_32_chars') {
    errors.push('TABLE_QR_SECRET cannot be the default placeholder value from .env.example.');
  }

  // 3. TENANT_CREDENTIALS_ENCRYPTION_KEY (falls back to JWT_SECRET if not explicitly set)
  const tenantKey = env.TENANT_CREDENTIALS_ENCRYPTION_KEY || env.JWT_SECRET || '';
  if (!tenantKey || tenantKey.length < 32) {
    errors.push('TENANT_CREDENTIALS_ENCRYPTION_KEY (or JWT_SECRET) is required and must be at least 32 characters long.');
  } else if (tenantKey === 'replace_with_32_byte_base64_key') {
    errors.push('TENANT_CREDENTIALS_ENCRYPTION_KEY cannot be the default placeholder value from .env.example.');
  }

  // 4. SUPER_ADMIN_PASSWORD (only validated if supplied; auto-bootstrap disabled if omitted)
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD || '';
  if (superAdminPassword) {
    if (superAdminPassword.length < 8) {
      errors.push('SUPER_ADMIN_PASSWORD must be at least 8 characters long.');
    } else if (['password', 'admin', 'superadmin', '12345678', 'SuperAdminTestPass123!'].includes(superAdminPassword)) {
      errors.push('SUPER_ADMIN_PASSWORD cannot be a weak or example default password.');
    }
  }

  // 5. MONGO_URI
  const mongoUri = env.MONGO_URI || '';
  if (!mongoUri) {
    errors.push('MONGO_URI is required in production.');
  } else if (mongoUri.includes('<username>') || mongoUri.includes('<password>') || mongoUri.includes('<cluster>')) {
    errors.push('MONGO_URI cannot contain placeholder values (<username>, <password>, <cluster>) from .env.example.');
  }

  // 6. REDIS_URL (optional: in-memory store and pub/sub fallback enabled when omitted)
  const redisUrl = env.REDIS_URL || '';
  if (!redisUrl) {
    if (env.REQUIRE_REDIS === 'true') {
      errors.push('REDIS_URL is required in production when REQUIRE_REDIS=true.');
    } else {
      console.warn('[Brewhaus Config Warning] REDIS_URL is not configured. Running with in-memory stores for rate limiting and live updates.');
    }
  }

  // 7. CORS Origins
  const clientUrl = env.CLIENT_URL || '';
  const allowedOrigins = env.STAGING_ALLOWED_ORIGINS || env.ALLOWED_ORIGINS || '';
  if (!clientUrl && !allowedOrigins) {
    errors.push('CORS origins are required in production (CLIENT_URL must be configured).');
  }

  // 8. Razorpay Keys
  const razorpayKeyId = env.RAZORPAY_KEY_ID || '';
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET || '';
  const allowTestPayments =
    env.ALLOW_TEST_PAYMENTS === 'true' ||
    env.ALLOW_TEST_KEYS === 'true' ||
    env.DEMO_PAYMENTS_ENABLED === 'true' ||
    Boolean(env.RENDER) ||
    Boolean(env.VERCEL) ||
    Boolean(env.SERVER_URL && env.SERVER_URL.includes('onrender.com'));

  if (!razorpayKeyId) {
    if (!allowTestPayments) {
      errors.push('RAZORPAY_KEY_ID is required in production.');
    } else {
      console.warn('[Brewhaus Config Warning] RAZORPAY_KEY_ID is missing. Online payments will be disabled.');
    }
  } else if (razorpayKeyId.startsWith('rzp_test_')) {
    if (!allowTestPayments) {
      errors.push('RAZORPAY_KEY_ID must be a live key in production (cannot start with rzp_test_), or set ALLOW_TEST_PAYMENTS=true for sandbox/testing.');
    } else {
      console.warn('[Brewhaus Config Warning] Running in production with Razorpay TEST key (rzp_test_...). Sandbox payments enabled.');
    }
  } else if (razorpayKeyId.includes('xxxx')) {
    errors.push('RAZORPAY_KEY_ID cannot contain placeholder characters (xxxx).');
  }

  if (!razorpayKeySecret) {
    if (!allowTestPayments) {
      errors.push('RAZORPAY_KEY_SECRET is required in production.');
    } else {
      console.warn('[Brewhaus Config Warning] RAZORPAY_KEY_SECRET is missing. Online payments will be disabled.');
    }
  } else if (
    razorpayKeySecret === 'your_razorpay_secret' ||
    razorpayKeySecret === 'placeholder_secret'
  ) {
    if (!allowTestPayments) {
      errors.push('RAZORPAY_KEY_SECRET cannot be a placeholder secret in production.');
    } else {
      console.warn('[Brewhaus Config Warning] RAZORPAY_KEY_SECRET is a placeholder secret. Online payments will fail until configured.');
    }
  } else if (razorpayKeySecret.startsWith('test_')) {
    if (!allowTestPayments) {
      errors.push('RAZORPAY_KEY_SECRET cannot be a test secret in production (set ALLOW_TEST_PAYMENTS=true for sandbox/testing).');
    } else {
      console.warn('[Brewhaus Config Warning] Running with Razorpay test secret. Sandbox payments enabled.');
    }
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
