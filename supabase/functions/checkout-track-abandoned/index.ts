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
    const { sessionId, workspaceId, funnelId, customerEmail, cartData, stepAbandoned, totalValue } = await req.json();

    if (!workspaceId) throw new Error("Missing workspaceId");

    const recoveryToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from("checkout_abandoned_carts")
      .insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        session_id: sessionId,
        customer_email: customerEmail,
        cart_data: cartData || {},
        step_abandoned: stepAbandoned || "checkout",
        recovery_token: recoveryToken,
        total_value: totalValue || 0,
        recovery_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
