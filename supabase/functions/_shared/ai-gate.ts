import { createClient } from "npm:@supabase/supabase-js@2";

export type AITier = "micro" | "light" | "medium" | "heavy" | "agent";

const OVERAGE_PRICES: Partial<Record<AITier, number>> = {
  heavy: 0.05,
  agent: 0.25,
};

const INCLUDED_TIERS: Record<string, AITier[]> = {
  free: [],
  growth: ["micro", "light", "medium"],
  pro: ["micro", "light", "medium", "heavy"],
};

export async function aiGate(
  workspaceId: string,
  tier: AITier,
  edgeFnName: string,
  userId?: string
): Promise<{ allowed: boolean; isOverage: boolean; overagePrice?: number }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: plan, error } = await supabase
    .from("workspace_plans")
    .select("id, plan, calls_included, calls_used")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !plan) {
    console.warn(`[AI-GATE] No active plan for workspace ${workspaceId}`);
    return { allowed: false, isOverage: false };
  }

  const includedTiers = INCLUDED_TIERS[plan.plan] ?? [];
  const isTierIncluded = includedTiers.includes(tier);
  const isAgent = tier === "agent";
  const overagePrice = OVERAGE_PRICES[tier];

  // Free plan: block everything
  if (plan.plan === "free") {
    return { allowed: false, isOverage: false };
  }

  // Agent: always overage
  if (isAgent) {
    await logCall(supabase, workspaceId, plan.id, tier, edgeFnName, userId, true, overagePrice);
    return { allowed: true, isOverage: true, overagePrice };
  }

  // Heavy on Growth: overage
  if (tier === "heavy" && plan.plan === "growth") {
    await logCall(supabase, workspaceId, plan.id, tier, edgeFnName, userId, true, overagePrice);
    return { allowed: true, isOverage: true, overagePrice };
  }

  // Quota exhausted for included tiers
  if (isTierIncluded && plan.calls_used >= plan.calls_included) {
    return { allowed: false, isOverage: false };
  }

  // Included and within quota
  await Promise.all([
    logCall(supabase, workspaceId, plan.id, tier, edgeFnName, userId, false),
    supabase
      .from("workspace_plans")
      .update({ calls_used: plan.calls_used + 1, updated_at: new Date().toISOString() })
      .eq("id", plan.id),
  ]);

  return { allowed: true, isOverage: false };
}

async function logCall(
  supabase: any,
  workspaceId: string,
  planId: string,
  tier: AITier,
  edgeFnName: string,
  userId: string | undefined,
  isOverage: boolean,
  overageCharge?: number
) {
  const ops: Promise<any>[] = [
    supabase.from("ai_call_log").insert({
      workspace_id: workspaceId,
      edge_function: edgeFnName,
      tier,
      is_overage: isOverage,
      overage_charge: overageCharge ?? null,
      user_id: userId ?? null,
    }),
  ];

  if (isOverage && overageCharge) {
    ops.push(
      supabase.rpc("upsert_overage_charge", {
        p_workspace_id: workspaceId,
        p_plan_cycle_id: planId,
        p_tier: tier,
        p_amount: overageCharge,
      })
    );
  }

  await Promise.all(ops);
}
