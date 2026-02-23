import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errorResponse(status: number, code: string, message: string) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid token");
    }
    const userId = claimsData.claims.sub as string;

    // 2. Workspace
    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return errorResponse(400, "VALIDATION_ERROR", "X-Workspace-Id header is required");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Membership check
    const { data: member } = await adminClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (!member || !["owner", "admin", "agent"].includes(member.role)) {
      return errorResponse(403, "FORBIDDEN", "Insufficient permissions");
    }

    // 4. Parse body
    const body = await req.json();
    const { product_id, goals = {}, generate = {}, inputs_override = {}, options = {} } = body;

    if (!product_id) {
      return errorResponse(400, "VALIDATION_ERROR", "product_id is required");
    }

    const tone = goals.tone || "profissional";
    const language = goals.language || "pt-PT";
    const seo = goals.seo !== false;
    const maxShort = goals.max_length?.short_description || 180;
    const maxSeo = goals.max_length?.seo_snippet || 160;

    const genShort = generate.short_description === true;
    const genLong = generate.long_description === true;
    const genBullets = generate.bullets === true;
    const genTags = generate.tags === true;
    const genSeo = generate.seo_snippet === true;

    if (!genShort && !genLong && !genBullets && !genTags && !genSeo) {
      return errorResponse(400, "VALIDATION_ERROR", "At least one generate field must be true");
    }

    // 5. Fetch product
    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("id, name, short_description, commercial_description, category, sku, price_amount, currency, search_keywords, specifications")
      .eq("id", product_id)
      .eq("workspace_id", workspaceId)
      .single();

    if (productError || !product) {
      return errorResponse(403, "FORBIDDEN", "Product not found in this workspace");
    }

    // 6. Build AI prompt
    const productContext = [
      `Nome: ${product.name}`,
      product.category ? `Categoria: ${product.category}` : null,
      product.price_amount ? `Preço: ${product.price_amount} ${product.currency || "EUR"}` : null,
      product.sku ? `SKU: ${product.sku}` : null,
      product.short_description ? `Descrição curta atual: ${product.short_description}` : null,
      product.commercial_description ? `Descrição longa atual: ${product.commercial_description}` : null,
      inputs_override.key_features?.length ? `Características principais: ${inputs_override.key_features.join(", ")}` : null,
      inputs_override.materials ? `Materiais: ${inputs_override.materials}` : null,
      inputs_override.dimensions ? `Dimensões: ${inputs_override.dimensions}` : null,
      inputs_override.target_audience ? `Público-alvo: ${inputs_override.target_audience}` : null,
    ].filter(Boolean).join("\n");

    const fieldsRequested: string[] = [];
    if (genShort) fieldsRequested.push("short_description");
    if (genLong) fieldsRequested.push("long_description");
    if (genBullets) fieldsRequested.push("bullets");
    if (genTags) fieldsRequested.push("tags");
    if (genSeo) fieldsRequested.push("seo_snippet");

    const systemPrompt = `És um especialista em copywriting de produtos e-commerce. Gera conteúdo no tom "${tone}" e na língua "${language}".
Regras:
- short_description: máximo ${maxShort} caracteres. Frase concisa e apelativa.
- long_description: descrição completa e estruturada para a página do produto. Usa parágrafos. 300-600 palavras.
- bullets: 3-6 bullet points com as principais vantagens/características.
- tags: 5-10 palavras-chave relevantes para pesquisa interna.
- seo_snippet: máximo ${maxSeo} caracteres. Meta description otimizada para SEO.
${seo ? "Otimiza todo o conteúdo para SEO, incluindo palavras-chave naturais." : ""}
Gera APENAS os campos pedidos.`;

    // Build tool parameters dynamically
    const properties: Record<string, any> = {};
    if (genShort) properties.short_description = { type: "string", description: `Max ${maxShort} chars` };
    if (genLong) properties.long_description = { type: "string", description: "Full product description" };
    if (genBullets) properties.bullets = { type: "array", items: { type: "string" }, description: "3-6 bullet points" };
    if (genTags) properties.tags = { type: "array", items: { type: "string" }, description: "5-10 search keywords" };
    if (genSeo) properties.seo_snippet = { type: "string", description: `Max ${maxSeo} chars` };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse(500, "INTERNAL_ERROR", "AI provider not configured");
    }

    // 7. Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: productContext },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "improve_product",
              description: "Return improved product content",
              parameters: {
                type: "object",
                properties,
                required: fieldsRequested,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "improve_product" } },
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", statusCode, errText);

      if (statusCode === 429) {
        return errorResponse(502, "AI_PROVIDER_ERROR", "AI rate limit exceeded. Please try again later.");
      }
      if (statusCode === 402) {
        return errorResponse(502, "AI_PROVIDER_ERROR", "AI credits exhausted. Please add funds.");
      }
      return errorResponse(502, "AI_PROVIDER_ERROR", "AI provider error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return errorResponse(502, "AI_PROVIDER_ERROR", "AI returned unexpected format");
    }

    let generated: Record<string, any>;
    try {
      generated = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse AI tool arguments:", toolCall.function.arguments);
      return errorResponse(502, "AI_PROVIDER_ERROR", "AI returned invalid JSON");
    }

    // 8. Write-back
    const updatedFields: string[] = [];
    if (options.write_back) {
      const updatePayload: Record<string, any> = {};

      if (generated.short_description) {
        updatePayload.short_description = generated.short_description;
        updatedFields.push("short_description");
      }
      if (generated.long_description) {
        updatePayload.commercial_description = generated.long_description;
        updatedFields.push("description");
      }
      if (generated.tags) {
        updatePayload.search_keywords = generated.tags.join(", ");
        updatedFields.push("tags");
      }
      if (generated.seo_snippet) {
        const specs = (product.specifications as Record<string, any>) || {};
        specs.seo_snippet = generated.seo_snippet;
        updatePayload.specifications = specs;
        updatedFields.push("seo_snippet");
      }

      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateError } = await adminClient
          .from("products")
          .update(updatePayload)
          .eq("id", product_id);

        if (updateError) {
          console.error("Write-back error:", updateError);
        }
      }
    }

    // 9. Embeddings (fire-and-forget)
    let embeddingsStatus = { requested: false, status: "skipped" };
    if (options.create_embeddings) {
      embeddingsStatus = { requested: true, status: "queued" };
      fetch(`${supabaseUrl}/functions/v1/product-embedding`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product_id }),
      }).catch((e) => console.warn("Embedding fire-and-forget error:", e));
    }

    // 10. Audit log
    let auditLogId: string | null = null;
    try {
      const { data: logData } = await adminClient.from("crm_activities").insert({
        workspace_id: workspaceId,
        user_id: userId,
        activity_type: "ai_action",
        subject: `IA melhorou produto: ${product.name}`,
        description: `Campos gerados: ${fieldsRequested.join(", ")}. Write-back: ${options.write_back ? "sim" : "não"}.`,
        entity_type: "product",
        entity_id: product_id,
        metadata: { event: "product_ai_improved", channel: options.channel || "unknown", fields: fieldsRequested },
      }).select("id").single();
      auditLogId = logData?.id || null;
    } catch (e) {
      console.warn("Audit log error:", e);
    }

    // 11. Response
    const responsePayload = {
      success: true,
      data: {
        product_id,
        generated,
        updated_fields: updatedFields,
        embeddings: embeddingsStatus,
        audit: { log_id: auditLogId, event: "product_ai_improved" },
      },
      meta: {
        request_id: requestId,
        workspace_id: workspaceId,
        timestamp: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("product-ai-improve error:", error);
    return errorResponse(500, "INTERNAL_ERROR", error instanceof Error ? error.message : "Unknown error");
  }
});
