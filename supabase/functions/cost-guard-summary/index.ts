import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, month } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const [monthlyRes, limitsRes, alertsRes, dailyRes] = await Promise.all([
      supabase.from("cost_guard_monthly").select("*").eq("workspace_id", workspace_id).eq("month", targetMonth),
      supabase.from("cost_guard_limits").select("*").eq("workspace_id", workspace_id).eq("active", true),
      supabase.from("cost_guard_alerts").select("*").eq("workspace_id", workspace_id).eq("status", "open").order("created_at", { ascending: false }).limit(50),
      supabase.from("cost_guard_daily").select("*").eq("workspace_id", workspace_id).gte("date", targetMonth + "-01").order("date", { ascending: true }),
    ]);

    const monthly = monthlyRes.data || [];
    const totals = monthly.reduce(
      (acc, r: any) => ({
        cost: acc.cost + Number(r.cost_total_amount || 0),
        billable: acc.billable + Number(r.billable_total_amount || 0),
        margin: acc.margin + Number(r.margin_total_amount || 0),
      }),
      { cost: 0, billable: 0, margin: 0 }
    );

    const byModule: Record<string, any> = {};
    monthly.forEach((r: any) => {
      const k = r.source_module;
      if (!byModule[k]) byModule[k] = { module: k, quantity: 0, cost: 0, billable: 0, margin: 0 };
      byModule[k].quantity += Number(r.quantity_total || 0);
      byModule[k].cost += Number(r.cost_total_amount || 0);
      byModule[k].billable += Number(r.billable_total_amount || 0);
      byModule[k].margin += Number(r.margin_total_amount || 0);
    });

    return new Response(JSON.stringify({
      total_cost: totals.cost,
      total_billable: totals.billable,
      total_margin: totals.margin,
      currency: "EUR",
      by_module: Object.values(byModule),
      by_usage_type: monthly,
      limits: limitsRes.data || [],
      alerts: alertsRes.data || [],
      daily: dailyRes.data || [],
      month: targetMonth,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[cost-guard-summary]", e);
    return new Response(JSON.stringify({ error: "internal_error", fallback: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
