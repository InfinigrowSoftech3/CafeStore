/**
 * Brewhaus SMS Provider Service
 * Supports pluggable SMS adapters configured via SMS_PROVIDER and provider credentials.
 * Zero external npm dependencies — uses Node 22 native fetch.
 */

export class BaseSmsProvider {
  constructor(name) {
    this.name = name;
  }

  async sendSms({ to, message }) {
    throw new Error('sendSms() method not implemented');
  }

  isConfigured() {
    return false;
  }
}

export class TwilioSmsProvider extends BaseSmsProvider {
  constructor(config = {}) {
    super('twilio');
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID || process.env.SMS_ACCOUNT_SID;
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN || process.env.SMS_AUTH_TOKEN;
    this.fromPhone = config.fromPhone || process.env.TWILIO_FROM_PHONE || process.env.TWILIO_PHONE_NUMBER || process.env.SMS_FROM_PHONE;
  }

  isConfigured() {
    return Boolean(this.accountSid && this.authToken && this.fromPhone);
  }

  async sendSms({ to, message }) {
    if (!this.isConfigured()) {
      const err = new Error('Twilio SMS provider is not configured. Missing credentials.');
      err.code = 'PROVIDER_NOT_CONFIGURED';
      err.reason = 'provider_not_configured';
      throw err;
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const params = new URLSearchParams({
      To: to,
      From: this.fromPhone,
      Body: message,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // use raw text
      }
      const err = new Error(errorJson?.message || `Twilio SMS dispatch failed with status ${response.status}`);
      err.status = response.status;
      err.details = errorJson || errorText;
      throw err;
    }

    const data = await response.json();
    return {
      success: true,
      provider: 'twilio',
      messageId: data.sid,
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }
}

let activeProvider = null;

export const setSmsProvider = (provider) => {
  activeProvider = provider;
};

export const getSmsProvider = () => {
  if (activeProvider) return activeProvider;

  const providerType = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (providerType === 'twilio') {
    return new TwilioSmsProvider();
  }

  return null;
};

export const isSmsConfigured = () => {
  const provider = getSmsProvider();
  return Boolean(provider && provider.isConfigured());
};

export const sendSms = async ({ to, message }) => {
  const provider = getSmsProvider();
  if (!provider || !provider.isConfigured()) {
    const err = new Error('SMS provider is not configured.');
    err.code = 'PROVIDER_NOT_CONFIGURED';
    err.reason = 'provider_not_configured';
    throw err;
  }
  return provider.sendSms({ to, message });
};

export default {
  BaseSmsProvider,
  TwilioSmsProvider,
  setSmsProvider,
  getSmsProvider,
  isSmsConfigured,
  sendSms,
};
