import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      // 200 + fallback para não crashar a UI (regra do projecto)
      return jsonResponse({ fallback: true, error: "Unauthorized" }, 200);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse({ fallback: true, error: "Unauthorized" }, 200);
    }
    const user = authData.user;

    // ---- Input ----
    const { workspaceId, packageId } = await req.json();
    if (!workspaceId || !packageId) {
      return jsonResponse({ fallback: true, error: "workspaceId e packageId obrigatórios" }, 200);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Membership ----
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return jsonResponse({ fallback: true, error: "Sem acesso ao workspace" }, 200);
    }

    // ---- Package ----
    const { data: pkg, error: pkgError } = await adminClient
      .from("credit_packages")
      .select("id, name, credits_amount, price, currency, stripe_price_id, is_active")
      .eq("id", packageId)
      .maybeSingle();
    if (pkgError || !pkg || !pkg.is_active) {
      return jsonResponse({ fallback: true, error: "Pacote indisponível" }, 200);
    }

    // ---- Stripe ----
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ fallback: true, error: "Stripe não configurado" }, 200);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Reuse customer if exists
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://fastcrm.lovable.app";
    const baseUrl = origin.replace(/\/$/, "");

    // Build line item: prefer stripe_price_id, fallback to dynamic price_data
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = pkg.stripe_price_id
      ? { price: pkg.stripe_price_id, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: (pkg.currency || "eur").toLowerCase(),
            unit_amount: Math.round(Number(pkg.price) * 100),
            product_data: {
              name: `${pkg.credits_amount} créditos — ${pkg.name}`,
            },
          },
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : (user.email ?? undefined),
      line_items: [lineItem],
      success_url: `${baseUrl}/settings/billing?purchase=success&session_id={CHECKOUT_SESSION_ID}&credits=${pkg.credits_amount}`,
      cancel_url: `${baseUrl}/settings/billing?purchase=cancelled`,
      metadata: {
        workspace_id: workspaceId,
        user_id: user.id,
        package_id: pkg.id,
        credits_amount: String(pkg.credits_amount),
        kind: "credit_package",
      },
      payment_intent_data: {
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
          package_id: pkg.id,
          credits_amount: String(pkg.credits_amount),
          kind: "credit_package",
        },
      },
    });

    return jsonResponse({ url: session.url, sessionId: session.id }, 200);
  } catch (err) {
    console.error("[module-purchase-credits] internal error:", err);
    return jsonResponse({
      fallback: true,
      internal_error: true,
      error: err instanceof Error ? err.message : "Erro interno",
    }, 200);
  }
});
