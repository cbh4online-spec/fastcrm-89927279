import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, d?: unknown) =>
  console.log(`[MARKETPLACE-PAYOUT] ${step}${d ? ` - ${JSON.stringify(d)}` : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, workspace_id, seller_id, payout_id, amount, notes } = body;

    if (!workspace_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "request": {
        if (!seller_id || !amount) {
          return new Response(
            JSON.stringify({ error: "Missing seller_id or amount" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get store settings for minimum payout
        const { data: settings } = await supabase
          .from("store_settings")
          .select("c2c_payout_minimum_amount")
          .eq("workspace_id", workspace_id)
          .maybeSingle();

        const minAmount = settings?.c2c_payout_minimum_amount ?? 25;

        if (amount < minAmount) {
          return new Response(
            JSON.stringify({ error: `Montante mínimo de payout: €${minAmount}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify seller balance
        const { data: seller } = await supabase
          .from("c2c_sellers")
          .select("balance_available, payout_method")
          .eq("id", seller_id)
          .single();

        if (!seller || (seller.balance_available ?? 0) < amount) {
          return new Response(
            JSON.stringify({ error: "Saldo insuficiente" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: payout, error: insertErr } = await supabase
          .from("marketplace_payouts")
          .insert({
            workspace_id,
            seller_id,
            amount,
            currency: "EUR",
            status: "requested",
            payout_method: seller.payout_method || null,
            notes: notes || null,
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;

        // Emit kernel event (non-blocking)
        emitKernelEvent(supabase, workspace_id, "MARKETPLACE.PAYOUT_REQUESTED", "payout", payout.id, {
          seller_id,
          amount,
        });

        result = { payout_id: payout.id, status: "requested" };
        log("Payout requested", { seller_id, amount });
        break;
      }

      case "approve": {
        if (!payout_id) {
          return new Response(
            JSON.stringify({ error: "Missing payout_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase
          .from("marketplace_payouts")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", payout_id)
          .eq("workspace_id", workspace_id);

        if (error) throw error;
        result = { payout_id, status: "approved" };
        log("Payout approved", { payout_id });
        break;
      }

      case "mark_paid": {
        if (!payout_id) {
          return new Response(
            JSON.stringify({ error: "Missing payout_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get payout details
        const { data: payout } = await supabase
          .from("marketplace_payouts")
          .select("*")
          .eq("id", payout_id)
          .eq("workspace_id", workspace_id)
          .single();

        if (!payout) {
          return new Response(
            JSON.stringify({ error: "Payout not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (payout.status === "paid") {
          return new Response(
            JSON.stringify({ error: "Payout already paid" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get seller balance
        const { data: sellerData } = await supabase
          .from("c2c_sellers")
          .select("balance_available")
          .eq("id", payout.seller_id)
          .single();

        const currentBalance = sellerData?.balance_available ?? 0;
        const newBalance = currentBalance - payout.amount;

        // Debit wallet
        await supabase.from("marketplace_wallet_entries").insert({
          workspace_id,
          seller_id: payout.seller_id,
          entry_type: "payout_debit",
          amount: -payout.amount,
          currency: payout.currency || "EUR",
          reference_type: "payout",
          reference_id: payout_id,
          balance_after: newBalance,
          notes: notes || `Payout #${payout_id.slice(0, 8)} processado`,
        });

        // Update seller balance
        await supabase
          .from("c2c_sellers")
          .update({ balance_available: newBalance })
          .eq("id", payout.seller_id);

        // Mark payout as paid
        await supabase
          .from("marketplace_payouts")
          .update({
            status: "paid",
            processed_at: new Date().toISOString(),
            notes: notes || payout.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id);

        // Emit kernel event
        emitKernelEvent(supabase, workspace_id, "MARKETPLACE.PAYOUT_PAID", "payout", payout_id, {
          seller_id: payout.seller_id,
          amount: payout.amount,
          new_balance: newBalance,
        });

        result = { payout_id, status: "paid", new_balance: newBalance };
        log("Payout marked as paid", { payout_id, amount: payout.amount, newBalance });
        break;
      }

      case "cancel": {
        if (!payout_id) {
          return new Response(
            JSON.stringify({ error: "Missing payout_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("marketplace_payouts")
          .update({
            status: "cancelled",
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout_id)
          .eq("workspace_id", workspace_id);

        result = { payout_id, status: "cancelled" };
        log("Payout cancelled", { payout_id });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("Error", { message: (err as Error).message });
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to emit kernel events (fire-and-forget)
function emitKernelEvent(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  type: string,
  entityKind: string,
  entityId: string,
  payload: Record<string, unknown>
) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kernel-ingest-event`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      type,
      entity_kind: entityKind,
      entity_id: entityId,
      actor_type: "system",
      source_module: "marketplace",
      payload,
      schema_version: 1,
      occurred_at: new Date().toISOString(),
    }),
  }).catch((e) => log("Kernel event emit failed", { error: e.message }));
}
