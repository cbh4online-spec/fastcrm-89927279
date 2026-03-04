import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PAYOUT-EXECUTE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, payout_id, workspace_id } = await req.json();
    logStep("Request", { action, payout_id, workspace_id });

    if (action === "mark_paid") {
      const { error } = await supabase
        .from("c2c_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payout_id);

      if (error) throw new Error(error.message);

      // Mark related attributions as paid
      await supabase
        .from("c2c_affiliate_attributions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("status", "approved");

      logStep("Payout marked as paid", { payout_id });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_failed") {
      await supabase
        .from("c2c_payouts")
        .update({ status: "failed" })
        .eq("id", payout_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reverse") {
      await supabase
        .from("c2c_payouts")
        .update({ status: "reversed" })
        .eq("id", payout_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export_csv") {
      const { data: payouts } = await supabase
        .from("c2c_payouts")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("status", "queued")
        .order("created_at", { ascending: false });

      const csvRows = [
        "ID,User ID,Type,Amount,Currency,Method,Period Start,Period End,Created At",
      ];
      for (const p of payouts || []) {
        csvRows.push(
          `${p.id},${p.user_id},${p.payout_type},${p.amount},${p.currency},${p.method},${p.period_start || ""},${p.period_end || ""},${p.created_at}`
        );
      }

      logStep("CSV exported", { count: (payouts || []).length });
      return new Response(csvRows.join("\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=payouts.csv",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
