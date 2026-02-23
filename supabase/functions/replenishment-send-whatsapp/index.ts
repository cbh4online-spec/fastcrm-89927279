import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { suggestionId, workspaceId, phoneNumber, portalUrl } = await req.json();
    if (!suggestionId || !workspaceId || !phoneNumber) throw new Error("Missing params");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check opt-in
    const { data: suggestion } = await supabase
      .from("client_replenishment_suggestions")
      .select("*, company:client_notification_settings!inner(opt_in_whatsapp)")
      .eq("id", suggestionId)
      .single();

    if (!suggestion) throw new Error("Suggestion not found");

    const items = suggestion.suggested_items || [];
    const productList = items.map((it: any) => `• ${it.product_name} (${it.suggested_qty} un.)`).join("\n");

    const message = `📦 *Sugestão de Reposição*\n\n${suggestion.reason || "Produtos para reposição:"}\n\n${productList}\n\n🛒 Repor agora: ${portalUrl || "Portal Cliente"}`;

    // Call existing whatsapp-send-message function
    const { error } = await supabase.functions.invoke("whatsapp-send-message", {
      body: { workspaceId, to: phoneNumber, message },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
