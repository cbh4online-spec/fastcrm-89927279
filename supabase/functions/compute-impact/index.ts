import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_block_id, workspace_id, direction = "bidirectional" } = await req.json();
    if (!source_block_id || !workspace_id) throw new Error("source_block_id and workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const MAX_DEPTH = 5;
    const MIN_SCORE = 1;

    // BFS function that works in either direction
    function bfs(dir: "downstream" | "upstream") {
      const visited = new Set<string>();
      const queue: { blockId: string; depth: number; pathStrength: number }[] = [
        { blockId: source_block_id, depth: 0, pathStrength: 100 },
      ];
      const results: { block_id: string; depth: number; impact_score: number; title?: string; block_type?: string; direction: string }[] = [];

      while (queue.length > 0) {
        const { blockId, depth, pathStrength } = queue.shift()!;
        if (visited.has(blockId)) continue;
        if (depth > MAX_DEPTH) continue;
        visited.add(blockId);

        if (depth > 0 && Math.round(pathStrength) >= MIN_SCORE) {
          const info = blockMap[blockId];
          results.push({
            block_id: blockId,
            depth,
            impact_score: Math.round(pathStrength),
            title: info?.title,
            block_type: info?.block_type,
            direction: dir,
          });
        }

        // Find neighbors based on direction
        const neighbors = (allDeps ?? []).filter((d) =>
          dir === "downstream"
            ? d.source_block_id === blockId
            : d.target_block_id === blockId
        );
        for (const n of neighbors) {
          const nextId = dir === "downstream" ? n.target_block_id : n.source_block_id;
          if (!visited.has(nextId)) {
            queue.push({
              blockId: nextId,
              depth: depth + 1,
              pathStrength: pathStrength * (n.strength / 100),
            });
          }
        }
      }
      return results;
    }

    let impacts: typeof ReturnType<typeof bfs> = [];

    if (direction === "downstream" || direction === "bidirectional") {
      impacts = impacts.concat(bfs("downstream"));
    }
    if (direction === "upstream" || direction === "bidirectional") {
      const upstream = bfs("upstream");
      // Deduplicate — keep higher score
      const existingMap = new Map(impacts.map(i => [i.block_id, i]));
      for (const u of upstream) {
        const existing = existingMap.get(u.block_id);
        if (!existing || u.impact_score > existing.impact_score) {
          if (existing) impacts = impacts.filter(i => i.block_id !== u.block_id);
          impacts.push(u);
        }
      }
    }

    // Sort by impact score desc
    impacts.sort((a, b) => b.impact_score - a.impact_score);

    return new Response(
      JSON.stringify({ source_block_id, direction, impacts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
