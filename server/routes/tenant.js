import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant.js';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { decryptTenantCredentials, encryptTenantCredentials, publicTenantSettings } from '../utils/tenantSecrets.js';
import { verifyTableQrToken } from '../utils/tableQr.js';

const router = express.Router();

router.get('/public', async (req, res, next) => {
  try {
    let tenant = null;

    // 1. Check tableToken first if provided in query or header
    const tableToken = req.query?.tableToken || req.headers['x-table-token'];
    if (tableToken) {
      const claims = verifyTableQrToken(tableToken);
      if (claims?.tenantId && mongoose.isValidObjectId(claims.tenantId)) {
        tenant = await Tenant.findById(claims.tenantId).lean();
      }
    }

    // 2. Check cafe / cafeId / tenant / slug query or headers
    if (!tenant) {
      const identifier = String(
        req.query?.cafe ||
        req.query?.cafeId ||
        req.query?.slug ||
        req.query?.tenant ||
        req.headers['x-tenant-id'] ||
        req.headers['x-tenant-slug'] ||
        ''
      ).trim();

      if (identifier) {
        if (mongoose.isValidObjectId(identifier)) {
          tenant = await Tenant.findById(identifier).lean();
        }
        if (!tenant) {
          tenant = await Tenant.findOne({ slug: identifier.toLowerCase() }).lean();
        }
      }
    }

    // 3. Check authenticated session token if available
    if (!tenant) {
      const authHeader = req.headers?.authorization;
      const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.split(' ')[1]
        : req.cookies?.brewhaus_access_token;
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded?.tenantId && mongoose.isValidObjectId(decoded.tenantId)) {
            tenant = await Tenant.findById(decoded.tenantId).lean();
          }
        } catch {
          // ignore invalid/expired token in public endpoint
        }
      }
    }

    // 4. Fall back to req.tenant (resolved from subdomain / host by tenantResolver)
    if (!tenant && req.tenant) {
      tenant = req.tenant;
    }

    // NEVER fall back to another cafe or first active tenant!
    if (!tenant) {
      return res.status(404).json({
        error: 'Café not found. Please scan a valid table QR code or check the URL.',
        code: 'TENANT_NOT_FOUND',
      });
    }

    if (tenant.status !== 'active') {
      return res.status(423).json({
        error: 'This café account is suspended.',
        code: 'TENANT_SUSPENDED',
      });
    }

    return res.set('Cache-Control', 'private, no-cache').json({
      tenant: publicTenantSettings(tenant),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/settings', protect, authorizeRoles('owner'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId).select('+paymentCredentialsEncrypted').lean();
    let credentials;
    try {
      credentials = decryptTenantCredentials(tenant.paymentCredentialsEncrypted);
    } catch {
      credentials = { keyId: '', keySecret: '', webhookSecret: '' };
    }
    const keyId = credentials.keyId || '';
    const configured = Boolean(credentials.keyId && credentials.keySecret && credentials.webhookSecret);
    res.json({
      tenant: publicTenantSettings(tenant),
      payment: { keyId, configured },
    });
  } catch (error) { next(error); }
});

