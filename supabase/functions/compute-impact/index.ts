import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_block_id, workspace_id } = await req.json();
    if (!source_block_id || !workspace_id) throw new Error("source_block_id and workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // BFS traversal of dependency graph from source
    const visited = new Set<string>();
    const queue: { blockId: string; depth: number; pathStrength: number }[] = [
      { blockId: source_block_id, depth: 0, pathStrength: 100 },
    ];
    const impacts: { block_id: string; depth: number; impact_score: number; title?: string; block_type?: string }[] = [];

    // Fetch all deps for workspace once
    const { data: allDeps } = await supabase
      .from("context_dependencies")
      .select("source_block_id, target_block_id, strength, relation")
      .eq("workspace_id", workspace_id);

    // Fetch block info
    const { data: blocks } = await supabase
      .from("context_blocks")
      .select("id, title, block_type")
      .eq("workspace_id", workspace_id);
    const blockMap: Record<string, { title: string; block_type: string }> = {};
    for (const b of blocks ?? []) {
      blockMap[b.id] = { title: b.title, block_type: b.block_type };
    }

    while (queue.length > 0) {
      const { blockId, depth, pathStrength } = queue.shift()!;
      if (visited.has(blockId)) continue;
      visited.add(blockId);

      if (depth > 0) {
        const info = blockMap[blockId];
        impacts.push({
          block_id: blockId,
          depth,
          impact_score: Math.round(pathStrength),
          title: info?.title,
          block_type: info?.block_type,
        });
      }

      // Find targets
      const targets = (allDeps ?? []).filter((d) => d.source_block_id === blockId);
      for (const t of targets) {
        if (!visited.has(t.target_block_id)) {
          queue.push({
            blockId: t.target_block_id,
            depth: depth + 1,
            pathStrength: pathStrength * (t.strength / 100),
          });
        }
      }
    }

    // Sort by impact score desc
    impacts.sort((a, b) => b.impact_score - a.impact_score);

    return new Response(
      JSON.stringify({ source_block_id, impacts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
