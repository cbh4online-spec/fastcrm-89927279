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
    const body = await req.json();
    const { query, context, knowledgeEntries, persona, conversationHistory, workspaceId, knowledgeBaseId, mode } = body;

    // AI Gate check
    const wsId = workspaceId || null;
    if (wsId) {
      const gate = await aiGate(wsId, 'medium', 'knowledge-query');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const startTime = Date.now();

    // ─── RAG MODE: Vector search → generate answer ────────────────
    if (mode === 'rag' && workspaceId && knowledgeBaseId) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

      let ragContext = "";
      let sources: any[] = [];

      if (OPENAI_API_KEY) {
        try {
          // Generate query embedding
          const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
          });

          if (embResponse.ok) {
            const embData = await embResponse.json();
            const queryEmbedding = embData.data?.[0]?.embedding;

            if (queryEmbedding) {
              const vectorStr = `[${queryEmbedding.join(",")}]`;

              const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
                p_query_embedding: vectorStr,
                p_knowledge_base_id: knowledgeBaseId,
                p_workspace_id: workspaceId,
                p_match_threshold: 0.4,
                p_match_count: 8,
              });

              if (chunks && chunks.length > 0) {
                ragContext = chunks.map((c: any, i: number) => `[${i + 1}] ${c.content}`).join("\n\n");
                sources = chunks.map((c: any) => ({
                  document_id: c.document_id,
                  content: c.content.slice(0, 200),
                  similarity: c.similarity,
                }));
              }
            }
          }
        } catch (e) {
          console.warn("[KNOWLEDGE-QUERY] Vector retrieval failed:", e);
        }
      }

      if (ragContext) {
        // Generate answer with Lovable AI
        const ragPrompt = `Responde à pergunta do utilizador com base APENAS no contexto fornecido.

## Contexto da Base de Conhecimento:
${ragContext}

## Regras:
1. Responde APENAS com informação do contexto acima
2. Se não tiveres informação suficiente, diz claramente
3. Nunca inventes informação
4. Mantém respostas claras e úteis
5. Cita as fontes usando [1], [2], etc.`;

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
              { role: "system", content: ragPrompt },
              ...(conversationHistory || []),
              { role: "user", content: query },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          const answer = aiResult.choices?.[0]?.message?.content || "";

          return new Response(
            JSON.stringify({
              answer,
              sources,
              confidence: sources.length > 0 ? Math.min(sources[0].similarity + 0.1, 1) : 0.5,
              responseTimeMs: Date.now() - startTime,
              mode: 'rag',
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ─── LEGACY MODE: knowledge_entries context ────────────────────
    let knowledgeContext = "";
    if (knowledgeEntries && knowledgeEntries.length > 0) {
      knowledgeContext = "\n\n## Base de Conhecimento Disponível:\n";
      knowledgeEntries.forEach((entry: any, i: number) => {
        knowledgeContext += `\n### ${i + 1}. ${entry.title}\n${entry.content}\n`;
      });
    }

    let personaPrompt = persona?.systemPrompt ||
      "És um assistente de CRM inteligente. Ajudas com atendimento, vendas e suporte.";

    if (persona) {
      personaPrompt += `\nTom de voz: ${persona.toneOfVoice}`;
      personaPrompt += `\nProfundidade técnica: ${persona.technicalDepth}`;
      if (persona.limitations?.length) {
        personaPrompt += `\n\nLimitações:\n${persona.limitations.map((l: string) => `- ${l}`).join("\n")}`;
      }
    }

    const systemPrompt = `${personaPrompt}\n\nContexto: ${context || "geral"}${knowledgeContext}\n\nRegras:\n1. APENAS responde com informação da base de conhecimento\n2. Se não tiveres info, diz claramente\n3. Nunca inventes\n4. Mantém respostas claras e humanas\n\nResponde em JSON:\n{"response":"...","confidence":0.85,"sourceEntryIds":["id1"],"needsHumanReview":false,"suggestedActions":["..."]}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: query },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    const responseTimeMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ response: "Limite de pedidos atingido. Tente mais tarde.", confidence: 0, needsHumanReview: true, error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json()

    // AI Usage Instrumentation
    try {
      const _usage = aiResponse?.usage;
      logAIUsage({
        workspace_id: workspace_id,
        feature: 'knowledge-query',
        model: aiResponse?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
    const contentText = aiResponse.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = contentText.match(/```json\n?([\s\S]*?)\n?```/) || [null, contentText];
      result = JSON.parse(jsonMatch[1] || contentText);
    } catch {
      result = { response: contentText, confidence: 0.5, sourceEntryIds: [], needsHumanReview: true, suggestedActions: [] };
    }

    if (result.confidence < 0.6) {
      result.needsHumanReview = true;
    }

    return new Response(
      JSON.stringify({ ...result, responseTimeMs, responseSource: knowledgeEntries?.length > 0 ? "knowledge_base" : "fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KNOWLEDGE-QUERY] Error:", error);
    return new Response(
      JSON.stringify({ response: "Ocorreu um erro. Tente novamente.", confidence: 0, needsHumanReview: true, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
