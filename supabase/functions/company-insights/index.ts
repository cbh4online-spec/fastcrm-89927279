import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInsight {
  summary: string[];
  fitScore: number;
  fitExplanation: string;
  suggestedActions: Array<{
    type: "opportunity" | "task" | "template" | "proposal" | "product_suggestion";
    label: string;
    priority: "high" | "medium" | "low";
    productId?: string;
    productName?: string;
    reasoning?: string;
  }>;
  productRecommendations: Array<{
    productId: string;
    productName: string;
    fitScore: number;
    reasoning: string;
  }>;
  warnings: Array<{
    type: "missing_contact" | "no_website" | "duplicate" | "stale_data";
    message: string;
  }>;
}

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
    
    // Validate JWT using the anon key client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID da empresa é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch company data including company_context
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ success: false, error: "Empresa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data for context including our products
    const [
      { data: opportunities },
      { data: contacts },
      { data: activities },
      { data: products }
    ] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("workspace_id", company.workspace_id)
        .limit(5),
      supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", company.workspace_id)
        .ilike("company", `%${company.name}%`)
        .limit(10),
      supabase
        .from("crm_activities")
        .select("*")
        .eq("entity_id", companyId)
        .eq("entity_type", "company")
        .order("created_at", { ascending: false })
        .limit(10),
      // Fetch our products/services to suggest
      supabase
        .from("products")
        .select("id, name, short_description, category, base_price, product_type, benefits")
        .eq("workspace_id", company.workspace_id)
        .eq("status", "active")
        .limit(20)
    ]);

    // Build warnings
    const warnings: CompanyInsight["warnings"] = [];

    if (!company.email && !company.phone) {
      warnings.push({
        type: "missing_contact",
        message: "Sem método de contacto definido"
      });
    }

    if (!company.website) {
      warnings.push({
        type: "no_website",
        message: "Sem website associado"
      });
    }

    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(company.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 90) {
      warnings.push({
        type: "stale_data",
        message: `Dados não atualizados há ${daysSinceUpdate} dias`
      });
    }

    // Extract company context if available
    const companyContext = company.company_context || {};
    const hasRichContext = Object.keys(companyContext).length > 0;

    // Use AI to generate insights with product recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      // Return basic insights without AI
      const basicInsights: CompanyInsight = {
        summary: [
          company.industry ? `Empresa do setor ${company.industry}` : "Setor não definido",
          company.size ? `Tamanho: ${company.size} funcionários` : "Tamanho desconhecido",
          contacts?.length ? `${contacts.length} contacto(s) associado(s)` : "Sem contactos associados"
        ],
        fitScore: 50,
        fitExplanation: "Análise básica sem IA",
        suggestedActions: [
          { type: "opportunity", label: "Criar oportunidade", priority: "medium" },
          { type: "task", label: "Agendar follow-up", priority: "medium" }
        ],
        productRecommendations: [],
        warnings
      };

      return new Response(
        JSON.stringify({ success: true, data: basicInsights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context about company for AI
    let companyContextText = "";
    if (hasRichContext) {
      companyContextText = `
CONTEXTO EMPRESARIAL (extraído do website):
- Sobre a empresa: ${companyContext.about_us || "N/A"}
- Serviços que oferecem: ${companyContext.services || "N/A"}
- Produtos que oferecem: ${companyContext.products || "N/A"}
- Clientes: ${companyContext.clients || "N/A"}
- Mercado-alvo: ${companyContext.target_market || "N/A"}
- Equipa: ${companyContext.team_info || "N/A"}
- Missão e valores: ${companyContext.mission_values || "N/A"}
- Diferenciais: ${companyContext.differentiators || "N/A"}
- Certificações: ${companyContext.certifications || "N/A"}
- Ano fundação: ${companyContext.year_founded || "N/A"}`;
    }

    // Build our products catalog for AI
    let productsText = "Sem produtos/serviços catalogados";
    if (products && products.length > 0) {
      productsText = products.map((p: any) => 
        `- ${p.name} (ID: ${p.id}): ${p.short_description || p.category || 'Sem descrição'}. Preço: €${p.base_price || 'N/A'}. Tipo: ${p.product_type || 'N/A'}. ${p.benefits ? `Benefícios: ${p.benefits}` : ''}`
      ).join("\n");
    }

    const aiPrompt = `Analisa os dados de uma empresa cliente/prospect e sugere quais dos NOSSOS produtos/serviços podemos vender-lhe.

DADOS DA EMPRESA:
Nome: ${company.name}
Indústria: ${company.industry || "Não definida"}
Tamanho: ${company.size || "Desconhecido"}
Website: ${company.website || "Não definido"}
Email: ${company.email || "Não definido"}
Telefone: ${company.phone || "Não definido"}
Notas: ${company.notes || "Sem notas"}
Tags: ${company.tags?.join(", ") || "Sem tags"}
${companyContextText}

CONTACTOS ASSOCIADOS: ${contacts?.length || 0}
ATIVIDADES RECENTES: ${activities?.length || 0}
OPORTUNIDADES EXISTENTES: ${opportunities?.length || 0}

---

OS NOSSOS PRODUTOS/SERVIÇOS DISPONÍVEIS PARA VENDER:
${productsText}

---

TAREFA:
1. Analisa o perfil da empresa, especialmente o seu contexto empresarial (serviços, clientes, mercado-alvo)
2. Identifica quais dos NOSSOS produtos/serviços fazem sentido para esta empresa
3. Explica PORQUÊ cada produto é relevante (com base nos dados da empresa)
4. Sugere ações comerciais concretas

Sê específico - cruza o que a empresa faz/precisa com o que nós oferecemos.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "És um consultor comercial que analisa empresas e sugere quais produtos/serviços da nossa carteira podemos vender-lhes. Sê específico e justifica cada recomendação com base nos dados da empresa. Responde em Português de Portugal."
          },
          { role: "user", content: aiPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_sales_insights",
              description: "Gera insights de vendas e recomendações de produtos",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 bullet points sobre a empresa e potencial de vendas"
                  },
                  fitScore: {
                    type: "number",
                    description: "Score de 0 a 100 indicando potencial de vendas"
                  },
                  fitExplanation: {
                    type: "string",
                    description: "Explicação curta do score de fit"
                  },
                  productRecommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        productId: { type: "string", description: "ID do produto" },
                        productName: { type: "string", description: "Nome do produto" },
                        fitScore: { type: "number", description: "Score de 0-100 de adequação" },
                        reasoning: { type: "string", description: "Porquê este produto faz sentido para esta empresa (máx 2 frases)" }
                      },
                      required: ["productId", "productName", "fitScore", "reasoning"]
                    },
                    description: "Produtos recomendados ordenados por relevância"
                  },
                  suggestedActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["opportunity", "task", "template", "proposal", "product_suggestion"] },
                        label: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        productId: { type: "string" },
                        productName: { type: "string" },
                        reasoning: { type: "string" }
                      },
                      required: ["type", "label", "priority"]
                    }
                  }
                },
                required: ["summary", "fitScore", "fitExplanation", "productRecommendations", "suggestedActions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_sales_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI insights failed:", await aiResponse.text());
      throw new Error("Falha ao gerar insights");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta IA inválida");
    }

    const aiInsights = JSON.parse(toolCall.function.arguments);

    const insights: CompanyInsight = {
      summary: aiInsights.summary || [],
      fitScore: aiInsights.fitScore || 50,
      fitExplanation: aiInsights.fitExplanation || "",
      suggestedActions: aiInsights.suggestedActions || [],
      productRecommendations: aiInsights.productRecommendations || [],
      warnings
    };

    console.log("Generated sales insights for company:", companyId, "with", insights.productRecommendations?.length || 0, "product recommendations");

    return new Response(
      JSON.stringify({ success: true, data: insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Insights error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro ao gerar insights"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
