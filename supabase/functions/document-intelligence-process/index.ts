import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  job_id: string;
  workspace_id?: string;
}

// Document types for classification
const DOCUMENT_TYPES = [
  { type: "invoice", subtypes: ["service_invoice", "product_invoice", "proforma", "credit_note"] },
  { type: "contract", subtypes: ["service_contract", "sales_contract", "nda", "employment_contract"] },
  { type: "proposal", subtypes: ["commercial_proposal", "technical_proposal", "quotation"] },
  { type: "receipt", subtypes: ["payment_receipt", "expense_receipt"] },
  { type: "report", subtypes: ["financial_report", "technical_report", "analysis_report"] },
  { type: "form", subtypes: ["application_form", "registration_form", "order_form"] },
  { type: "letter", subtypes: ["formal_letter", "notification", "correspondence"] },
  { type: "id_document", subtypes: ["passport", "id_card", "drivers_license"] },
  { type: "certificate", subtypes: ["academic_certificate", "professional_certificate"] },
  { type: "other", subtypes: [] },
];

const DEFAULT_EXTRACTION_SCHEMAS: Record<string, Record<string, { description: string; type: string; required?: boolean }>> = {
  invoice: {
    invoice_number: { type: "string", description: "Número da factura", required: true },
    invoice_date: { type: "string", description: "Data de emissão (ISO8601)" },
    due_date: { type: "string", description: "Data de vencimento (ISO8601)" },
    vendor_name: { type: "string", description: "Nome do fornecedor", required: true },
    vendor_tax_id: { type: "string", description: "NIF/VAT do fornecedor" },
    customer_name: { type: "string", description: "Nome do cliente" },
    customer_tax_id: { type: "string", description: "NIF/VAT do cliente" },
    subtotal: { type: "number", description: "Subtotal antes de impostos" },
    tax_amount: { type: "number", description: "Valor total de impostos" },
    tax_rate: { type: "number", description: "Taxa de imposto (%)" },
    total_amount: { type: "number", description: "Valor total", required: true },
    currency: { type: "string", description: "Moeda (EUR, USD, etc.)" },
  },
  contract: {
    contract_number: { type: "string", description: "Número do contrato" },
    contract_date: { type: "string", description: "Data do contrato (ISO8601)" },
    effective_date: { type: "string", description: "Data de início (ISO8601)" },
    expiration_date: { type: "string", description: "Data de término (ISO8601)" },
    contract_value: { type: "number", description: "Valor do contrato" },
    currency: { type: "string", description: "Moeda" },
    scope_summary: { type: "string", description: "Resumo do objecto" },
    jurisdiction: { type: "string", description: "Foro/Jurisdição" },
  },
  proposal: {
    proposal_number: { type: "string", description: "Número da proposta" },
    proposal_date: { type: "string", description: "Data da proposta (ISO8601)" },
    valid_until: { type: "string", description: "Validade (ISO8601)" },
    vendor_name: { type: "string", description: "Nome do proponente" },
    customer_name: { type: "string", description: "Nome do destinatário" },
    total_value: { type: "number", description: "Valor total" },
    currency: { type: "string", description: "Moeda" },
    scope_description: { type: "string", description: "Descrição do âmbito" },
  },
  receipt: {
    receipt_number: { type: "string", description: "Número do recibo" },
    receipt_date: { type: "string", description: "Data (ISO8601)" },
    amount: { type: "number", description: "Valor", required: true },
    currency: { type: "string", description: "Moeda" },
    payment_method: { type: "string", description: "Método de pagamento" },
  },
};

// Generic schema usable in single-call vision when type isn't known yet
const GENERIC_EXTRACTION_PROPERTIES: Record<string, { type: string; description: string }> = {};
for (const schema of Object.values(DEFAULT_EXTRACTION_SCHEMAS)) {
  for (const [key, field] of Object.entries(schema)) {
    if (!GENERIC_EXTRACTION_PROPERTIES[key]) {
      GENERIC_EXTRACTION_PROPERTIES[key] = {
        type: field.type === "number" ? "number" : "string",
        description: field.description,
      };
    }
  }
}

