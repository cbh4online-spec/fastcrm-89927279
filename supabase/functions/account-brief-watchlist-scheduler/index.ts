import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const FREQ_HOURS: Record<string, number> = {
  daily: 24,
  weekly: 168,
  biweekly: 336,
  monthly: 720,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find active watchlists due for refresh
    const { data: dueItems, error } = await supabase
      .from("account_brief_watchlists")
      .select("id, workspace_id, account_id, refresh_frequency")
      .eq("is_active", true)
      .neq("refresh_frequency", "manual")
      .lte("next_run_at", new Date().toISOString());

    if (error) throw error;
    if (!dueItems?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Watchlist Scheduler] ${dueItems.length} items due for refresh`);

    let processed = 0;
    let failed = 0;

    for (const item of dueItems) {
      try {
        // Invoke refresh
        const resp = await fetch(`${supabaseUrl}/functions/v1/account-brief-refresh-account`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            accountId: item.account_id,
            workspaceId: item.workspace_id,
            triggerType: "scheduled",
          }),
        });

        if (!resp.ok) {
          console.warn(`[Watchlist Scheduler] Refresh failed for account ${item.account_id}: ${resp.status}`);
          failed++;
          continue;
        }

        // Update next_run_at and last_run_at
        const hours = FREQ_HOURS[item.refresh_frequency] || 168;
        await supabase
          .from("account_brief_watchlists")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: new Date(Date.now() + hours * 3600000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        processed++;
      } catch (err) {
        console.error(`[Watchlist Scheduler] Error for ${item.account_id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed, failed, total: dueItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Watchlist Scheduler] Fatal error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
