import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, runId } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ error: "accountId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get crawled pages
    const { data: pages, error: pagesError } = await supabase
      .from("account_brief_pages")
      .select("id, title, page_type, cleaned_text, final_url")
      .eq("account_id", accountId)
      .eq("workspace_id", workspaceId)
      .eq("crawl_status", "success")
      .not("cleaned_text", "is", null);

    if (pagesError) throw pagesError;
    if (!pages?.length) {
      return new Response(JSON.stringify({ success: false, error: "Sem páginas processadas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content summary for AI (cap total to ~60k chars)
    let totalChars = 0;
    const maxChars = 60000;
    const contentBlocks = pages.map((p) => {
      const text = p.cleaned_text || "";
      const available = Math.max(0, maxChars - totalChars);
      const trimmed = text.slice(0, Math.min(available, 8000));
      totalChars += trimmed.length;
      return `--- PAGE: ${p.page_type || "unknown"} | ${p.title || p.final_url} ---\n${trimmed}`;
    }).filter(b => b.length > 50);

    const prompt = `Analisa o conteúdo das seguintes páginas de um website empresarial e extrai dados estruturados.

CONTEÚDO DAS PÁGINAS:
${contentBlocks.join("\n\n")}

Extrai a seguinte informação em formato JSON. Sê factual — se não encontrares dados, usa null. Distingue factos de inferências.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `És um analista de inteligência comercial B2B. Extrais dados estruturados de websites para preparação de contas de vendas. Responde APENAS com o JSON da tool call. Sê conciso, factual e orientado à decisão comercial. Escreve em português de Portugal.`
          },
          { role: "user", content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_structured_data",
            description: "Extrai dados estruturados do website empresarial",
            parameters: {
              type: "object",
              properties: {
                identity: {
                  type: "object",
                  properties: {
                    company_name: { type: "string" },
                    tagline: { type: "string", description: "Headline ou tagline principal" },
                    description_short: { type: "string", description: "Descrição curta em 1-2 frases" },
                    probable_sector: { type: "string" },
                    probable_geography: { type: "string", description: "Países/regiões onde opera" },
                    languages: { type: "array", items: { type: "string" } },
                  },
                  required: ["company_name"],
                  additionalProperties: false,
                },
                offer: {
                  type: "object",
                  properties: {
                    main_products_services: { type: "array", items: { type: "string" }, description: "Principais produtos ou serviços" },
                    value_proposition: { type: "string" },
                    problems_solved: { type: "array", items: { type: "string" } },
                    customer_segments: { type: "array", items: { type: "string" } },
                    use_cases: { type: "array", items: { type: "string" } },
                  },
                  additionalProperties: false,
                },
                signals: {
                  type: "object",
                  properties: {
                    industries_served: { type: "array", items: { type: "string" } },
                    company_size_indicator: { type: "string", enum: ["startup", "pme", "mid_market", "enterprise", "unknown"] },
                    enterprise_focus: { type: "boolean" },
                    smb_focus: { type: "boolean" },
                    growth_signals: { type: "array", items: { type: "string" }, description: "Sinais de crescimento observados" },
                    expansion_signals: { type: "array", items: { type: "string" } },
                    hiring_active: { type: "boolean" },
                    hiring_areas: { type: "array", items: { type: "string" } },
                    has_customers_page: { type: "boolean" },
                    has_case_studies: { type: "boolean" },
                    has_partners: { type: "boolean" },
                    has_pricing: { type: "boolean" },
                    has_integrations: { type: "boolean" },
                    has_docs: { type: "boolean" },
                    has_careers: { type: "boolean" },
                  },
                  additionalProperties: false,
                },
                personalization: {
                  type: "object",
                  properties: {
                    dominant_themes: { type: "array", items: { type: "string" }, description: "Temas dominantes: automação, compliance, eficiência, crescimento, etc." },
                    main_cta: { type: "string", description: "CTA principal do site" },
                    commercial_positioning: { type: "string", description: "Posicionamento comercial aparente" },
                    outreach_angles: { type: "array", items: { type: "string" }, description: "Possíveis ângulos de outreach" },
                    inferred_objections: { type: "array", items: { type: "string" }, description: "Objeções inferidas" },
                    pain_hypotheses: { type: "array", items: { type: "string" }, description: "Hipóteses de dor do negócio" },
                  },
                  additionalProperties: false,
                },
                contacts: {
                  type: "object",
                  properties: {
                    public_emails: { type: "array", items: { type: "string" } },
                    has_contact_form: { type: "boolean" },
                    contact_page_url: { type: "string" },
                    linkedin_url: { type: "string" },
                    team_members: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          role: { type: "string" },
                          linkedin: { type: "string" },
                        },
                        required: ["name"],
                        additionalProperties: false,
                      }
                    },
                  },
                  additionalProperties: false,
                },
              },
              required: ["identity", "offer", "signals", "personalization", "contacts"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_structured_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        const statusMsg = response.status === 429 ? "Rate limit exceeded" : "Credits exhausted";
        return new Response(JSON.stringify({ success: false, error: statusMsg }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`AI Gateway error ${response.status}: ${errText}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Save structured data to page snapshots
    for (const page of pages) {
      await supabase.from("account_brief_page_snapshots")
        .update({ extracted_structured_json: extracted })
        .eq("page_id", page.id)
        .eq("workspace_id", workspaceId);
    }

    // Save contacts if found
    if (extracted.contacts?.team_members?.length) {
      for (const member of extracted.contacts.team_members) {
        await supabase.from("account_brief_public_contacts").upsert({
          workspace_id: workspaceId,
          account_id: accountId,
          contact_name: member.name,
          role_title: member.role || null,
          linkedin_url: member.linkedin || null,
        }, { onConflict: "account_id,contact_name" }).select();
      }
    }

    // Update account with identity data
    const identity = extracted.identity || {};
    await supabase.from("account_brief_accounts").update({
      probable_sector: identity.probable_sector || null,
      probable_geography: identity.probable_geography || null,
      description_short: identity.description_short || null,
      tagline: identity.tagline || null,
      updated_at: new Date().toISOString(),
    }).eq("id", accountId);

    console.log(`[extract] Completed for account ${accountId}`);

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[extract] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
