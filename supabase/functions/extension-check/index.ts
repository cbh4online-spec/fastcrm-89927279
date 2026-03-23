import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_HIERARCHY: Record<string, number> = { free: 0, growth: 1, pro: 2 };

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

    const { workspaceId, moduleSlug } = await req.json();
    if (!workspaceId || !moduleSlug) throw new Error("workspaceId and moduleSlug are required");

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Not a workspace member");

    // Get module
    const { data: mod, error: modErr } = await supabase
      .from("marketplace_modules")
      .select("id, slug, name, pricing_model, price_eur, min_plan, stripe_price_id")
      .eq("slug", moduleSlug)
      .in("status", ["active", "published"])
      .maybeSingle();

    if (modErr || !mod) {
      return new Response(JSON.stringify({ error: "Module not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace plan from workspace_plans
    const { data: plan } = await supabase
      .from("workspace_plans")
      .select("plan_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const currentPlan = plan?.plan_name || "free";
    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[mod.min_plan] ?? 0;

    // Check if plan is sufficient
    if (currentLevel < requiredLevel) {
      return new Response(JSON.stringify({
        allowed: false,
        action: "upgrade_required",
        currentPlan,
        requiredPlan: mod.min_plan,
        module: { id: mod.id, slug: mod.slug, name: mod.name, pricing_model: mod.pricing_model, price_eur: mod.price_eur },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already installed
    const { data: existing } = await supabase
      .from("workspace_modules")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("module_id", mod.id)
      .maybeSingle();

    if (existing && (existing.status === "active" || existing.status === "trial")) {
      return new Response(JSON.stringify({
        allowed: true,
        action: "already_installed",
        module: { id: mod.id, slug: mod.slug, name: mod.name, pricing_model: mod.pricing_model, price_eur: mod.price_eur },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine action based on pricing model
    let action: string;
    switch (mod.pricing_model) {
      case "free":
      case "template":
        action = "install_free";
        break;
      case "included":
        action = "install_included";
        break;
      case "monthly":
        action = "subscribe_monthly";
        break;
      default:
        action = "install_free";
    }

    return new Response(JSON.stringify({
      allowed: true,
      action,
      module: {
        id: mod.id,
        slug: mod.slug,
        name: mod.name,
        pricing_model: mod.pricing_model,
        price_eur: mod.price_eur,
        stripe_price_id: mod.stripe_price_id,
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
