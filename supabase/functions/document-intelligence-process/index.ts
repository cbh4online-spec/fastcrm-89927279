import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function callAI(
  apiKey: string,
  messages: Array<{ role: string; content: unknown }>,
  tools?: unknown[],
  toolChoice?: unknown
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "google/gemini-2.5-flash",
    messages,
    max_tokens: 16000,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
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
  
  // Handle tool calls
  if (data.choices?.[0]?.message?.tool_calls) {
    return data.choices[0].message.tool_calls[0].function.arguments;
  }
  
  return data.choices?.[0]?.message?.content || "";
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

    // Skip if already done
    if (job.status === "completed") {
      return new Response(
        JSON.stringify({ message: "Job already completed", status: "completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Gate check
    const workspaceId = job.workspace_id;
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

    // Get extraction template if specified
    let template: Record<string, unknown> | null = null;
    if (job.custom_fields?.extraction_template_id) {
      const { data: tmpl } = await supabase
        .from("document_extraction_templates")
        .select("*")
        .eq("id", job.custom_fields.extraction_template_id)
        .single();
      if (tmpl) template = tmpl;
    }

    // =========================================================================
    // PIPELINE
    // =========================================================================

    try {
      // 1. OCR — Extract text from document
      await updateJobStatus(supabase, job_id, "ocr", 10);

      const startOcr = Date.now();

      // Download file from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from("document-intelligence")
        .download(job.file_path);

      if (dlError || !fileData) {
        throw new Error(`File download failed: ${dlError?.message}`);
      }

      const fileBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

      // Use vision model for OCR
      const isImage = job.file_type.startsWith("image/");
      const mediaType = isImage ? job.file_type : "application/pdf";

      const ocrMessages = [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
              },
            },
            {
              type: "text",
              text: `Extract ALL text from this document, preserving the original structure and layout.
Instructions:
1. Extract every piece of text visible
2. Maintain paragraph breaks and sections
3. For tables, use | separators
4. Include headers, footers, marginal text
5. For forms, include field labels and values
6. Preserve numbering and bullet points
7. Include dates, numbers, currency values exactly as shown
Output the extracted text only, without commentary.`,
            },
          ],
        },
      ];

      const ocrText = await callAI(LOVABLE_API_KEY, ocrMessages);
      const ocrDuration = Date.now() - startOcr;
      const ocrConfidence = ocrText.length > 100 ? 0.95 : 0.7;

      await updateJobStatus(supabase, job_id, "ocr", 30, {
        ocr_text: ocrText,
        ocr_confidence: ocrConfidence,
        ocr_engine: "lovable-ai-vision",
        ocr_pages: 1,
        ocr_duration_ms: ocrDuration,
      });

      // 2. Classification
      await updateJobStatus(supabase, job_id, "classifying", 40);

      const typesList = DOCUMENT_TYPES.map(
        (dt) => `- ${dt.type}${dt.subtypes.length ? ` (subtypes: ${dt.subtypes.join(", ")})` : ""}`
      ).join("\n");

      const classifyTools = [
        {
          type: "function",
          function: {
            name: "classify_document",
            description: "Classify the document type",
            parameters: {
              type: "object",
              properties: {
                document_type: { type: "string", description: "Main document type" },
                document_subtype: { type: "string", description: "Specific subtype or null" },
                confidence: { type: "number", description: "0.0 to 1.0" },
                reasoning: { type: "string", description: "Brief explanation" },
              },
              required: ["document_type", "confidence", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      ];

      const classifyResult = await callAI(
        LOVABLE_API_KEY,
        [
          {
            role: "system",
            content: `You classify documents. Available types:\n${typesList}\nRespond using the classify_document tool.`,
          },
          {
            role: "user",
            content: `Classify this document:\n---\n${ocrText.slice(0, 8000)}\n---`,
          },
        ],
        classifyTools,
        { type: "function", function: { name: "classify_document" } }
      );

      let classification;
      try {
        classification = JSON.parse(classifyResult);
      } catch {
        classification = { document_type: "other", confidence: 0.5, reasoning: "Failed to parse" };
      }

      await updateJobStatus(supabase, job_id, "classifying", 55, {
        document_type: classification.document_type,
        document_subtype: classification.document_subtype || null,
        classification_confidence: classification.confidence,
        classification_reasoning: classification.reasoning,
      });

      // Get default template if none specified
      if (!template) {
        const { data: defaultTemplate } = await supabase
          .from("document_extraction_templates")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("document_type", classification.document_type)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultTemplate) template = defaultTemplate;
      }

      // 3. Extraction
      await updateJobStatus(supabase, job_id, "extracting", 60);

      const schema = (template as any)?.extraction_schema || DEFAULT_EXTRACTION_SCHEMAS[classification.document_type] || {};
      const schemaDesc = Object.entries(schema)
        .map(([key, field]: [string, any]) => {
          let desc = `- ${key}: ${field.description}`;
          if (field.required) desc += " (REQUIRED)";
          return desc;
        })
        .join("\n");

      // Build extraction tool from schema
      const extractionProperties: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(schema) as [string, any][]) {
        extractionProperties[key] = {
          type: field.type === "number" ? "number" : "string",
          description: field.description,
        };
      }

      const extractTools = [
        {
          type: "function",
          function: {
            name: "extract_document_data",
            description: "Extract structured data and entities from the document",
            parameters: {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  description: "Extracted field values",
                  properties: extractionProperties,
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
              required: ["data", "entities"],
              additionalProperties: false,
            },
          },
        },
      ];

      const extractResult = await callAI(
        LOVABLE_API_KEY,
        [
          {
            role: "system",
            content: `You extract structured data from documents. Document type: ${classification.document_type}.\nFields to extract:\n${schemaDesc}\n\nFor missing fields use null. Dates in ISO8601. Numbers without currency symbols.`,
          },
          {
            role: "user",
            content: `Extract data from:\n---\n${ocrText.slice(0, 12000)}\n---`,
          },
        ],
        extractTools,
        { type: "function", function: { name: "extract_document_data" } }
      );

      let extraction;
      try {
        extraction = JSON.parse(extractResult);
      } catch {
        extraction = { data: {}, entities: [] };
      }

      const avgConfidence = extraction.entities?.length
        ? extraction.entities.reduce((s: number, e: any) => s + (e.confidence || 0), 0) / extraction.entities.length
        : 0.8;

      await updateJobStatus(supabase, job_id, "extracting", 75, {
        extracted_data: extraction.data || {},
        extracted_entities: extraction.entities || [],
        extraction_schema: (template as any)?.id || "default",
        extraction_confidence: avgConfidence,
      });

      // 4. Optional: Index in Knowledge Base
      await updateJobStatus(supabase, job_id, "embedding", 85);

      let knowledgeDocId = null;
      try {
        // Find or create "Processed Documents" knowledge base
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
            knowledgeDocId = doc.id;
            // Trigger embedding asynchronously
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
        console.warn("KB indexing skipped:", kbErr);
      }

      // 5. Complete
      await updateJobStatus(supabase, job_id, "completed", 100, {
        knowledge_document_id: knowledgeDocId,
        indexed_at: knowledgeDocId ? new Date().toISOString() : null,
      });

      return new Response(
        JSON.stringify({
          success: true,
          job_id,
          status: "completed",
          document_type: classification.document_type,
          confidence: {
            ocr: ocrConfidence,
            classification: classification.confidence,
            extraction: avgConfidence,
          },
          extracted_data: extraction.data,
          entities_count: (extraction.entities || []).length,
          knowledge_document_id: knowledgeDocId,
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

      return new Response(
        JSON.stringify({ error: "Processing failed", details: errorMessage, job_id }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