async function callAI(
  apiKey: string,
  workspaceId: string | null,
  feature: string,
  messages: Array<{ role: string; content: unknown }>,
  options: { tools?: unknown[]; toolChoice?: unknown; maxTokens?: number; model?: string } = {}
): Promise<{ text: string; toolArgs?: string }> {
  const body: Record<string, unknown> = {
    model: options.model || "google/gemini-2.5-flash",
    messages,
    max_tokens: options.maxTokens ?? 8000,
  };
  if (options.tools) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice;
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI Gateway error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();

  // Log AI usage (fire-and-forget) — uses workspaceId (camelCase) per Core memory
  try {
    logAIUsage({
      workspaceId,
      feature,
      model: (body.model as string),
      tokens_input: data?.usage?.prompt_tokens ?? 0,
      tokens_output: data?.usage?.completion_tokens ?? 0,
    } as any);
  } catch (_e) { /* logging never blocks */ }

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  return {
    text: data.choices?.[0]?.message?.content || "",
    toolArgs: toolCall?.function?.arguments,
  };
}

async function updateJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: string,
  progress: number,
  extraData?: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    progress,
    updated_at: new Date().toISOString(),
    ...extraData,
  };

  if (status === "processing" || status === "ocr") {
    updateData.started_at = updateData.started_at || new Date().toISOString();
  }

  if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString();
  }

  await supabase
    .from("document_processing_jobs")
    .update(updateData)
    .eq("id", jobId);
}

// ============================================================================
// SINGLE-CALL VISION: OCR + classify + extract in one round-trip
// ============================================================================
async function singleCallVision(
  apiKey: string,
  workspaceId: string | null,
  dataUrl: string
): Promise<{
  ocr_text: string;
  document_type: string;
  document_subtype: string | null;
  classification_confidence: number;
  classification_reasoning: string;
  data: Record<string, unknown>;
  entities: Array<{ type: string; value: string; confidence: number }>;
} | null> {
  const typesList = DOCUMENT_TYPES.map((dt) => dt.type).join(", ");

  const tools = [
    {
      type: "function",
      function: {
        name: "process_document",
        description: "Extract OCR text, classify document, and extract structured data in a single pass.",
        parameters: {
          type: "object",
          properties: {
            ocr_text: {
              type: "string",
              description: "Full text extracted from the document, preserving layout and structure.",
            },
            document_type: {
              type: "string",
              enum: DOCUMENT_TYPES.map((dt) => dt.type),
              description: `Document type. One of: ${typesList}`,
            },
            document_subtype: {
              type: "string",
              description: "Specific subtype or empty string",
            },
            classification_confidence: { type: "number", description: "0.0 to 1.0" },
            classification_reasoning: { type: "string", description: "Brief explanation" },
            data: {
              type: "object",
              description: "Extracted structured fields relevant to the detected document type.",
              properties: GENERIC_EXTRACTION_PROPERTIES,
            },
            entities: {
              type: "array",
              description: "Detected entities",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["PERSON", "ORGANIZATION", "DATE", "MONEY", "LOCATION", "PRODUCT", "OTHER"] },
                  value: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["type", "value", "confidence"],
              },
            },
          },
          required: ["ocr_text", "document_type", "classification_confidence", "classification_reasoning", "data", "entities"],
          additionalProperties: false,
        },
      },
    },
  ];

  const messages = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: dataUrl } },
        {
          type: "text",
          text: `Process this document in a single pass:
1. Extract ALL visible text (ocr_text) preserving structure, tables (use | separators), headers, and numbers exactly as shown.
2. Classify the document_type from: ${typesList}.
3. Extract structured data: relevant fields for the detected type. Dates ISO8601. Numbers without currency symbols. Use null for missing fields.
4. Detect named entities (people, organizations, dates, money, locations).

Respond using the process_document tool.`,
        },
      ],
    },
  ];

  try {
    const result = await callAI(apiKey, workspaceId, "document-intelligence-singlecall", messages, {
      tools,
      toolChoice: { type: "function", function: { name: "process_document" } },
      maxTokens: 8000,
    });

    if (!result.toolArgs) return null;
    const parsed = JSON.parse(result.toolArgs);
    if (!parsed.ocr_text || parsed.ocr_text.length < 50) return null;
    return parsed;
  } catch (e) {
    console.warn("singleCallVision failed, falling back:", e);
    return null;
  }
}

