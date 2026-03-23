import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { workspaceId } = await req.json();
    if (!workspaceId) throw new Error("workspaceId is required");

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Not a workspace member");

    // Get installations with module info
    const { data: installations, error: instErr } = await supabase
      .from("workspace_modules")
      .select(`
        id, status, pricing_model, price_eur, stripe_sub_id,
        billing_cycle_start, billing_cycle_end, cancel_at_period_end,
        current_period_start, current_period_end,
        module:marketplace_modules!inner(id, slug, name, icon, category, pricing_model, price_eur)
      `)
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "trial", "pending"]);

    if (instErr) throw instErr;

    // Calculate monthly cost
    const monthlyCost = (installations || [])
      .filter(i => i.status === "active" && i.pricing_model === "monthly")
      .reduce((sum, i) => sum + (i.price_eur || 0), 0);

    return new Response(JSON.stringify({
      workspace_id: workspaceId,
      installations: installations || [],
      summary: {
        total_installed: (installations || []).length,
        active: (installations || []).filter(i => i.status === "active").length,
        monthly_cost_eur: monthlyCost,
        free_modules: (installations || []).filter(i => i.pricing_model === "free" || i.pricing_model === "included").length,
        paid_modules: (installations || []).filter(i => i.pricing_model === "monthly").length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
