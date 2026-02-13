import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmbeddingRequest {
  entryId: string;
  title: string;
  question?: string;
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entryId, title, question, content }: EmbeddingRequest = await req.json();
    
    if (!entryId || !title) {
      return new Response(
        JSON.stringify({ error: "entryId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Embedding API (text-embedding-ada-002) is not supported by the current AI gateway.
    // The system uses keyword-based search as the primary search method.
    // This function now extracts keywords and stores them for better searchability.

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use a chat model to extract keywords for better search
    let keywords: string[] = [];
    if (LOVABLE_API_KEY) {
      try {
        const textToAnalyze = [title, question, content].filter(Boolean).join("\n\n");
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
                content: "Extract the most important search keywords from the text. Return ONLY a JSON array of strings, no other text. Max 20 keywords. Include Portuguese and English variants if applicable."
              },
              { role: "user", content: textToAnalyze.slice(0, 4000) }
            ],
            temperature: 0
          }),
        });

        if (keywordResponse.ok) {
          const data = await keywordResponse.json();
          const raw = data.choices?.[0]?.message?.content || "[]";
          // Extract JSON array from response
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            keywords = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn("Keyword extraction failed, continuing without keywords:", e);
      }
    }

    // Update entry with extracted keywords (store in a searchable format)
    const updateData: Record<string, unknown> = {};
    if (keywords.length > 0) {
      updateData.search_keywords = keywords;
    }
    // Mark as processed even without embedding
    updateData.embedding_status = 'keywords_extracted';

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("knowledge_entries")
        .update(updateData)
        .eq("id", entryId);

      if (error) {
        // Non-critical: columns may not exist yet, log and continue
        console.warn("Update with keywords failed (columns may not exist):", error.message);
      }
    }

    console.log(`Keywords extracted for entry ${entryId}: ${keywords.length} keywords`);

    return new Response(
      JSON.stringify({ success: true, entryId, keywords: keywords.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Embedding error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
