import crypto from 'crypto';

const getKey = () => {
  const value = process.env.TENANT_CREDENTIALS_ENCRYPTION_KEY || '';
  let key;
  if (/^[a-f\d]{64}$/i.test(value)) key = Buffer.from(value, 'hex');
  else if (value) {
    try { key = Buffer.from(value, 'base64'); } catch { key = Buffer.alloc(0); }
  }
  if (!key || key.length !== 32) {
    key = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'cafe-platform-tenant-secrets-salt-2026').digest();
  }
  return key;
};

export const encryptTenantCredentials = (credentials) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
};

export const decryptTenantCredentials = (stored) => {
  if (!stored) return { keyId: '', keySecret: '', webhookSecret: '' };
  const [ivText, tagText, dataText] = String(stored).split('.');
  if (!ivText || !tagText || !dataText) throw new Error('Stored payment credentials are invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataText, 'base64url')), decipher.final()]).toString('utf8'));
};

export const publicTenantSettings = (tenant) => {
  if (!tenant) return null;
  return {
    id: String(tenant._id || ''),
    slug: tenant.slug || '',
    status: tenant.status || 'active',
    name: tenant.settings?.cafeName || tenant.name || 'Café',
    logoUrl: tenant.settings?.logoUrl || '',
    heroImageUrl: tenant.settings?.heroImageUrl || '',
    tagline: tenant.settings?.tagline || '',
    primaryColor: tenant.settings?.primaryColor || '#c96b18',
    accentColor: tenant.settings?.accentColor || '#1a0f08',
    currency: tenant.settings?.currency || 'INR',
    timezone: tenant.settings?.timezone || 'Asia/Kolkata',
    gstNumber: tenant.settings?.gstNumber || '',
    taxRate: Number(tenant.settings?.taxRate ?? 5),
    address: tenant.settings?.address || '',
    contactEmail: tenant.settings?.contactEmail || '',
    contactPhone: tenant.settings?.contactPhone || '',
    openingHours: tenant.settings?.openingHours || {},
    tableSettings: {
      cleaningStepEnabled: tenant.settings?.tableSettings?.cleaningStepEnabled !== false,
      autoReleaseMinutes: Number(tenant.settings?.tableSettings?.autoReleaseMinutes ?? 5),
    },
  };
};
