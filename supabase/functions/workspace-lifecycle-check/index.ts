import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "jorge.cardoso@digita4ads.pt";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Run auto-downgrade check
    const { data: downgradeResult, error: rpcError } = await supabase.rpc(
      "check_and_downgrade_expired_trials"
    );
    if (rpcError) {
      console.error("RPC error:", rpcError);
    }

    console.log("[LIFECYCLE] Downgrade result:", JSON.stringify(downgradeResult));

    // 2. Check trials expiring in 3 days — create warnings
    const { data: expiringTrials } = await supabase
      .from("workspace_subscriptions")
      .select("workspace_id, trial_ends_at, plan, workspaces(name)")
      .eq("status", "trialing")
      .not("trial_ends_at", "is", null)
      .gte("trial_ends_at", new Date().toISOString())
      .lte(
        "trial_ends_at",
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (expiringTrials && expiringTrials.length > 0) {
      for (const trial of expiringTrials) {
        const wsName = (trial as any).workspaces?.name || "Workspace";
        const daysLeft = Math.ceil(
          (new Date(trial.trial_ends_at!).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000)
        );

        // Check if we already sent a warning for this workspace today
        const { data: existing } = await supabase
          .from("admin_notifications")
          .select("id")
          .eq("workspace_id", trial.workspace_id)
          .eq("type", "trial_expiring_soon")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("admin_notifications").insert({
            workspace_id: trial.workspace_id,
            type: "trial_expiring_soon",
            title: `Trial expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}: ${wsName}`,
            message: `O trial do workspace "${wsName}" expira em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}. Contactar para conversão.`,
            metadata: {
              days_left: daysLeft,
              trial_ends_at: trial.trial_ends_at,
              plan: trial.plan,
            },
          });
        }
      }
    }

    // 3. Send email notification to admin about downgrades
    const details = downgradeResult?.details || [];
    if (details.length > 0) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "admin-lifecycle-alert",
            recipientEmail: ADMIN_EMAIL,
            idempotencyKey: `lifecycle-${new Date().toISOString().split("T")[0]}`,
            templateData: {
              downgrades: details,
              totalTrials: downgradeResult?.trials_downgraded || 0,
              totalExpired: downgradeResult?.subscriptions_downgraded || 0,
            },
          },
        });
      } catch (emailErr) {
        console.error("[LIFECYCLE] Email send error (non-blocking):", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...downgradeResult,
        expiring_trials_warned: expiringTrials?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[LIFECYCLE] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
