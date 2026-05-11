// Edge function: lê um documento (PDF/imagem) carregado no bucket
// product-ocr-documents e extrai dados estruturados de produto via
// Lovable AI Gateway (Gemini 2.5 Pro multimodal).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Termos a remover/sanitizar (regra interna: sem referências a animais)
const ANIMAL_TERMS = [
  "cão","cao","cachorro","cães","caes","gato","gata","gatos","gatas","pet","pets",
  "animal","animais","veterinário","veterinaria","veterinário","veterinária",
  "canino","felino","hamster","coelho","papagaio","periquito","peixe","peixes",
  "aquário","aquario","ração","racao","petshop","pet shop","pet-shop",
];

function sanitizeAnimalRefs(text: string | null | undefined): string {
  if (!text) return text ?? "";
  let cleaned = text;
  for (const term of ANIMAL_TERMS) {
    const re = new RegExp(`\\b${term}\\b`, "gi");
    cleaned = cleaned.replace(re, "");
  }
  // limpa espaços duplos e pontuação órfã
  return cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeAnimalRefs(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T;
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitizeObject(v);
    }
    return out as T;
  }
  return obj;
}

const SYSTEM_PROMPT = `És um assistente especializado em fichas técnicas de produto de cosmética, beleza e cuidado pessoal, a operar em português de Portugal.

Recebes um documento (rótulo, ficha técnica, fotografia, catálogo ou tabela comercial) e deves extrair toda a informação útil para criar uma ficha de produto.

REGRAS CRÍTICAS:
1. NUNCA INVENTES informação. Se um campo não existir no documento, devolve null e marca em "field_confidence" como "pending_validation".
2. NUNCA inclua referências a animais (cães, gatos, pets, veterinária, ração, etc.). Remove-as silenciosamente do texto extraído.
3. Não criar alegações médicas/terapêuticas sem base no documento.
4. Não transformar cosméticos em produtos clínicos.
5. Linguagem profissional, segura, sem promessas absolutas.
6. Para cada campo, marca a confiança ("high" | "medium" | "low" | "pending_validation") em field_confidence.

Devolve APENAS um JSON válido (sem markdown), com este formato:
{
  "ocr_raw_text": "texto integral lido do documento",
  "general": { "name": null, "commercial_name": null, "brand": null, "product_line": null, "product_type": null, "category": null, "subcategory": null },
  "identification": { "ean": null, "sku": null, "volume": null, "unit": null, "origin_country": null, "distributor": null },
  "description": { "short": null, "long": null, "benefits": [] },
  "usage": { "instructions": null, "precautions": null },
  "composition": { "ingredients": null, "claims": [] },
  "commercial": { "positioning": null, "ideal_customer": null, "sensory_notes": null, "olfactory_notes": null },
  "kit_info": { "is_kit": false, "kit_components_mentioned": [] },
  "field_confidence": { "name": "pending_validation", "brand": "pending_validation", "ean": "pending_validation" },
  "overall_confidence": 0,
  "notes": "Observações relevantes ou campos por validar"
}`;