// ============================================================================
// FALLBACK PIPELINE: separate OCR + extract (used when single-call fails)
// ============================================================================
async function fallbackPipeline(
  apiKey: string,
  workspaceId: string | null,
  dataUrl: string,
  template: any | null,
  supabase: ReturnType<typeof createClient>
): Promise<{
  ocr_text: string;
  document_type: string;
  document_subtype: string | null;
  classification_confidence: number;
  classification_reasoning: string;
  data: Record<string, unknown>;
  entities: Array<{ type: string; value: string; confidence: number }>;
}> {
  // OCR
  const ocrResp = await callAI(apiKey, workspaceId, "document-intelligence-ocr", [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: dataUrl } },
        {
          type: "text",
          text: `Extract ALL text from this document, preserving structure. Tables with | separators. Output text only.`,
        },
      ],
    },
  ], { maxTokens: 8000 });
  const ocrText = ocrResp.text;

  // Combined classify + extract on text
  const tools = [
    {
      type: "function",
      function: {
        name: "classify_and_extract",
        description: "Classify document and extract structured data + entities.",
        parameters: {
          type: "object",
          properties: {
            document_type: { type: "string", enum: DOCUMENT_TYPES.map((d) => d.type) },
            document_subtype: { type: "string" },
            classification_confidence: { type: "number" },
            classification_reasoning: { type: "string" },
            data: { type: "object", properties: GENERIC_EXTRACTION_PROPERTIES },
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["PERSON", "ORGANIZATION", "DATE", "MONEY", "LOCATION", "PRODUCT", "OTHER"] },
                  value: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["type", "value", "confidence"],
              },
            },
          },
          required: ["document_type", "classification_confidence", "classification_reasoning", "data", "entities"],
          additionalProperties: false,
        },
      },
    },
  ];

  const ceResp = await callAI(apiKey, workspaceId, "document-intelligence-classify-extract", [
    {
      role: "system",
      content: `Classify the document then extract structured data. Dates ISO8601. Numbers without currency symbols. Use null for missing fields.`,
    },
    {
      role: "user",
      content: `Document text:\n---\n${ocrText.slice(0, 12000)}\n---`,
    },
  ], {
    tools,
    toolChoice: { type: "function", function: { name: "classify_and_extract" } },
    maxTokens: 4000,
  });

  let parsed: any = {};
  try { parsed = JSON.parse(ceResp.toolArgs || "{}"); } catch { /* ignore */ }

  return {
    ocr_text: ocrText,
    document_type: parsed.document_type || "other",
    document_subtype: parsed.document_subtype || null,
    classification_confidence: parsed.classification_confidence ?? 0.5,
    classification_reasoning: parsed.classification_reasoning || "",
    data: parsed.data || {},
    entities: parsed.entities || [],
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: ProcessRequest = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from("document_processing_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (job.status === "completed") {
      return new Response(
        JSON.stringify({ message: "Job already completed", status: "completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId: string | null = job.workspace_id ?? null;

    // AI Gate
    if (workspaceId) {
      const gate = await aiGate(workspaceId, 'heavy', 'document-intelligence-process');
      if (!gate.allowed) {
        await updateJobStatus(supabase, job_id, "failed", 0, {
          error_message: "Quota de IA excedida. Faça upgrade do plano.",
        });
        return new Response(
          JSON.stringify({ error: "quota_exceeded", upgrade_required: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Optional template
    let template: Record<string, unknown> | null = null;
    if (job.custom_fields?.extraction_template_id) {
      const { data: tmpl } = await supabase
        .from("document_extraction_templates")
        .select("*")
        .eq("id", job.custom_fields.extraction_template_id)
        .single();
      if (tmpl) template = tmpl;
    }

    try {
      // ---------------------------------------------------------------------
      // 1. Download + base64 (FAST native encoder)
      // ---------------------------------------------------------------------
      await updateJobStatus(supabase, job_id, "ocr", 10);
      const startOcr = Date.now();

      const { data: fileData, error: dlError } = await supabase.storage
        .from("document-intelligence")
        .download(job.file_path);

      if (dlError || !fileData) {
        throw new Error(`File download failed: ${dlError?.message}`);
      }

      const fileBuffer = await fileData.arrayBuffer();
      const base64 = encodeBase64(new Uint8Array(fileBuffer));

      const isImage = (job.file_type as string).startsWith("image/");
      const mediaType = isImage ? job.file_type : "application/pdf";
      const dataUrl = `data:${mediaType};base64,${base64}`;

      // ---------------------------------------------------------------------
      // 2. Single-call vision (OCR + classify + extract in one round-trip)
      // ---------------------------------------------------------------------
      let result = await singleCallVision(LOVABLE_API_KEY, workspaceId, dataUrl);

      // Fallback if single-call fails (very dense doc, model refusal, etc.)
      if (!result) {
        result = await fallbackPipeline(LOVABLE_API_KEY, workspaceId, dataUrl, template, supabase);
      }

      const ocrDuration = Date.now() - startOcr;
      const ocrConfidence = result.ocr_text.length > 100 ? 0.95 : 0.7;
      const avgConfidence = result.entities?.length
        ? result.entities.reduce((s, e) => s + (e.confidence || 0), 0) / result.entities.length
        : 0.8;

      // ---------------------------------------------------------------------
      // 3. Mark COMPLETED immediately (embedding runs in background)
      // ---------------------------------------------------------------------
      await updateJobStatus(supabase, job_id, "completed", 100, {
        ocr_text: result.ocr_text,
        ocr_confidence: ocrConfidence,
        ocr_engine: "lovable-ai-vision-singlecall",
        ocr_pages: 1,
        ocr_duration_ms: ocrDuration,
        document_type: result.document_type,
        document_subtype: result.document_subtype,
        classification_confidence: result.classification_confidence,
        classification_reasoning: result.classification_reasoning,
        extracted_data: result.data,
        extracted_entities: result.entities,
        extraction_schema: (template as any)?.id || "default",
        extraction_confidence: avgConfidence,
      });

      // ---------------------------------------------------------------------
      // 4. KB indexing — fire-and-forget background (does not block response)
      // ---------------------------------------------------------------------
      (async () => {
        try {
          let { data: kb } = await supabase
            .from("knowledge_bases")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("slug", "processed-documents")
            .maybeSingle();

          if (!kb) {
            const { data: newKb } = await supabase
              .from("knowledge_bases")
              .insert({
                workspace_id: workspaceId,
                name: "Documentos Processados",
                slug: "processed-documents",
                description: "Documentos indexados automaticamente pelo Document Intelligence",
              })
              .select("id")
              .single();
            kb = newKb;
          }

          if (kb) {
            const { data: doc } = await supabase
              .from("knowledge_documents")
              .insert({
                knowledge_base_id: kb.id,
                workspace_id: workspaceId,
                name: job.file_name,
                file_path: job.file_path,
                file_type: job.file_type,
                file_size: job.file_size,
                status: "pending",
                created_by: job.created_by,
              })
              .select("id")
              .single();

            if (doc) {
              await supabase
                .from("document_processing_jobs")
                .update({
                  knowledge_document_id: doc.id,
                  indexed_at: new Date().toISOString(),
                })
                .eq("id", job_id);

              supabase.functions.invoke("knowledge-document-process", {
                body: {
                  document_id: doc.id,
                  workspaceId,
                  knowledgeBaseId: kb.id,
                  filePath: job.file_path,
                  fileName: job.file_name,
                  mimeType: job.file_type,
                },
              }).catch(console.error);
            }
          }
        } catch (kbErr) {
          console.warn("KB background indexing failed:", kbErr);
        }
      })();

      return new Response(
        JSON.stringify({
          success: true,
          job_id,
          status: "completed",
          document_type: result.document_type,
          ocr_duration_ms: ocrDuration,
          confidence: {
            ocr: ocrConfidence,
            classification: result.classification_confidence,
            extraction: avgConfidence,
          },
          extracted_data: result.data,
          entities_count: (result.entities || []).length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (procError) {
      console.error("Processing error:", procError);
      const errorMessage = procError instanceof Error ? procError.message : "Unknown error";

      await updateJobStatus(supabase, job_id, "failed", job.progress || 0, {
        error_message: errorMessage,
        retry_count: (job.retry_count || 0) + 1,
      });

      // Resilient: return 200 with error payload to avoid client crash (Core memory rule)
      return new Response(
        JSON.stringify({ error: "internal_error", details: errorMessage, job_id, fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
