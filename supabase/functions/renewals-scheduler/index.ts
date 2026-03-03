import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    // Get items renewing in next 30 days
    const { data: items, error } = await supabase
      .from("renewal_items")
      .select("*, contract:renewal_contracts(id, workspace_id, company_id, owner_user_id, status)")
      .lte("next_renewal_date", in30Days.toISOString().split("T")[0])
      .in("status", ["active", "pending_renewal"]);

    if (error) throw error;

    let eventsCreated = 0;
    let statusUpdated = 0;

    for (const item of (items || [])) {
      const contract = item.contract as any;
      if (!contract || contract.status === "cancelled" || contract.status === "expired") continue;

      const renewalDate = new Date(item.next_renewal_date);
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const graceEnd = new Date(renewalDate);
      graceEnd.setDate(graceEnd.getDate() + (item.grace_period_days || 7));

      // Update status based on days
      let newStatus = item.status;
      if (daysUntil < 0 && now > graceEnd) {
        newStatus = "overdue";
      } else if (daysUntil <= 7) {
        newStatus = "pending_renewal";
      }

      if (newStatus !== item.status) {
        await supabase.from("renewal_items").update({ status: newStatus }).eq("id", item.id);
        statusUpdated++;
      }

      // Create events for key milestones (30, 15, 7, 1, 0 days)
      if ([30, 15, 7, 1, 0].includes(daysUntil) || daysUntil < 0) {
        const eventType = daysUntil < 0 ? "overdue" : "renewal_due";
        
        // Check if event already exists today
        const today = now.toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("renewal_events")
          .select("id")
          .eq("contract_id", contract.id)
          .eq("event_type", eventType)
          .gte("created_at", today + "T00:00:00")
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("renewal_events").insert({
            workspace_id: contract.workspace_id,
            contract_id: contract.id,
            event_type: eventType,
            payload_json: { item_id: item.id, item_name: item.name, days_until: daysUntil },
          });
          eventsCreated++;
        }
      }

      // Check hours_pack thresholds
      if (item.item_type === "hours_pack" && item.meta_json) {
        const meta = item.meta_json as Record<string, any>;
        const included = meta.hours_included || 0;
        const remaining = meta.hours_remaining || 0;
        if (included > 0 && remaining / included <= 0.2) {
          const today = now.toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("renewal_events")
            .select("id")
            .eq("contract_id", contract.id)
            .eq("event_type", "consumption_logged")
            .gte("created_at", today + "T00:00:00")
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("renewal_events").insert({
              workspace_id: contract.workspace_id,
              contract_id: contract.id,
              event_type: "consumption_logged",
              payload_json: { alert: "low_balance", item_name: item.name, remaining, included, percentage: Math.round((remaining / included) * 100) },
            });
            eventsCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, items_checked: items?.length || 0, events_created: eventsCreated, status_updated: statusUpdated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in renewals-scheduler:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
