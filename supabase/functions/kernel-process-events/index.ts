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

    // Get last processed watermark from drift_scores meta or use 1 hour ago
    const since = body.since ?? new Date(Date.now() - 3600_000).toISOString();

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

    // Dispatch to compute-decisions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/kernel-compute-decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ workspace_id: workspaceId, events }),
    });

    // Check for change-type events and dispatch impact computation
    const changeEvents = events.filter(e =>
      ["created", "updated", "deleted", "published"].includes(e.type) ||
      e.type.includes("change") || e.type.includes("stage_changed")
    );

    if (changeEvents.length > 0) {
      await fetch(`${supabaseUrl}/functions/v1/kernel-compute-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ workspace_id: workspaceId, events: changeEvents }),
      });
    }

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
