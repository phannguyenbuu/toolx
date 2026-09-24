import { SubscriptionInfo } from '../types';

export const defaultSubscription: SubscriptionInfo = {
  plan: 'free',
  startDate: new Date().toISOString(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  autoRenew: false,
  usedSessions: 2,
  usedExports: 45,
  usedStorage: '25MB'
};
