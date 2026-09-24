import { AccountPlan, AccountPlanInfo } from '../types';
import { accountPlans } from '../constants';
import { SubscriptionPlan } from '../../../services/subscriptionPlansApi';

export function resolveAccountPlanInfo(
  subscriptionPlans: SubscriptionPlan[],
  currentPlan: AccountPlan
): AccountPlanInfo {
  const apiPlan = subscriptionPlans.find((p) => p.slug === currentPlan);
  if (apiPlan) {
    return {
      id: apiPlan.slug as AccountPlan,
      name: apiPlan.name,
      price: apiPlan.priceMonthly,
      features: apiPlan.features,
      color: 'blue',
      icon: accountPlans.find((p) => p.id === apiPlan.slug)?.icon || accountPlans[0].icon,
      limits: {
        sessions: apiPlan.limits.designs === -1 ? ('unlimited' as const) : apiPlan.limits.designs,
        exports: apiPlan.limits.exports === -1 ? ('unlimited' as const) : apiPlan.limits.exports,
        storage: `${apiPlan.limits.storage}MB`,
        teamMembers:
          apiPlan.limits.teamMembers === -1 ? ('unlimited' as const) : apiPlan.limits.teamMembers
      }
    };
  }

  return accountPlans.find((p) => p.id === currentPlan) || accountPlans[0];
}
