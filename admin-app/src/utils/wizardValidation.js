/**
 * Validation and payload utilities for Café Onboarding Wizard
 */

export const validateBranding = ({ cafeName }) => {
  const name = String(cafeName || '').trim();
  const errors = {};

  if (!name || name.length > 100) {
    errors.cafeName = 'Café name is required and must be 100 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validatePayments = ({ keyId, keySecret, webhookSecret }) => {
  const cleanKeyId = String(keyId || '').trim();
  const cleanKeySecret = String(keySecret || '').trim();
  const cleanWebhook = String(webhookSecret || '').trim();

  const hasAnyKey = Boolean(cleanKeyId || cleanKeySecret || cleanWebhook);
  const errors = {};

  if (hasAnyKey) {
    if (!cleanKeyId) {
      errors.keyId = 'Razorpay Key ID is required when configuring payments.';
    } else if (!/^rzp_(?:test|live)_[a-zA-Z0-9]+$/.test(cleanKeyId)) {
      errors.keyId = 'Key ID must start with rzp_test_ or rzp_live_.';
    }

    if (!cleanKeySecret) {
      errors.keySecret = 'Razorpay Key Secret is required when configuring payments.';
    }

    if (!cleanWebhook) {
      errors.webhookSecret = 'Razorpay Webhook Secret is required when configuring payments.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    hasAnyKey,
  };
};

export const buildBrandingPayload = ({
  cafeName,
  primaryColor = '#c96b18',
  accentColor = '#1a0f08',
  address = '',
  completedSteps = [],
}) => {
  const name = String(cafeName || '').trim();
  const updatedCompleted = Array.from(new Set([...completedSteps, 'branding']));

  return {
    settings: {
      cafeName: name,
      primaryColor,
      accentColor,
      address: String(address || '').trim(),
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      taxRate: 5,
      wizardProgress: {
        completedSteps: updatedCompleted,
        currentStep: 'menu',
      },
    },
  };
};

export const buildPaymentPayload = ({
  keyId,
  keySecret,
  webhookSecret,
  completedSteps = [],
}) => {
  const cleanKeyId = String(keyId || '').trim();
  const cleanKeySecret = String(keySecret || '').trim();
  const cleanWebhook = String(webhookSecret || '').trim();

  const hasKeys = Boolean(cleanKeyId || cleanKeySecret || cleanWebhook);
  const updatedCompleted = Array.from(new Set([...completedSteps, 'payments']));

  const payload = {
    wizardProgress: {
      completedSteps: updatedCompleted,
      currentStep: 'qrcode',
    },
  };

  if (hasKeys) {
    payload.payment = {
      keyId: cleanKeyId,
      keySecret: cleanKeySecret,
      webhookSecret: cleanWebhook,
    };
  } else {
    payload.payment = {
      clear: true,
    };
  }

  return payload;
};

export const restoreWizardState = ({
  tenantSettings = {},
  tenantName = '',
  paymentData = {},
  products = [],
  tables = [],
}) => {
  const cafeName = tenantSettings.cafeName || tenantName || '';
  const primaryColor = tenantSettings.primaryColor || '#c96b18';
  const accentColor = tenantSettings.accentColor || '#1a0f08';
  const address = tenantSettings.address || '';
  const keyId = paymentData.keyId || '';

  const completed = new Set(tenantSettings.wizardProgress?.completedSteps || []);
  if (cafeName) completed.add('branding');
  if (products.length > 0) completed.add('menu');
  if (tables.length > 0) completed.add('tables');
  if (paymentData.configured) completed.add('payments');

  const savedStep = tenantSettings.wizardProgress?.currentStep || 'branding';

  return {
    cafeName,
    primaryColor,
    accentColor,
    address,
    keyId,
    completedSteps: completed,
    savedStep,
  };
};