async function downloadAsBase64(supabase: ReturnType<typeof createClient>, path: string) {
  const { data, error } = await supabase.storage.from("product-ocr-documents").download(path);
  if (error || !data) throw new Error(`Falha ao baixar ficheiro: ${error?.message ?? "no data"}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  // base64 encode robusto: itera byte-a-byte em chunks pequenos para evitar
  // "Maximum call stack size exceeded" causado pelo spread (...) com arrays grandes.
  // O spread no V8/Deno tem limite ~65k argumentos — em ficheiros perto de 1.5MB
  // com chunks de 0x8000 (32k) já dá erro intermitente em alguns runtimes.
  const CHUNK = 8192; // 8KB — seguro em qualquer runtime
  let binary = "";
  for (let i = 0; i < buf.length; i += CHUNK) {
    const slice = buf.subarray(i, Math.min(i + CHUNK, buf.length));
    // construir string char-a-char (sem spread) elimina risco de stack overflow
    let part = "";
    for (let j = 0; j < slice.length; j++) {
      part += String.fromCharCode(slice[j]);
    }
    binary += part;
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada", fallback: true }, 200);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado", fallback: true }, 200);

    // Cliente com a auth do utilizador para validar a sessão
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabaseUser.auth.getUser();
    if (!userRes?.user) return json({ error: "Sessão inválida", fallback: true }, 200);

    // Cliente service role para storage + writes
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { document_id } = body as { document_id?: string };
    if (!document_id) return json({ error: "document_id obrigatório", fallback: true }, 200);

    const { data: doc, error: docErr } = await supabase
      .from("product_ocr_documents")
      .select("*")
      .eq("id", document_id)
      .limit(1)
      .maybeSingle();

    if (docErr || !doc) return json({ error: "Documento não encontrado", fallback: true }, 200);

    // ── DÉBITO DE CRÉDITOS (server-side, autoritário) ──
    const OCR_ACTION_KEY = "ai_document_ocr";
    const idempotencyKey = `${document_id}:extract`;
    let creditsConsumed = 0;
    if (doc.workspace_id) {
      const { data: consumeRes, error: consumeErr } = await supabase.rpc("consume_funnel_credits", {
        p_workspace_id: doc.workspace_id,
        p_user_id: userRes.user.id,
        p_action_key: OCR_ACTION_KEY,
        p_idempotency_key: idempotencyKey,
        p_reference_type: "product_ocr_document",
        p_reference_id: document_id,
        p_metadata: { file_name: doc.file_name, source: "product-ocr-extract" },
      });
      if (consumeErr) {
        console.error("[product-ocr-extract] consume_funnel_credits error:", consumeErr);
        return json({ error: "Erro ao validar créditos", fallback: true }, 200);
      }
      const consumeRow = Array.isArray(consumeRes) ? consumeRes[0] : consumeRes;
      if (!consumeRow?.success) {
        return json({
          error: consumeRow?.message || "Créditos insuficientes",
          code: "insufficient_credits",
          fallback: true,
        }, 200);
      }
      creditsConsumed = consumeRow?.credits_consumed ?? 0;
    }

    // helper para estornar quando algo falha após o débito
    const refundOnFailure = async (reason: string) => {
      if (!doc.workspace_id || creditsConsumed === 0) return;
      try {
        await supabase.rpc("refund_funnel_credits", {
          p_workspace_id: doc.workspace_id,
          p_user_id: userRes.user.id,
          p_action_key: OCR_ACTION_KEY,
          p_idempotency_key: idempotencyKey,
          p_reference_type: "product_ocr_document",
          p_reference_id: document_id,
          p_reason: reason,
          p_metadata: {},
        });
      } catch (rfErr) {
        console.error("[product-ocr-extract] refund failed:", rfErr);
      }
    };

    // marcar processing
    await supabase
      .from("product_ocr_documents")
      .update({ processing_status: "processing", processing_error: null })
      .eq("id", document_id);

    const base64 = await downloadAsBase64(supabase, doc.file_path);
    const mime = doc.file_type;

    // Construir mensagem multimodal
    const parts: Array<Record<string, unknown>> = [
      { type: "text", text: "Analisa este documento e devolve o JSON estruturado conforme as regras." },
    ];

    if (mime.startsWith("image/")) {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${base64}` },
      });
    } else if (mime === "application/pdf") {
      parts.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${base64}` },
      });
    } else {
      throw new Error(`Tipo de ficheiro não suportado: ${mime}`);
    }

    const aiStart = Date.now();
    const aiModel = "google/gemini-2.5-pro";
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: parts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      const status = aiResponse.status;
      let userMsg = "Erro ao processar com IA";
      if (status === 429) userMsg = "Limite de pedidos atingido. Tenta novamente daqui a uns minutos.";
      else if (status === 402) userMsg = "Limite temporário da IA atingido. O saldo do workspace não foi debitado; tenta novamente daqui a pouco.";
      // telemetria de erro
      if (doc.workspace_id) {
        logAIUsage({
          workspace_id: doc.workspace_id,
          feature: "product-ocr-extract",
          model: aiModel,
          provider: "lovable",
          tokens_input: 0,
          tokens_output: 0,
          latency_ms: Date.now() - aiStart,
          was_error: true,
          error_type: status === 429 ? "rate_limit" : status === 402 ? "payment_required" : "api_error",
          entity_type: "product_ocr_document",
          entity_id: document_id,
          user_id: userRes.user.id,
        });
      }
      await supabase
        .from("product_ocr_documents")
        .update({ processing_status: "failed", processing_error: `${status}: ${errText.slice(0, 500)}` })
        .eq("id", document_id);
      // estornar créditos: a IA falhou
      await refundOnFailure(`ai_error_${status}`);
      return json({ error: userMsg, status, fallback: true }, 200);
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "{}";

    // Parse robusto contra JSON mal formado da IA (quebras de linha em strings)
    const tryParse = (s: string): Record<string, unknown> | null => {
      try { return JSON.parse(s); } catch { return null; }
    };
    const sanitizeJsonString = (s: string): string => {
      let out = "";
      let inString = false;
      let escape = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) { out += ch; escape = false; continue; }
        if (ch === "\\") { out += ch; escape = true; continue; }
        if (ch === '"') { inString = !inString; out += ch; continue; }
        if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) { out += " "; continue; }
        out += ch;
      }
      return out;
    };

    let parsed: Record<string, unknown> | null = tryParse(content);
    if (!parsed) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = tryParse(m[0]);
    }
    if (!parsed) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = tryParse(sanitizeJsonString(m[0]));
    }
    if (!parsed) {
      console.error("product-ocr-extract: JSON inválido. Preview:", content.slice(0, 300));
      await supabase
        .from("product_ocr_documents")
        .update({ processing_status: "failed", processing_error: "AI devolveu JSON inválido" })
        .eq("id", document_id);
      await refundOnFailure("invalid_ai_json");
      return json({
        error: "A IA devolveu uma resposta inválida. Tenta novamente.",
        code: "invalid_ai_response",
        fallback: true,
      }, 200);
    }

    // Sanitizar referências a animais em todos os campos de texto
    const cleaned = sanitizeObject(parsed) as Record<string, unknown>;

    const overallConf = Number(cleaned.overall_confidence ?? 0);
    const fieldConf = (cleaned.field_confidence as Record<string, string>) ?? {};

    await supabase
      .from("product_ocr_documents")
      .update({
        ocr_raw_text: (cleaned.ocr_raw_text as string) ?? null,
        ocr_structured_data: cleaned,
        ocr_confidence: isFinite(overallConf) ? overallConf : null,
        field_confidence: fieldConf,
        processing_status: "completed",
        ai_model: aiModel,
        ai_tokens_used: aiData.usage?.total_tokens ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    // telemetria de sucesso → ai_usage_logs (consumo de créditos)
    if (doc.workspace_id) {
      logAIUsage({
        workspace_id: doc.workspace_id,
        feature: "product-ocr-extract",
        model: aiModel,
        provider: "lovable",
        tokens_input: aiData.usage?.prompt_tokens ?? 0,
        tokens_output: aiData.usage?.completion_tokens ?? 0,
        request_type: "completion",
        latency_ms: Date.now() - aiStart,
        entity_type: "product_ocr_document",
        entity_id: document_id,
        user_id: userRes.user.id,
      });
    }

    return json({ success: true, data: cleaned, document_id });
  } catch (e) {
    console.error("product-ocr-extract error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", fallback: true }, 200);
  }
});
