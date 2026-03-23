import { useAIUsage } from "./useAIUsage";

export type CallTier = "micro" | "light" | "medium" | "heavy" | "agent";

export function useAIGate(tier: CallTier) {
  const { plan, isAtLimit } = useAIUsage();

  const isOverage =
    tier === "agent" ||
    (tier === "heavy" && plan === "growth") ||
    (isAtLimit && tier !== "agent");

  const overagePrice =
    tier === "agent" ? 0.25 :
    tier === "heavy" ? 0.05 :
    0;

  const canRun = plan !== "free" && (!isAtLimit || isOverage);
  const showUpgrade = plan === "free" || (isAtLimit && !isOverage);

  return {
    canRun,
    isOverage,
    overagePrice,
    showUpgrade,
    overageLabel: overagePrice > 0
      ? `Esta acção custa €${overagePrice.toFixed(2)}`
      : undefined,
  };
}
