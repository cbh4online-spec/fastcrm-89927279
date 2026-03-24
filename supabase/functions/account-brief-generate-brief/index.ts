import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, extractedData, runId } = await req.json();
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

    // Get ICP for context
    const { data: icpProfile } = await supabase
      .from("account_brief_icp_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .maybeSingle();

    // Get account
    const { data: account } = await supabase
      .from("account_brief_accounts")
      .select("name, domain")
      .eq("id", accountId)
      .single();

    // Use extractedData if provided, or get from latest snapshot
    let data = extractedData;
    if (!data) {
      const { data: snapshots } = await supabase
        .from("account_brief_page_snapshots")
        .select("extracted_structured_json")
        .eq("account_id", accountId)
        .eq("workspace_id", workspaceId)
        .not("extracted_structured_json", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      data = snapshots?.[0]?.extracted_structured_json;
    }

    if (!data) {
      return new Response(JSON.stringify({ success: false, error: "Sem dados extraídos disponíveis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const icpContext = icpProfile
      ? `O ICP do utilizador é: tipo=${icpProfile.company_type || "não definido"}, indústria=${icpProfile.industry || "não definido"}, geografia=${icpProfile.geography || "não definido"}, tamanho=${icpProfile.size_band || "não definido"}.`
      : "Sem ICP definido.";

    const prompt = `Gera um briefing comercial B2B completo para a empresa "${account?.name || "desconhecida"}" (${account?.domain || ""}).

DADOS ESTRUTURADOS EXTRAÍDOS:
${JSON.stringify(data, null, 2)}

CONTEXTO ICP DO UTILIZADOR:
${icpContext}

REGRAS:
- Escreve em português de Portugal
- Linguagem de negócio, clara e direta
- Frases curtas e acionáveis
- Distingue "facto observado" de "hipótese útil para outreach" com prefixos [Facto] e [Hipótese]
- Não inventes dados — se não houver informação, diz "não claramente visível no website"
- O briefing deve ser útil numa call de vendas ou preparação de outreach
- Evita jargão técnico, texto académico e disclaimers excessivos`;

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
            content: "És um analista comercial sénior especializado em preparação de contas B2B. Geras briefings estruturados, claros e acionáveis para equipas de vendas. Responde APENAS com o JSON via tool call."
          },
          { role: "user", content: prompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_brief",
            description: "Gera briefing comercial estruturado",
            parameters: {
              type: "object",
              properties: {
                executive_summary: { type: "string", description: "Resumo executivo de 3-5 frases, claro e acionável" },
                what_they_do: { type: "string", description: "O que a empresa faz (2-3 frases)" },
                who_they_sell_to: { type: "string", description: "Para quem vendem (segmentos e tipos de cliente)" },
                main_products: { type: "array", items: { type: "string" }, description: "Produtos/serviços principais" },
                growth_signals: { type: "array", items: { type: "string" }, description: "Sinais de crescimento e prioridade" },
                personalization_insights: { type: "array", items: { type: "string" }, description: "Insights para personalizar outreach" },
                outreach_angles: { type: "array", items: { type: "string" }, description: "Ângulos sugeridos para primeiro contacto" },
                objections_attention: { type: "array", items: { type: "string" }, description: "Objeções ou pontos de atenção inferidos" },
                market_geography: { type: "string", description: "Mercados e geografias" },
                commercial_signals: { type: "string", description: "Sinais comerciais relevantes (enterprise/SMB focus, pricing, partnerships)" },
              },
              required: ["executive_summary", "what_they_do", "outreach_angles"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_brief" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: response.status === 429 ? "Rate limit" : "Credits exhausted" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return brief");

    const brief = JSON.parse(toolCall.function.arguments);

    // Save brief
    await supabase.from("account_brief_briefs").insert({
      workspace_id: workspaceId,
      account_id: accountId,
      analysis_run_id: runId || null,
      executive_summary: brief.executive_summary,
      identity_json: {
        what_they_do: brief.what_they_do,
        who_they_sell_to: brief.who_they_sell_to,
        market_geography: brief.market_geography,
      },
      offer_json: {
        main_products: brief.main_products,
        commercial_signals: brief.commercial_signals,
      },
      signals_json: {
        growth_signals: brief.growth_signals,
      },
      personalization_json: {
        personalization_insights: brief.personalization_insights,
        outreach_angles: brief.outreach_angles,
        objections_attention: brief.objections_attention,
      },
      outreach_json: {
        outreach_angles: brief.outreach_angles,
        objections_attention: brief.objections_attention,
      },
    });

    // Update account executive summary
    await supabase.from("account_brief_accounts").update({
      executive_summary: brief.executive_summary,
      updated_at: new Date().toISOString(),
    }).eq("id", accountId);

    console.log(`[brief] Generated for account ${accountId}`);

    return new Response(JSON.stringify({ success: true, brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[brief] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
