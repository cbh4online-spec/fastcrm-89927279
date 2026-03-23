import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: plan } = await supabase
      .from("workspace_plans")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    if (!plan) {
      return new Response(JSON.stringify({ error: "no_plan" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: usageByTier } = await supabase
      .from("ai_call_log")
      .select("tier")
      .eq("workspace_id", workspaceId)
      .gte("created_at", plan.cycle_start);

    const tierCounts: Record<string, number> = {};
    usageByTier?.forEach((row: any) => {
      tierCounts[row.tier] = (tierCounts[row.tier] ?? 0) + 1;
    });

    const { data: pendingOverage } = await supabase
      .from("overage_charges")
      .select("amount_eur")
      .eq("workspace_id", workspaceId)
      .eq("billed", false);

    const pendingTotal = pendingOverage?.reduce((s: number, r: any) => s + Number(r.amount_eur), 0) ?? 0;

    return new Response(JSON.stringify({
      plan: plan.plan,
      calls_included: plan.calls_included,
      calls_used: plan.calls_used,
      calls_pct: plan.calls_included > 0
        ? Math.round((plan.calls_used / plan.calls_included) * 100)
        : 0,
      usage_by_tier: tierCounts,
      pending_overage_eur: pendingTotal,
      cycle_start: plan.cycle_start,
      cycle_end: plan.cycle_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[AI-USAGE-STATS] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
