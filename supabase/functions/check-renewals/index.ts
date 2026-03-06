import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenewalRow {
  subscription_id: string;
  workspace_id: string;
  opportunity_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  mrr_amount: number;
  renewal_date: string;
  days_until_renewal: number;
  assigned_to: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for custom days_ahead (default 7)
    let daysAhead = 7;
    try {
      const body = await req.json();
      if (body.days_ahead) {
        daysAhead = parseInt(body.days_ahead, 10);
      }
    } catch {
      // Use default
    }

    console.log(`[B2B-FINANCE] Checking renewals in next ${daysAhead} days...`);

    // Get upcoming renewals using the database function
    const { data: renewals, error: renewalsError } = await supabase.rpc(
      "get_upcoming_renewals",
      { days_ahead: daysAhead }
    );

    if (renewalsError) {
      console.error("[B2B-FINANCE] RENEWALS_QUERY_FAILED", renewalsError);
      throw renewalsError;
    }

    const typedRenewals = renewals as RenewalRow[];
    console.log(`[B2B-FINANCE] Found ${typedRenewals?.length || 0} upcoming renewals`);

    if (!typedRenewals || typedRenewals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No upcoming renewals found",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tasksCreated = 0;
    let notificationsCreated = 0;

    for (const renewal of typedRenewals) {
      const customerName = renewal.company_name || renewal.contact_name || "Cliente";
      const daysText = renewal.days_until_renewal === 0 
        ? "hoje" 
        : `em ${renewal.days_until_renewal} dias`;

      // Check if task already exists for this subscription renewal
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("related_type", "subscription")
        .eq("related_id", renewal.subscription_id)
        .ilike("title", "%renovação%")
        .eq("status", "todo")
        .single();

      // Only create task if one doesn't already exist
      if (!existingTask) {
        // Create task for renewal confirmation/upsell
        const { error: taskError } = await supabase.from("tasks").insert({
          workspace_id: renewal.workspace_id,
          title: `Confirmar Renovação/Upsell - ${customerName}`,
          description: `A subscrição de ${customerName} renova ${daysText}. Verifique se o cliente deseja renovar e explore oportunidades de upsell.`,
          assigned_to: renewal.assigned_to,
          due_date: renewal.renewal_date,
          priority: renewal.days_until_renewal <= 3 ? "high" : "medium",
          status: "todo",
          related_type: "subscription",
          related_id: renewal.subscription_id,
        });

        if (taskError) {
          console.error("[B2B-FINANCE] RENEWAL_TASK_CREATE_FAILED", taskError);
        } else {
          tasksCreated++;
        }
      }

      // Create notification for assigned user
      if (renewal.assigned_to) {
        try {
          const { error: notifError } = await supabase.from("notifications").insert({
            workspace_id: renewal.workspace_id,
            user_id: renewal.assigned_to,
            title: "Renovação Próxima",
            message: `A subscrição de ${customerName} (€${renewal.mrr_amount}/mês) renova ${daysText}.`,
            type: "info",
            related_type: "subscription",
            related_id: renewal.subscription_id,
          });

          if (!notifError) {
            notificationsCreated++;
          }
        } catch (e) {
          console.warn("[B2B-FINANCE] NOTIFICATION_CREATE_FAILED", e);
        }
      }

      // Log a subscription event for tracking
      await supabase.from("subscription_events").insert({
        workspace_id: renewal.workspace_id,
        subscription_id: renewal.subscription_id,
        event_type: "manual_adjustment",
        notes: `Lembrete de renovação enviado (${daysText})`,
        occurred_at: new Date().toISOString(),
      });
    }

    const result = {
      success: true,
      message: `Processed ${typedRenewals.length} upcoming renewals`,
      processed: typedRenewals.length,
      tasks_created: tasksCreated,
      notifications_created: notificationsCreated,
    };

    console.log("[B2B-FINANCE] Renewal check completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[B2B-FINANCE] CHECK_RENEWALS_FAILED", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
