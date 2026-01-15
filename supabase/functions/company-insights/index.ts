import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyInsight {
  summary: string[];
  fitScore: number;
  fitExplanation: string;
  suggestedActions: Array<{
    type: "opportunity" | "task" | "template" | "proposal";
    label: string;
    priority: "high" | "medium" | "low";
  }>;
  warnings: Array<{
    type: "missing_contact" | "no_website" | "duplicate" | "stale_data";
    message: string;
  }>;
}

serve(async (req) => {
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

    // Fetch company data
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

    // Fetch related data for context
    const [
      { data: opportunities },
      { data: contacts },
      { data: activities }
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
        .limit(10)
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

    // Use AI to generate insights
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
        warnings
      };

      return new Response(
        JSON.stringify({ success: true, data: basicInsights }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiPrompt = `Analisa os seguintes dados de uma empresa e gera insights acionáveis.

DADOS DA EMPRESA:
Nome: ${company.name}
Indústria: ${company.industry || "Não definida"}
Tamanho: ${company.size || "Desconhecido"}
Website: ${company.website || "Não definido"}
Email: ${company.email || "Não definido"}
Telefone: ${company.phone || "Não definido"}
Notas: ${company.notes || "Sem notas"}
Tags: ${company.tags?.join(", ") || "Sem tags"}

CONTACTOS ASSOCIADOS: ${contacts?.length || 0}
ATIVIDADES RECENTES: ${activities?.length || 0}
OPORTUNIDADES: ${opportunities?.length || 0}

Gera:
1. Summary: 3 bullet points curtos sobre a empresa
2. Fit Score: 0-100 baseado na qualidade dos dados e potencial
3. Ações sugeridas priorizadas
4. Considera os warnings já identificados: ${JSON.stringify(warnings)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "És um assistente de CRM que analisa empresas e sugere próximos passos. Responde sempre em Português de Portugal. Sê conciso e prático."
          },
          { role: "user", content: aiPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_company_insights",
              description: "Gera insights estruturados sobre uma empresa",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 bullet points sobre a empresa"
                  },
                  fitScore: {
                    type: "number",
                    description: "Score de 0 a 100"
                  },
                  fitExplanation: {
                    type: "string",
                    description: "Explicação curta do score"
                  },
                  suggestedActions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["opportunity", "task", "template", "proposal"] },
                        label: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] }
                      },
                      required: ["type", "label", "priority"]
                    }
                  }
                },
                required: ["summary", "fitScore", "fitExplanation", "suggestedActions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_company_insights" } }
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
      warnings
    };

    console.log("Generated insights for company:", companyId);

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
