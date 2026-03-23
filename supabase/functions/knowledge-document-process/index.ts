import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  // New vectorial format
  document_id?: string;
  // Legacy format
  sourceId?: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  knowledgeBaseId?: string;
  workspaceId?: string;
}

const CHUNK_SIZE_TOKENS = 512;
const CHUNK_OVERLAP = 50;
const MAX_TOTAL_CHARS = 200000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProcessRequest = await req.json();
    const workspaceId = body.workspaceId;

    // AI Gate check
    if (workspaceId) {
      const gate = await aiGate(workspaceId, 'heavy', 'knowledge-document-process');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Route: new vectorial documents
    if (body.document_id) {
      return await processVectorialDocument(supabase, body);
    }

    // Route: legacy knowledge_sources
    if (body.sourceId) {
      return await processLegacyDocument(supabase, body);
    }

    return new Response(
      JSON.stringify({ error: "document_id or sourceId is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DOCPROCESS] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── NEW VECTORIAL PROCESSING ───────────────────────────────────────────────

async function processVectorialDocument(supabase: any, body: ProcessRequest) {
  const { document_id, workspaceId, knowledgeBaseId, filePath, fileName, mimeType } = body;

  console.log(`[DOCPROCESS] VECTORIAL_START doc=${document_id} file=${fileName}`);

  // Update status
  await supabase
    .from("knowledge_documents")
    .update({ status: "processing", error_message: "A processar documento..." })
    .eq("id", document_id);

  try {
    // Get file from storage
    let textContent = "";

    if (filePath) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from("knowledge-documents")
        .createSignedUrl(filePath, 300);

      if (urlError || !urlData) throw new Error(`Failed to get file URL: ${urlError?.message}`);

      const response = await fetch(urlData.signedUrl);
      if (!response.ok) throw new Error(`Failed to download: ${response.status}`);

      const blob = await response.blob();
      const type = mimeType || "";

      if (type === "text/plain" || type === "text/markdown" || fileName?.endsWith(".md") || fileName?.endsWith(".txt")) {
        textContent = await blob.text();
      } else if (type === "application/pdf") {
        textContent = await extractPDFWithAI(blob);
      } else if (type.includes("word") || type.includes("document") || fileName?.endsWith(".docx")) {
        textContent = await extractDocxContent(new Uint8Array(await blob.arrayBuffer()));
      } else {
        textContent = await blob.text();
      }
    }

    if (!textContent || textContent.length < 10) {
      throw new Error("Não foi possível extrair texto do documento");
    }

    const totalContent = textContent.slice(0, MAX_TOTAL_CHARS);
    console.log(`[DOCPROCESS] TEXT_EXTRACTED chars=${totalContent.length}`);

    // Update raw_text
    await supabase
      .from("knowledge_documents")
      .update({ raw_text: totalContent.slice(0, 100000), error_message: "A criar chunks..." })
      .eq("id", document_id);

    // Recursive chunking
    const chunks = recursiveChunk(totalContent, CHUNK_SIZE_TOKENS, CHUNK_OVERLAP);
    console.log(`[DOCPROCESS] CHUNKS_CREATED count=${chunks.length}`);

    // Insert chunks
    const chunkRows = chunks.map((content, index) => ({
      workspace_id: workspaceId,
      knowledge_base_id: knowledgeBaseId,
      document_id,
      content,
      chunk_index: index,
      token_count: estimateTokens(content),
      metadata: { source_file: fileName },
    }));

    const { error: insertError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRows);

    if (insertError) throw insertError;

    // Update document status
    await supabase
      .from("knowledge_documents")
      .update({ status: "processing", chunk_count: chunks.length, error_message: "A gerar embeddings..." })
      .eq("id", document_id);

    // Invoke embedding function asynchronously
    supabase.functions.invoke("knowledge-embedding", {
      body: { document_id, workspace_id: workspaceId },
    }).catch((err: any) => console.error("[DOCPROCESS] Embedding invoke failed:", err));

    return new Response(
      JSON.stringify({ success: true, document_id, chunks: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DOCPROCESS] VECTORIAL_ERROR:", error);
    await supabase
      .from("knowledge_documents")
      .update({ status: "error", error_message: error instanceof Error ? error.message : "Processing failed" })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// ─── LEGACY PROCESSING (knowledge_sources) ──────────────────────────────────

async function processLegacyDocument(supabase: any, body: ProcessRequest) {
  const { sourceId, filePath, fileName, mimeType, knowledgeBaseId, workspaceId } = body;

  console.log(`[DOCPROCESS] LEGACY_START source=${sourceId} file=${fileName}`);

  await supabase
    .from("knowledge_sources")
    .update({ processing_status: "processing", processing_error: "A processar..." })
    .eq("id", sourceId);

  // Start background processing
  (globalThis as any).EdgeRuntime?.waitUntil?.(
    processLegacyInBackground(supabase, sourceId!, filePath!, fileName!, mimeType!, knowledgeBaseId!, workspaceId!)
      .catch(async (error) => {
        console.error("[DOCPROCESS] LEGACY_BG_ERROR", error);
        await supabase
          .from("knowledge_sources")
          .update({
            processing_status: "failed",
            processing_error: error instanceof Error ? error.message : "Erro no processamento",
          })
          .eq("id", sourceId);
      })
  );

  return new Response(
    JSON.stringify({ success: true, sourceId, message: "Processing started" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function processLegacyInBackground(
  supabase: any, sourceId: string, filePath: string, fileName: string, 
  mimeType: string, knowledgeBaseId: string, workspaceId: string
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const { data: urlData, error: urlError } = await supabase.storage
    .from("knowledge-documents")
    .createSignedUrl(filePath, 300);

  if (urlError || !urlData) throw new Error(`Failed to get file URL: ${urlError?.message}`);

  const response = await fetch(urlData.signedUrl);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);

  const blob = await response.blob();
  let textContent = "";

  if (mimeType === "text/plain") {
    textContent = await blob.text();
  } else if (mimeType === "application/pdf") {
    textContent = await extractPDFWithAI(blob);
  } else if (mimeType?.includes("word") || mimeType?.includes("document")) {
    textContent = await extractDocxContent(new Uint8Array(await blob.arrayBuffer()));
  }

  if (!textContent || textContent.length < 10) {
    throw new Error("Não foi possível extrair texto do documento");
  }

  const totalContent = textContent.slice(0, 100000);

  // Process with AI for FAQ extraction (legacy)
  const aiResult = await processWithAI(totalContent, fileName, LOVABLE_API_KEY);

  await supabase
    .from("knowledge_sources")
    .update({
      original_content: totalContent.slice(0, 50000),
      processed_content: aiResult.processedContent,
      extracted_topics: aiResult.topics,
      processing_status: "completed",
      processing_error: null,
      last_processed_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  // Create FAQ entries
  if (aiResult.faqs?.length > 0) {
    const { data: sourceData } = await supabase
      .from("knowledge_sources").select("created_by").eq("id", sourceId).single();

    const entries = aiResult.faqs.map((faq: any) => ({
      knowledge_base_id: knowledgeBaseId,
      source_id: sourceId,
      workspace_id: workspaceId,
      entry_type: "faq",
      title: faq.question,
      question: faq.question,
      content: faq.answer,
      summary: faq.answer.slice(0, 200),
      keywords: aiResult.topics,
      status: "draft",
      created_by: sourceData?.created_by,
    }));

    await supabase.from("knowledge_entries").insert(entries);
  }

  // Create article entry
  await supabase.from("knowledge_entries").insert({
    knowledge_base_id: knowledgeBaseId,
    source_id: sourceId,
    workspace_id: workspaceId,
    entry_type: "article",
    title: fileName.replace(/\.[^/.]+$/, ""),
    content: aiResult.processedContent,
    summary: aiResult.summary,
    keywords: aiResult.topics,
    status: "draft",
    created_by: (await supabase.from("knowledge_sources").select("created_by").eq("id", sourceId).single()).data?.created_by,
  });

  console.log(`[DOCPROCESS] LEGACY_SUCCESS file=${fileName}`);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function recursiveChunk(text: string, targetTokens: number, overlap: number): string[] {
  const separators = ["\n\n", "\n", ". ", " "];
  return splitRecursive(text, targetTokens * 4, overlap * 4, separators); // ~4 chars per token
}

function splitRecursive(text: string, chunkSize: number, overlap: number, separators: string[]): string[] {
  if (text.length <= chunkSize) return [text.trim()].filter(Boolean);

  const sep = separators.find((s) => text.includes(s)) || separators[separators.length - 1];
  const parts = text.split(sep);
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (candidate.length > chunkSize && current) {
      chunks.push(current.trim());
      // Keep overlap
      const overlapText = current.slice(-overlap);
      current = overlapText + sep + part;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // If any chunk is still too large, recurse with next separator
  const nextSeps = separators.slice(separators.indexOf(sep) + 1);
  if (nextSeps.length > 0) {
    return chunks.flatMap((c) =>
      c.length > chunkSize ? splitRecursive(c, chunkSize, overlap, nextSeps) : [c]
    );
  }

  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function extractPDFWithAI(blob: Blob): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return "PDF - text extraction unavailable";

  const base64 = await blobToBase64(blob);

  const _startTime = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract ALL text content from this PDF. Preserve structure with paragraphs. Return only the text." },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 16000,
    }),
  });

  if (!response.ok) return "PDF - extraction failed";
  const result = await response.json();
  return result.choices?.[0]?.message?.content || "Could not extract PDF content";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

async function extractDocxContent(data: Uint8Array): Promise<string> {
  try {
    const text = new TextDecoder("utf-8").decode(data);
    const xmlMatch = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (xmlMatch) {
      const extracted = xmlMatch.map((m) => m.replace(/<[^>]+>/g, "")).join(" ");
      if (extracted.length > 50) return extracted;
    }
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
  } catch {
    return "Could not extract DOCX content";
  }
}

async function processWithAI(content: string, fileName: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Analisa o documento "${fileName}" e extrai informação estruturada. Responde em JSON: {"processedContent":"...","topics":["..."],"faqs":[{"question":"...","answer":"..."}],"summary":"..."}`,
        },
        { role: "user", content: content.slice(0, 30000) },
      ],
      temperature: 0.2,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);

  const result = await response.json()

    // AI Usage Instrumentation
    try {
      const _usage = result?.usage;
      logAIUsage({
        workspace_id: workspace_id,
        feature: 'knowledge-document-process',
        model: result?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
  const text = result.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
    return JSON.parse(jsonMatch[1] || text);
  } catch {
    return { processedContent: text, topics: [], faqs: [], summary: text.slice(0, 200) };
  }
}
