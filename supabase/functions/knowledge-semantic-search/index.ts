import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, workspaceId, knowledgeBaseId, status, limit = 20, mode = 'auto' } = await req.json();

    // AI Gate check
    if (workspaceId) {
      const gate = await aiGate(workspaceId, 'medium', 'knowledge-semantic-search');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!query || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "query and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[KNOWLEDGE-SEARCH] START query="${query}" mode=${mode}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vector search mode
    if (mode === 'vector' || mode === 'auto') {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

      if (OPENAI_API_KEY && knowledgeBaseId) {
        try {
          // Generate query embedding
          const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: query,
            }),
          });

          if (embResponse.ok) {
            const embData = await embResponse.json();
            const queryEmbedding = embData.data?.[0]?.embedding;

            if (queryEmbedding) {
              const vectorStr = `[${queryEmbedding.join(",")}]`;

              const { data: vectorResults, error: rpcError } = await supabase.rpc("match_knowledge_chunks", {
                p_query_embedding: vectorStr,
                p_knowledge_base_id: knowledgeBaseId,
                p_workspace_id: workspaceId,
                p_match_threshold: 0.4,
                p_match_count: limit,
              });

              if (!rpcError && vectorResults && vectorResults.length > 0) {
                console.log(`[KNOWLEDGE-SEARCH] VECTOR_RESULTS count=${vectorResults.length}`);
                return new Response(
                  JSON.stringify({
                    success: true,
                    results: vectorResults,
                    query,
                    mode: 'vector',
                    matchCount: vectorResults.length,
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }

              if (rpcError) console.warn("[KNOWLEDGE-SEARCH] RPC error:", rpcError);
            }
          }
        } catch (e) {
          console.warn("[KNOWLEDGE-SEARCH] Vector search failed, falling back to text:", e);
        }
      }
    }

    // Fallback: text-based search on knowledge_entries (legacy)
    console.log("[KNOWLEDGE-SEARCH] FALLBACK_TEXT_SEARCH");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let searchTerms: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const keywordResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Extract 3-5 search keywords. Return ONLY a JSON array of strings." },
              { role: "user", content: query },
            ],
            temperature: 0,
          }),
        });

        if (keywordResponse.ok) {
          const data = await keywordResponse.json();
          const raw = data.choices?.[0]?.message?.content || "[]";
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) searchTerms = JSON.parse(match[0]);
        }
      } catch {}
    }

    if (searchTerms.length === 0) {
      searchTerms = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    }

    let dbQuery = supabase
      .from("knowledge_entries")
      .select("id, title, question, content, status, knowledge_base_id, created_at")
      .eq("workspace_id", workspaceId);

    if (knowledgeBaseId) dbQuery = dbQuery.eq("knowledge_base_id", knowledgeBaseId);
    if (status) dbQuery = dbQuery.eq("status", status);
    dbQuery = dbQuery.limit(limit * 3);

    const { data: entries, error } = await dbQuery;
    if (error) throw error;

    const scoredResults = (entries || [])
      .map((entry: any) => {
        const text = [entry.title || "", entry.question || "", entry.content || ""].join(" ").toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (text.includes(term.toLowerCase())) score += 1;
        }
        return { ...entry, similarity: score / (searchTerms.length * 3) };
      })
      .filter((r: any) => r.similarity > 0)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    return new Response(
      JSON.stringify({ success: true, results: scoredResults, query, mode: 'text', matchCount: scoredResults.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KNOWLEDGE-SEARCH] ERROR:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
