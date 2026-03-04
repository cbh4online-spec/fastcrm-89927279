import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const workspaceId = body.workspace_id;
    if (!workspaceId) throw new Error("workspace_id required");

    const consumerId = body.consumer_id ?? "default";

    // Read watermark from kernel_event_state
    const { data: state } = await supabase
      .from("kernel_event_state")
      .select("last_event_id, last_processed_at")
      .eq("workspace_id", workspaceId)
      .eq("consumer_id", consumerId)
      .maybeSingle();

    const since = state?.last_processed_at ?? new Date(Date.now() - 3600_000).toISOString();

    // Fetch unprocessed events
    const { data: events, error } = await supabase
      .from("kernel_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    if (!events?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` };

    // Dispatch to compute-decisions
    try {
      await fetch(`${supabaseUrl}/functions/v1/kernel-compute-decisions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workspace_id: workspaceId, events }),
      });
    } catch (err) {
      // Deadletter failed events
      await supabase.from("kernel_event_deadletter").insert(
        events.map(e => ({
          workspace_id: workspaceId,
          original_event: e,
          error: `compute-decisions dispatch failed: ${(err as Error).message}`,
        }))
      );
    }

    // Dispatch impact for change events
    const changeEvents = events.filter(e =>
      ["created", "updated", "deleted", "published"].includes(e.type) ||
      e.type.includes("change") || e.type.includes("stage_changed") ||
      e.type.includes("STAGE_CHANGED") || e.type.includes("UPDATED") || e.type.includes("CLOSED")
    );

    if (changeEvents.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/kernel-compute-impact`, {
          method: "POST",
          headers,
          body: JSON.stringify({ workspace_id: workspaceId, events: changeEvents }),
        });
      } catch (err) {
        console.error("Impact dispatch failed:", (err as Error).message);
      }
    }

    // Update watermark
    const lastEvent = events[events.length - 1];
    await supabase.from("kernel_event_state").upsert(
      {
        workspace_id: workspaceId,
        consumer_id: consumerId,
        last_event_id: lastEvent.id,
        last_processed_at: lastEvent.created_at,
      },
      { onConflict: "workspace_id,consumer_id" }
    );

    return new Response(
      JSON.stringify({ processed: events.length, decisions_triggered: true, impact_triggered: changeEvents.length > 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
