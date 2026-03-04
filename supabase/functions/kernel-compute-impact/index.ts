import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, events, change_event_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all links for workspace
    const { data: links } = await supabase
      .from("kernel_links")
      .select("*")
      .eq("workspace_id", workspace_id);

    // Fetch all context_bindings
    const { data: bindings } = await supabase
      .from("context_bindings")
      .select("*")
      .eq("workspace_id", workspace_id);

    // Determine source entities from events or change_event_id
    const sources: { kind: string; id: string; changeEventId?: string }[] = [];

    if (change_event_id) {
      const { data: ce } = await supabase
        .from("change_events")
        .select("*")
        .eq("id", change_event_id)
        .single();
      if (ce) sources.push({ kind: ce.entity_kind, id: ce.entity_id, changeEventId: ce.id });
    }

    if (events?.length) {
      for (const evt of events) {
        // Create change_event record
        const { data: ce } = await supabase
          .from("change_events")
          .insert({
            workspace_id,
            entity_kind: evt.entity_kind,
            entity_id: evt.entity_id,
            change_type: evt.type,
            old_value: evt.payload?.old_value ?? null,
            new_value: evt.payload?.new_value ?? evt.payload ?? null,
          })
          .select("id")
          .single();

        sources.push({ kind: evt.entity_kind, id: evt.entity_id, changeEventId: ce?.id });
      }
    }

    // BFS traversal through kernel_links + context_bindings to find impacted assets
    let totalImpacts = 0;

    for (const source of sources) {
      const visited = new Set<string>();
      const queue: { kind: string; id: string; depth: number }[] = [
        { kind: source.kind, id: source.id, depth: 0 },
      ];
      const impacted: { kind: string; id: string }[] = [];

      while (queue.length > 0) {
        const { kind, id, depth } = queue.shift()!;
        const key = `${kind}:${id}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (depth > 0) impacted.push({ kind, id });

        // Find downstream via kernel_links
        for (const link of links ?? []) {
          if (link.from_kind === kind && link.from_id === id && !visited.has(`${link.to_kind}:${link.to_id}`)) {
            queue.push({ kind: link.to_kind, id: link.to_id, depth: depth + 1 });
          }
        }

        // Find downstream via context_bindings (block → asset)
        for (const binding of bindings ?? []) {
          if (kind === "context_block" && binding.block_id === id && !visited.has(`${binding.asset_kind}:${binding.asset_id}`)) {
            queue.push({ kind: binding.asset_kind, id: binding.asset_id, depth: depth + 1 });
          }
        }
      }

      // Insert impact_map rows
      if (impacted.length > 0 && source.changeEventId) {
        const rows = impacted.map(i => ({
          workspace_id,
          change_event_id: source.changeEventId,
          affected_kind: i.kind,
          affected_id: i.id,
          status: "needs_review",
          suggested_action: `Review ${i.kind} ${i.id} after change in ${source.kind}`,
        }));
        await supabase.from("impact_map").insert(rows);
        totalImpacts += rows.length;

        // Update drift_scores for affected assets
        for (const imp of impacted) {
          await supabase.from("drift_scores").upsert(
            {
              workspace_id,
              scope_type: "asset",
              scope_kind: imp.kind,
              scope_id: imp.id,
              score: 50, // Base impact score
              reasons: [{ type: "change_impact", source_kind: source.kind, source_id: source.id }],
              computed_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,scope_type,scope_kind,scope_id" }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ sources: sources.length, impacts: totalImpacts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
