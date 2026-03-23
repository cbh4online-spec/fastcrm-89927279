import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both old format (entryId) and new format (document_id)
    if (body.entryId) {
      // Legacy: keyword extraction for knowledge_entries
      return handleLegacyEmbedding(body);
    }

    const { document_id, workspace_id } = body;

    if (!document_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "document_id and workspace_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update document status
    await supabase
      .from("knowledge_documents")
      .update({ status: "embedding", error_message: "A gerar embeddings..." })
      .eq("id", document_id);

    // Fetch chunks without embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from("knowledge_chunks")
      .select("id, content")
      .eq("document_id", document_id)
      .is("embedding", null)
      .order("chunk_index");

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      await supabase
        .from("knowledge_documents")
        .update({ status: "ready", error_message: null })
        .eq("id", document_id);

      return new Response(
        JSON.stringify({ success: true, embedded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[KNOWLEDGE-EMBEDDING] Processing ${chunks.length} chunks for document ${document_id}`);

    let totalEmbedded = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c: any) => c.content);

      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: texts,
        }),
      });

      if (!embResponse.ok) {
        const errText = await embResponse.text();
        console.error(`[KNOWLEDGE-EMBEDDING] OpenAI error: ${embResponse.status} ${errText}`);
        throw new Error(`OpenAI API error: ${embResponse.status}`);
      }

      const embData = await embResponse.json();
      const embeddings = embData.data as Array<{ embedding: number[]; index: number }>;

      for (const emb of embeddings) {
        const chunk = batch[emb.index];
        const vectorStr = `[${emb.embedding.join(",")}]`;

        const { error: updateError } = await supabase
          .from("knowledge_chunks")
          .update({ embedding: vectorStr })
          .eq("id", (chunk as any).id);

        if (updateError) {
          console.error(`[KNOWLEDGE-EMBEDDING] Failed to update chunk ${(chunk as any).id}:`, updateError);
        } else {
          totalEmbedded++;
        }
      }

      await supabase
        .from("knowledge_documents")
        .update({ error_message: `Embeddings: ${totalEmbedded}/${chunks.length}` })
        .eq("id", document_id);
    }

    await supabase
      .from("knowledge_documents")
      .update({ status: "ready", error_message: null })
      .eq("id", document_id);

    console.log(`[KNOWLEDGE-EMBEDDING] Done: ${totalEmbedded} embeddings for document ${document_id}`);

    return new Response(
      JSON.stringify({ success: true, embedded: totalEmbedded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KNOWLEDGE-EMBEDDING] Error:", error);

    try {
      const { document_id } = await req.clone().json().catch(() => ({})) as any;
      if (document_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("knowledge_documents")
          .update({ status: "error", error_message: error instanceof Error ? error.message : "Embedding failed" })
          .eq("id", document_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Legacy handler for old knowledge_entries keyword extraction
async function handleLegacyEmbedding(body: any) {
  const { entryId, title, question, content } = body;

  if (!entryId || !title) {
    return new Response(
      JSON.stringify({ error: "entryId and title are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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
            { role: "system", content: "Extract the most important search keywords from the text. Return ONLY a JSON array of strings, no other text. Max 20 keywords." },
            { role: "user", content: textToAnalyze.slice(0, 4000) }
          ],
          temperature: 0
        }),
      });

      if (keywordResponse.ok) {
        const data = await keywordResponse.json();
        const raw = data.choices?.[0]?.message?.content || "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) keywords = JSON.parse(match[0]);
      }
    } catch (e) {
      console.warn("[AI-KNOWLEDGE] KEYWORD_EXTRACTION_FAILED", e);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (keywords.length > 0) updateData.search_keywords = keywords;
  updateData.embedding_status = 'keywords_extracted';

  if (Object.keys(updateData).length > 0) {
    await supabase.from("knowledge_entries").update(updateData).eq("id", entryId);
  }

  return new Response(
    JSON.stringify({ success: true, entryId, keywords: keywords.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
