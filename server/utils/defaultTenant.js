import Tenant from '../models/Tenant.js';

/**
 * Resolve the café used when a customer request has no explicit tenant.
 * Prefer TENANT_DEFAULT_SLUG so a branded deployment does not silently fall
 * back to the oldest active tenant on the platform.
 */
export const findDefaultTenant = async () => {
  const configuredSlug = String(process.env.TENANT_DEFAULT_SLUG || '').trim().toLowerCase();
  if (configuredSlug) {
    const preferred = await Tenant.findOne({ slug: configuredSlug, status: 'active' }).lean();
    if (preferred) return preferred;
  }
  return (await Tenant.findOne({ slug: 'default', status: 'active' }).lean())
    || (await Tenant.findOne({ status: 'active' }).sort({ createdAt: 1 }).lean());
};

export default findDefaultTenant;
