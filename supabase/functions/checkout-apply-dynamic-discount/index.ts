import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { workspaceId, triggerType, cartValue } = await req.json();

    if (!workspaceId) throw new Error("Missing workspaceId");

    // Find applicable dynamic discount
    const { data: discounts } = await supabase
      .from("checkout_dynamic_discounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .eq("trigger_type", triggerType || "exit_intent");

    if (!discounts?.length) {
      return new Response(JSON.stringify({ discount: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find best applicable discount
    const applicable = discounts.filter((d: any) => {
      if (d.min_cart_value && cartValue && cartValue < d.min_cart_value) return false;
      if (d.max_uses && d.current_uses >= d.max_uses) return false;
      return true;
    });

    if (!applicable.length) {
      return new Response(JSON.stringify({ discount: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const best = applicable.sort((a: any, b: any) => b.discount_value - a.discount_value)[0];

    // Generate unique code
    const code = `EXIT-${Date.now().toString(36).toUpperCase()}`;

    // Increment usage
    await supabase
      .from("checkout_dynamic_discounts")
      .update({ current_uses: (best.current_uses || 0) + 1 })
      .eq("id", best.id);

    return new Response(JSON.stringify({
      discount: {
        code,
        type: best.discount_type,
        value: best.discount_value,
        message: best.message,
        countdown_seconds: best.countdown_seconds,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
