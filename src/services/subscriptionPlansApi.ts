// Re-export from Supabase-based api.ts
import { subscriptionApi } from './api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: any;
  isActive: boolean;
  sortOrder: number;
}

export const getSubscriptionPlans = subscriptionApi.getPlans;
