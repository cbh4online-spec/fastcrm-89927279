import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Utilizador não autenticado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { workspaceId } = await req.json();
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Workspace ID é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get workspace stripe config
    const { data: config, error: configError } = await supabaseClient
      .from("workspace_stripe_config")
      .select("stripe_secret_key_encrypted, is_active")
      .eq("workspace_id", workspaceId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração Stripe não encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!config.stripe_secret_key_encrypted) {
      return new Response(
        JSON.stringify({ success: false, error: "Chave secreta não configurada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Test the connection
    const stripe = new Stripe(config.stripe_secret_key_encrypted, { 
      apiVersion: "2025-08-27.basil" 
    });

    // Try to list customers as a simple API test
    await stripe.customers.list({ limit: 1 });

    return new Response(
      JSON.stringify({ success: true, message: "Conexão bem sucedida" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TEST-STRIPE-CONNECTION] Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
