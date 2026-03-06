import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const workspaceId = body.workspace_id;
    if (!workspaceId) throw new Error("workspace_id required");

    const consumerId = body.consumer_id ?? "default";
    const correlationId = body.correlation_id ?? null;

    // Read watermark from kernel_event_state
    const { data: state } = await supabase
      .from("kernel_event_state")
      .select("last_event_id, last_processed_at")
      .eq("workspace_id", workspaceId)
      .eq("consumer_id", consumerId)
      .maybeSingle();

    const since = state?.last_processed_at ?? new Date(Date.now() - 3600_000).toISOString();

    // Fetch unprocessed events (status = pending)
    const { data: events, error } = await supabase
      .from("kernel_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
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
        body: JSON.stringify({ workspace_id: workspaceId, events, correlation_id: correlationId }),
      });
    } catch (err) {
      await supabase.from("kernel_event_deadletter").insert(
        events.map(e => ({
          workspace_id: workspaceId,
          consumer_key: consumerId,
          original_event: e,
          error: `compute-decisions dispatch failed: ${(err as Error).message}`,
          last_attempt_at: new Date().toISOString(),
        }))
      );
    }

    // Dispatch impact for ALL events via kernel-compute-impact (cross-module)
    try {
      await fetch(`${supabaseUrl}/functions/v1/kernel-compute-impact`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workspace_id: workspaceId, events }),
      });
    } catch (err) {
      console.error("Impact dispatch failed:", (err as Error).message);
    }

    // Mark events as processed
    const eventIds = events.map(e => e.id);
    const now = new Date().toISOString();
    await supabase
      .from("kernel_events")
      .update({ status: "processed", processed_at: now })
      .in("id", eventIds);

    // Update watermark
    const lastEvent = events[events.length - 1];
    await supabase.from("kernel_event_state").upsert(
      {
        workspace_id: workspaceId,
        consumer_id: consumerId,
        last_event_id: lastEvent.id,
        last_processed_at: lastEvent.created_at,
        updated_at: now,
      },
      { onConflict: "workspace_id,consumer_id" }
    );

    // Log observability
    supabase.from("system_function_runs").insert({
      workspace_id: workspaceId,
      function_name: "kernel-process-events",
      module_id: "kernel",
      status: "success",
      latency_ms: Date.now() - startTime,
      request_id: correlationId,
    }).then(() => {});

    return new Response(
      JSON.stringify({ processed: events.length, decisions_triggered: true, impact_triggered: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
