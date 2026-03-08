import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { companyId, companyIds, workspaceId } = await req.json();

    // Support both single and bulk mode
    const ids = companyIds || (companyId ? [companyId] : []);
    if (ids.length === 0 || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "companyId(s) and workspaceId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch companies
    const { data: companies, error: fetchErr } = await supabase
      .from("companies")
      .select("id, name, industry, size, website, email, annual_revenue, employee_count, company_context, ai_temperature, company_score, estimated_value, conversion_probability, business_model, tags, description, founded_year, domain, cae_description")
      .in("id", ids)
      .eq("workspace_id", workspaceId);

    if (fetchErr || !companies?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Empresas não encontradas" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch workspace context for ICP comparison
    const { data: contextBlocks } = await supabase
      .from("context_blocks")
      .select("block_type, content")
      .eq("workspace_id", workspaceId)
      .in("block_type", ["icp", "strategy", "offers"]);

    const icpContext = contextBlocks?.find((b: any) => b.block_type === "icp")?.content || {};
    const strategyContext = contextBlocks?.find((b: any) => b.block_type === "strategy")?.content || {};
    const offersContext = contextBlocks?.find((b: any) => b.block_type === "offers")?.content || {};

    const results: Record<string, any> = {};

    // Process in batches of 5 for efficiency
    const batches = [];
    for (let i = 0; i < companies.length; i += 5) {
      batches.push(companies.slice(i, i + 5));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (company: any) => {
        try {
          const ctx = company.company_context || {};
          
          const prompt = `Analisa esta empresa e gera métricas de inteligência comercial.

EMPRESA:
Nome: ${company.name}
Indústria: ${company.industry || "N/A"}
Tamanho: ${company.size || "N/A"}
Website: ${company.website || "N/A"}
Receita anual: ${company.annual_revenue ? `€${company.annual_revenue}` : "N/A"}
Funcionários: ${company.employee_count || "N/A"}
Modelo de negócio: ${company.business_model || "N/A"}
Tags: ${company.tags?.join(", ") || "N/A"}
Descrição: ${company.description || "N/A"}
Fundação: ${company.founded_year || "N/A"}
CAE: ${company.cae_description || "N/A"}
Contexto: ${ctx.about_us || ""} ${ctx.services || ""} ${ctx.target_market || ""}

PERFIL IDEAL DE CLIENTE (ICP):
${JSON.stringify(icpContext).substring(0, 500)}

NOSSA ESTRATÉGIA:
${JSON.stringify(strategyContext).substring(0, 300)}

NOSSAS OFERTAS:
${JSON.stringify(offersContext).substring(0, 300)}

Com base nestes dados, avalia a empresa.`;

          const aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  {
                    role: "system",
                    content: "És um analista de revenue intelligence para um CRM. Gera métricas precisas baseadas nos dados fornecidos. Responde em PT-PT.",
                  },
                  { role: "user", content: prompt },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "analyze_company_revenue",
                      description: "Gera métricas de revenue intelligence para uma empresa",
                      parameters: {
                        type: "object",
                        properties: {
                          icp_score: {
                            type: "number",
                            description: "Score de 0-100 de adequação ao ICP do workspace",
                          },
                          estimated_arr: {
                            type: "number",
                            description: "Estimativa de ARR potencial em euros baseada no tamanho, indústria e ofertas do workspace",
                          },
                          buying_signal: {
                            type: "string",
                            enum: ["strong", "moderate", "weak", "none"],
                            description: "Nível de sinais de compra detetados",
                          },
                          expansion_probability: {
                            type: "number",
                            description: "Probabilidade de expansão 0-100",
                          },
                          company_growth_stage: {
                            type: "string",
                            enum: ["startup", "growth", "scale_up", "mature", "enterprise", "declining"],
                            description: "Estágio de crescimento da empresa",
                          },
                          reasoning: {
                            type: "string",
                            description: "Explicação resumida das métricas (max 2 frases)",
                          },
                        },
                        required: [
                          "icp_score",
                          "estimated_arr",
                          "buying_signal",
                          "expansion_probability",
                          "company_growth_stage",
                          "reasoning",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: {
                  type: "function",
                  function: { name: "analyze_company_revenue" },
                },
              }),
            }
          );

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error(`[AI-REVENUE] AI error for ${company.id}:`, aiResponse.status, errText);
            if (aiResponse.status === 429) {
              results[company.id] = { error: "rate_limited" };
              return;
            }
            if (aiResponse.status === 402) {
              results[company.id] = { error: "payment_required" };
              return;
            }
            results[company.id] = { error: "ai_failed" };
            return;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall?.function?.arguments) {
            results[company.id] = { error: "invalid_response" };
            return;
          }

          const analysis = JSON.parse(toolCall.function.arguments);

          // Update company with AI columns
          const { error: updateErr } = await supabase
            .from("companies")
            .update({
              icp_fit_score: analysis.icp_score,
              estimated_arr: analysis.estimated_arr,
              buying_signal: analysis.buying_signal,
              expansion_probability: analysis.expansion_probability,
              company_growth_stage: analysis.company_growth_stage,
              ai_revenue_analyzed_at: new Date().toISOString(),
            })
            .eq("id", company.id);

          if (updateErr) {
            console.error(`[AI-REVENUE] Update error for ${company.id}:`, updateErr);
          }

          results[company.id] = { success: true, ...analysis };
        } catch (err) {
          console.error(`[AI-REVENUE] Error for ${company.id}:`, err);
          results[company.id] = { error: "processing_failed" };
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`[AI-REVENUE] Processed ${Object.keys(results).length} companies`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI-REVENUE] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
