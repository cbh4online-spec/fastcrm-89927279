import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  workspaceId: string;
  knowledgeBaseId?: string;
  status?: string;
  threshold?: number;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      workspaceId, 
      knowledgeBaseId, 
      status, 
      limit = 20 
    }: SearchRequest = await req.json();

    if (!query || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "query and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-KNOWLEDGE] SEARCH_START query="${query}" workspace=${workspaceId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract key terms from the query for better matching
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
              {
                role: "system",
                content: "Extract 3-5 search keywords from the user query. Return ONLY a JSON array of strings. Focus on nouns and key concepts."
              },
              { role: "user", content: query }
            ],
            temperature: 0
          }),
        });

        if (keywordResponse.ok) {
          const data = await keywordResponse.json();
          const raw = data.choices?.[0]?.message?.content || "[]";
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            searchTerms = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn("[AI-KNOWLEDGE] SEARCH_KEYWORD_EXTRACTION_FAILED", e);
      }
    }

    // Fallback: split query into words
    if (searchTerms.length === 0) {
      searchTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);
    }

    // Build text search query
    let dbQuery = supabase
      .from("knowledge_entries")
      .select("id, title, question, content, status, knowledge_base_id, created_at")
      .eq("workspace_id", workspaceId);

    if (knowledgeBaseId) {
      dbQuery = dbQuery.eq("knowledge_base_id", knowledgeBaseId);
    }

    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

    dbQuery = dbQuery.limit(limit * 3);

    const { data: entries, error } = await dbQuery;

    if (error) {
      console.error("[AI-KNOWLEDGE] SEARCH_DB_ERROR", error);
      throw error;
    }

    // Rank results by keyword match score
    const scoredResults = (entries || []).map(entry => {
      const searchableText = [
        entry.title || "",
        entry.question || "",
        entry.content || ""
      ].join(" ").toLowerCase();

      let score = 0;
      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        const regex = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const exactMatches = (searchableText.match(regex) || []).length;
        score += exactMatches * 2;
        
        if (searchableText.includes(termLower)) {
          score += 1;
        }
      }

      return { ...entry, similarity: score / (searchTerms.length * 3) };
    })
    .filter(r => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

    console.log(`[AI-KNOWLEDGE] SEARCH_COMPLETE results=${scoredResults.length} terms=${searchTerms.join(",")}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: scoredResults,
        query,
        searchTerms,
        matchCount: scoredResults.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI-KNOWLEDGE] SEARCH_ERROR", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
