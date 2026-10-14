import mongoose from 'mongoose';
import { tenantIsolationPlugin } from '../utils/tenantContext.js';

const notificationDeliverySchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationCampaign',
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
    index: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PushSubscription',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['queued', 'sending', 'delivered', 'failed'],
    default: 'queued',
    index: true,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  failedAt: {
    type: Date,
    default: null,
  },
  errorMessage: {
    type: String,
    default: '',
  },
}, { timestamps: true });

notificationDeliverySchema.index({ tenantId: 1, campaignId: 1, status: 1 });
notificationDeliverySchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
notificationDeliverySchema.index({ tenantId: 1, status: 1, createdAt: -1 });
notificationDeliverySchema.index({ tenantId: 1, createdAt: -1 });
notificationDeliverySchema.index({ tenantId: 1, subscriptionId: 1 });
notificationDeliverySchema.index({ campaignId: 1, status: 1 });
notificationDeliverySchema.index({ customerId: 1, createdAt: -1 });
notificationDeliverySchema.index({ createdAt: -1 });

notificationDeliverySchema.plugin(tenantIsolationPlugin);
export default mongoose.model('NotificationDelivery', notificationDeliverySchema);
