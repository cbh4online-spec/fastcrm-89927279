type WorkspaceSubscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

// The marketplace uses the older free/growth/pro labels. Billing also has
// Starter/Growth/Scale and legacy basic/pro/agency subscriptions.
const PLAN_LEVEL: Record<string, number> = {
  free: 0,
  starter: 0,
  basic: 1,
  growth: 1,
  pro: 2,
  agency: 2,
  scale: 2,
};

export function activeModulePlan(
  subscription: WorkspaceSubscription | null,
  now = Date.now(),
): string {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return "free";
  }

  if (subscription.current_period_end) {
    const periodEnd = Date.parse(subscription.current_period_end);
    if (!Number.isFinite(periodEnd) || periodEnd <= now) return "free";
  }

  return subscription.plan.toLowerCase();
}

export function meetsModuleMinimumPlan(currentPlan: string, minimumPlan: string): boolean {
  const currentLevel = PLAN_LEVEL[currentPlan.toLowerCase()] ?? 0;
  const requiredLevel = PLAN_LEVEL[minimumPlan.toLowerCase()];
  // Unknown catalogue requirements must not silently become free.
  return requiredLevel !== undefined && currentLevel >= requiredLevel;
}
