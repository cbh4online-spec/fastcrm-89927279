import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment was completed
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Pagamento não concluído" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const metadata = session.metadata || {};
    if (metadata.type !== "boost_credits") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Sessão inválida" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const walletId = metadata.wallet_id;
    const credits = parseInt(metadata.credits || "0", 10);
    const workspaceId = metadata.workspace_id;

    if (!walletId || !credits || !workspaceId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Metadados da sessão inválidos" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if this session was already processed (idempotency)
    const { data: existingTx } = await adminClient
      .from("c2c_boost_transactions")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existingTx) {
      return new Response(JSON.stringify({ 
        success: true, 
        credits, 
        already_processed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Credit the wallet
    const { data: currentWallet } = await adminClient
      .from("c2c_boost_wallets")
      .select("balance")
      .eq("id", walletId)
      .single();

    if (!currentWallet) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Carteira não encontrada" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    await adminClient
      .from("c2c_boost_wallets")
      .update({ balance: currentWallet.balance + credits })
      .eq("id", walletId);

    await adminClient
      .from("c2c_boost_transactions")
      .insert({
        wallet_id: walletId,
        workspace_id: workspaceId,
        type: "purchase",
        amount: credits,
        description: `Compra de ${credits} créditos`,
        stripe_session_id: sessionId,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      credits,
      already_processed: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error verifying boost purchase:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