const updateTenantSettings = async (req, res, next, { isPartial = false } = {}) => {
  try {
    const patch = {};
    const hasSettingsPayload = req.body?.settings !== undefined;
    const input = req.body?.settings || {};

    // 1. Café Name Validation: only when settings payload is provided or when not partial
    const rawName = input.cafeName !== undefined ? input.cafeName : input.name;
    if (rawName !== undefined || (!isPartial && hasSettingsPayload)) {
      const name = String(rawName || '').trim();
      if (!name || name.length > 100) {
        return res.status(400).json({
          error: 'Café name is required and must be 100 characters or fewer.',
          field: 'cafeName',
        });
      }
      patch.name = name;
      patch['settings.cafeName'] = name;
    }

    // 2. Settings fields validation
    if (input.currency !== undefined || (!isPartial && hasSettingsPayload)) {
      const currency = String(input.currency || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Currency must be a three-letter ISO code.', field: 'currency' });
      }
      try { new Intl.NumberFormat('en', { style: 'currency', currency }); } catch {
        return res.status(400).json({ error: 'Currency code is not supported.', field: 'currency' });
      }
      patch['settings.currency'] = currency;
    }

    if (input.timezone !== undefined || (!isPartial && hasSettingsPayload)) {
      const timezone = String(input.timezone || '').trim();
      try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch {
        return res.status(400).json({ error: 'A valid timezone is required.', field: 'timezone' });
      }
      patch['settings.timezone'] = timezone;
    }

    if (input.taxRate !== undefined || (!isPartial && hasSettingsPayload)) {
      const taxRate = Number(input.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return res.status(400).json({ error: 'Tax rate must be between 0 and 100.', field: 'taxRate' });
      }
      patch['settings.taxRate'] = taxRate;
    }

    if (input.primaryColor !== undefined || (!isPartial && hasSettingsPayload)) {
      const primaryColor = String(input.primaryColor || '');
      if (!/^#[0-9a-f]{6}$/i.test(primaryColor)) {
        return res.status(400).json({ error: 'Brand colors must be six-digit hex colors.', field: 'primaryColor' });
      }
      patch['settings.primaryColor'] = primaryColor;
    }

    if (input.accentColor !== undefined || (!isPartial && hasSettingsPayload)) {
      const accentColor = String(input.accentColor || '');
      if (!/^#[0-9a-f]{6}$/i.test(accentColor)) {
        return res.status(400).json({ error: 'Brand colors must be six-digit hex colors.', field: 'accentColor' });
      }
      patch['settings.accentColor'] = accentColor;
    }

    if (input.logoUrl !== undefined) {
      const logoUrl = String(input.logoUrl || '').trim();
      if (logoUrl) {
        try {
          if (!['http:', 'https:'].includes(new URL(logoUrl).protocol)) throw new Error('invalid');
        } catch {
          return res.status(400).json({ error: 'Logo URL must use HTTP or HTTPS.', field: 'logoUrl' });
        }
      }
      patch['settings.logoUrl'] = logoUrl.slice(0, 2048);
    }

    if (input.heroImageUrl !== undefined) {
      const heroImageUrl = String(input.heroImageUrl || '').trim();
      if (heroImageUrl) {
        try {
          if (!['http:', 'https:'].includes(new URL(heroImageUrl).protocol)) throw new Error('invalid');
        } catch {
          return res.status(400).json({ error: 'Hero image URL must use HTTP or HTTPS.', field: 'heroImageUrl' });
        }
      }
      patch['settings.heroImageUrl'] = heroImageUrl.slice(0, 2048);
    }

    if (input.tagline !== undefined) {
      patch['settings.tagline'] = String(input.tagline || '').trim().slice(0, 200);
    }

    if (input.address !== undefined) {
      patch['settings.address'] = String(input.address || '').trim().slice(0, 500);
    }

    if (input.contactEmail !== undefined) {
      const contactEmail = String(input.contactEmail || '').trim().toLowerCase();
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return res.status(400).json({ error: 'Contact email is invalid.', field: 'contactEmail' });
      }
      patch['settings.contactEmail'] = contactEmail.slice(0, 254);
    }

    if (input.contactPhone !== undefined) {
      patch['settings.contactPhone'] = String(input.contactPhone || '').trim().slice(0, 32);
    }

    if (input.gstNumber !== undefined) {
      patch['settings.gstNumber'] = String(input.gstNumber || '').trim().slice(0, 32);
    }

    if (input.openingHours !== undefined) {
      patch['settings.openingHours'] = (input.openingHours && typeof input.openingHours === 'object' && !Array.isArray(input.openingHours)) ? input.openingHours : {};
    }

    if (input.tableSettings && typeof input.tableSettings === 'object') {
      const cleaningStepEnabled = input.tableSettings.cleaningStepEnabled !== false;
      const rawMins = Number(input.tableSettings.autoReleaseMinutes);
      const autoReleaseMinutes = Number.isFinite(rawMins) ? Math.max(0, Math.min(120, rawMins)) : 5;
      patch['settings.tableSettings'] = { cleaningStepEnabled, autoReleaseMinutes };
    }

    // 3. Wizard Progress persistence
    const wizardProgress = input.wizardProgress || req.body?.wizardProgress;
    if (wizardProgress && typeof wizardProgress === 'object') {
      if (Array.isArray(wizardProgress.completedSteps)) {
        patch['settings.wizardProgress.completedSteps'] = wizardProgress.completedSteps.map(String);
      }
      if (wizardProgress.currentStep) {
        patch['settings.wizardProgress.currentStep'] = String(wizardProgress.currentStep);
      }
    }

    // 4. Payment Credentials Handling
    const payment = req.body?.payment;
    if (payment !== undefined && payment !== null && typeof payment === 'object') {
      const existingTenant = await Tenant.findById(req.tenantId).select('+paymentCredentialsEncrypted').lean();
      let existingCredentials = {};
      try {
        existingCredentials = decryptTenantCredentials(existingTenant?.paymentCredentialsEncrypted) || {};
      } catch {
        existingCredentials = {};
      }

      const rawKeyId = payment.keyId !== undefined ? String(payment.keyId).trim() : undefined;
      const rawKeySecret = payment.keySecret !== undefined ? String(payment.keySecret).trim() : undefined;
      const rawWebhookSecret = payment.webhookSecret !== undefined ? String(payment.webhookSecret).trim() : undefined;

      const clearing = payment.clear === true ||
        (rawKeyId === '' && rawKeySecret === '' && rawWebhookSecret === '' && !payment.preserveExisting);

      if (clearing) {
        // Optional Razorpay keys: saving empty/cleared is allowed
        patch.paymentCredentialsEncrypted = '';
      } else {
        const finalKeyId = rawKeyId !== undefined
          ? rawKeyId
          : (payment.preserveExisting ? (existingCredentials.keyId || '') : '');

        const isChangingKey = rawKeyId !== undefined && existingCredentials.keyId && rawKeyId !== existingCredentials.keyId;

        const finalKeySecret = rawKeySecret !== undefined
          ? rawKeySecret
          : (!isChangingKey && payment.preserveExisting ? (existingCredentials.keySecret || '') : '');

        const finalWebhookSecret = rawWebhookSecret !== undefined
          ? rawWebhookSecret
          : (!isChangingKey && payment.preserveExisting ? (existingCredentials.webhookSecret || '') : '');

        // Keys provided: enforce format & completeness
        if (!finalKeyId) {
          return res.status(400).json({ error: 'Razorpay Key ID is required when configuring payments.', field: 'keyId' });
        }
        if (!/^rzp_(?:test|live)_[a-zA-Z0-9]+$/.test(finalKeyId)) {
          return res.status(400).json({ error: 'Razorpay Key ID must start with rzp_test_ or rzp_live_.', field: 'keyId' });
        }
        if (!finalKeySecret) {
          return res.status(400).json({ error: 'Razorpay Key Secret is required when configuring payments.', field: 'keySecret' });
        }
        if (!finalWebhookSecret) {
          return res.status(400).json({ error: 'Razorpay Webhook Secret is required when configuring payments.', field: 'webhookSecret' });
        }

        patch.paymentCredentialsEncrypted = encryptTenantCredentials({
          keyId: finalKeyId,
          keySecret: finalKeySecret,
          webhookSecret: finalWebhookSecret,
        });
      }
    }

    const tenant = Object.keys(patch).length > 0
      ? await Tenant.findByIdAndUpdate(req.tenantId, { $set: patch }, { new: true, runValidators: true }).select('+paymentCredentialsEncrypted').lean()
      : await Tenant.findById(req.tenantId).select('+paymentCredentialsEncrypted').lean();

    let credentials;
    try {
      credentials = decryptTenantCredentials(tenant.paymentCredentialsEncrypted);
    } catch {
      credentials = { keyId: '', keySecret: '', webhookSecret: '' };
    }
    const keyId = credentials.keyId || '';
    const configured = Boolean(credentials.keyId && credentials.keySecret && credentials.webhookSecret);

    res.json({
      tenant: publicTenantSettings(tenant),
      payment: { keyId, configured },
    });
  } catch (error) { next(error); }
};

router.put('/settings', protect, authorizeRoles('owner'), async (req, res, next) => {
  return updateTenantSettings(req, res, next, { isPartial: false });
});

router.patch('/settings', protect, authorizeRoles('owner'), async (req, res, next) => {
  return updateTenantSettings(req, res, next, { isPartial: true });
});

// Dedicated step-level endpoints for onboarding wizard
router.patch('/settings/branding', protect, authorizeRoles('owner'), async (req, res, next) => {
  const settings = req.body?.settings || req.body || {};
  req.body = { settings };
  return updateTenantSettings(req, res, next, { isPartial: true });
});

router.patch('/settings/payments', protect, authorizeRoles('owner'), async (req, res, next) => {
  const payment = req.body?.payment || req.body || {};
  const wizardProgress = req.body?.wizardProgress;
  req.body = { payment, wizardProgress };
  return updateTenantSettings(req, res, next, { isPartial: true });
});

router.patch('/settings/onboarding', protect, authorizeRoles('owner'), async (req, res, next) => {
  return updateTenantSettings(req, res, next, { isPartial: true });
});

export default router;
