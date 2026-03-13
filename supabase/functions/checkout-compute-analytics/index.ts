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
    const { workspaceId } = await req.json();

    if (!workspaceId) throw new Error("Missing workspaceId");

    // Get all sessions for this workspace
    const { data: sessions } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("workspace_id", workspaceId);

    const all = sessions || [];
    const completed = all.filter((s: any) => s.status === "completed");
    const totalRevenue = completed.reduce((s: number, c: any) => s + (c.total_value || 0), 0);
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;
    const conversionRate = all.length > 0 ? (completed.length / all.length) * 100 : 0;
    const upsellAccepted = all.filter((s: any) => (s.upsells_accepted || []).length > 0).length;
    const upsellRate = all.length > 0 ? (upsellAccepted / all.length) * 100 : 0;

    // Get abandoned carts
    const { data: abandoned } = await supabase
      .from("checkout_abandoned_carts")
      .select("*")
      .eq("workspace_id", workspaceId);

    const recoveredCarts = (abandoned || []).filter((a: any) => a.recovery_status === "recovered");
    const recoveryRate = (abandoned || []).length > 0 ? (recoveredCarts.length / (abandoned || []).length) * 100 : 0;

    return new Response(JSON.stringify({
      totalSessions: all.length,
      completedSessions: completed.length,
      totalRevenue,
      avgOrderValue,
      conversionRate,
      upsellRate,
      abandonedCarts: (abandoned || []).length,
      recoveredCarts: recoveredCarts.length,
      recoveryRate,
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
