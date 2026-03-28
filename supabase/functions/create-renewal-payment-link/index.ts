import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map renewal_interval to Stripe recurring params
function mapIntervalToStripe(interval: string): { interval: string; interval_count: number } {
  switch (interval) {
    case "monthly": return { interval: "month", interval_count: 1 };
    case "quarterly": return { interval: "month", interval_count: 3 };
    case "semi_annual": return { interval: "month", interval_count: 6 };
    case "yearly": return { interval: "year", interval_count: 1 };
    default: return { interval: "month", interval_count: 1 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = user.id;

    const { contract_id, workspace_id, item_ids } = await req.json();
    if (!contract_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "contract_id and workspace_id required" }), { status: 400, headers: corsHeaders });
    }

    // Verify workspace membership
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const { data: membership } = await serviceClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), { status: 403, headers: corsHeaders });
    }

    // Get Stripe config
    const { data: stripeConfig } = await serviceClient
      .from("workspace_stripe_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    const stripeKey = stripeConfig?.stripe_secret_key_encrypted || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 400, headers: corsHeaders });
    }

    // Get contract with company and contact
    const { data: contract, error: contractError } = await serviceClient
      .from("renewal_contracts")
      .select("*, company:companies(id, name), contact:contacts(id, name, email)")
      .eq("id", contract_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), { status: 404, headers: corsHeaders });
    }

    // Get items
    let itemsQuery = serviceClient
      .from("renewal_items")
      .select("*")
      .eq("contract_id", contract_id)
      .in("status", ["active", "pending_renewal", "overdue"]);

    if (item_ids?.length) {
      itemsQuery = itemsQuery.in("id", item_ids);
    }

    const { data: items } = await itemsQuery;
    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No active items found" }), { status: 400, headers: corsHeaders });
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.qty) * Number(item.unit_price)), 0);

    // Create Stripe instance
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    const contactEmail = (contract as any).contact?.email;
    const companyName = (contract as any).company?.name || "";
    let customerId: string | undefined;

    if (contactEmail) {
      const customers = await stripe.customers.list({ email: contactEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: contactEmail,
          name: (contract as any).contact?.name || companyName,
          metadata: {
            workspace_id,
            contract_id,
            company_name: companyName,
          },
        });
        customerId = newCustomer.id;
      }
    }

    // Map renewal interval to Stripe recurring
    const stripeRecurring = mapIntervalToStripe(contract.renewal_interval || "monthly");

    // Build line items with recurring price_data
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: contract.currency?.toLowerCase() || "eur",
        product_data: {
          name: item.name,
          description: `${item.item_type} — ${companyName}`,
        },
        unit_amount: Math.round(Number(item.unit_price) * 100),
        recurring: {
          interval: stripeRecurring.interval,
          interval_count: stripeRecurring.interval_count,
        },
      },
      quantity: Number(item.qty) || 1,
    }));

    const origin = req.headers.get("origin") || "https://fastcrm.lovable.app";

    const sessionParams: any = {
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/dashboard/renewals/${contract_id}?payment=success`,
      cancel_url: `${origin}/dashboard/renewals/${contract_id}?payment=cancelled`,
      metadata: {
        contract_id,
        workspace_id,
        item_ids: JSON.stringify(item_ids || items.map((i: any) => i.id)),
      },
      subscription_data: {
        metadata: {
          contract_id,
          workspace_id,
        },
      },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (contactEmail) {
      sessionParams.customer_email = contactEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Save customer ID on contract if created
    if (customerId && !contract.stripe_customer_id) {
      await serviceClient
        .from("renewal_contracts")
        .update({ stripe_customer_id: customerId })
        .eq("id", contract_id);
    }

    // Save payment link record
    await serviceClient.from("renewal_payment_links").insert({
      workspace_id,
      contract_id,
      stripe_session_id: session.id,
      stripe_url: session.url,
      amount: totalAmount,
      currency: contract.currency || "EUR",
      status: "pending",
      item_ids: item_ids || items.map((i: any) => i.id),
      created_by: userId,
    });

    // Log event
    await serviceClient.from("renewal_events").insert({
      workspace_id,
      contract_id,
      event_type: "invoice_sent",
      payload_json: {
        stripe_session_id: session.id,
        amount: totalAmount,
        items_count: items.length,
        mode: "subscription",
        interval: stripeRecurring.interval,
        interval_count: stripeRecurring.interval_count,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      url: session.url,
      session_id: session.id,
      amount: totalAmount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Payment link error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
