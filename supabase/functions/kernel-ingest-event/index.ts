import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { workspace_id, type, entity_kind, entity_id, actor_type, actor_id, payload, source_module, source_route, idempotency_key } = body;

    if (!workspace_id || !type || !entity_kind || !entity_id) {
      throw new Error("workspace_id, type, entity_kind, entity_id required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert event (idempotency handled by unique index)
    const { data: event, error: evErr } = await supabase
      .from("kernel_events")
      .insert({
        workspace_id,
        type,
        entity_kind,
        entity_id,
        actor_type: actor_type ?? "system",
        actor_id: actor_id ?? null,
        payload: payload ?? {},
        source_module: source_module ?? null,
        source_route: source_route ?? null,
        idempotency_key: idempotency_key ?? null,
      })
      .select("id")
      .single();

    if (evErr) {
      // Idempotency duplicate → return success
      if (evErr.code === "23505") {
        return new Response(JSON.stringify({ status: "duplicate", idempotency_key }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw evErr;
    }

    // Upsert entity registry
    const title = payload?.title ?? payload?.name ?? entity_id;
    await supabase
      .from("kernel_entities")
      .upsert(
        {
          workspace_id,
          kind: entity_kind,
          entity_id,
          title: typeof title === "string" ? title : entity_id,
          meta: payload ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,kind,entity_id" }
      );

    return new Response(
      JSON.stringify({ status: "ok", event_id: event.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
