import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = user.id;

    const { action, title, location, employment_type, remote_option, description, workspace_id } = await req.json();

    if (!workspace_id) return jsonResponse({ error: "workspace_id required" }, 400);
    if (!title?.trim()) return jsonResponse({ error: "title required" }, 400);
    if (!action) return jsonResponse({ error: "action required" }, 400);

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return jsonResponse({ error: "Not a workspace member" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI not configured" }, 500);

    const employmentLabels: Record<string, string> = {
      full_time: "tempo inteiro",
      part_time: "part-time",
      contract: "prestador de serviços",
      intern: "estágio",
    };
    const remoteLabels: Record<string, string> = {
      office: "presencial",
      remote: "remoto",
      hybrid: "híbrido",
    };

    const ctx = `Vaga: "${title}". Localização: ${location || "Portugal"}. Contrato: ${employmentLabels[employment_type] || employment_type || "tempo inteiro"}. Modalidade: ${remoteLabels[remote_option] || remote_option || "presencial"}.`;

    let tools: any[];
    let toolChoice: any;
    let systemPrompt: string;
    let userPrompt: string;

    if (action === "generate_description") {
      systemPrompt = "És um especialista de RH em Portugal. Gera descrições de vagas profissionais, claras e atrativas em português de Portugal. Inclui responsabilidades, o que oferecemos e perfil da empresa genérico.";
      userPrompt = `${ctx}\n\nGera uma descrição completa e profissional para esta vaga.`;
      tools = [{
        type: "function",
        function: {
          name: "set_description",
          description: "Define a descrição da vaga",
          parameters: {
            type: "object",
            properties: { description: { type: "string", description: "Texto completo da descrição da vaga" } },
            required: ["description"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "set_description" } };
    } else if (action === "suggest_salary") {
      systemPrompt = "És um consultor de compensação e benefícios em Portugal. Sugeres faixas salariais brutas anuais realistas com base no mercado português actual. Valores em euros.";
      userPrompt = `${ctx}\n\nSugere uma faixa salarial bruta anual realista para esta posição no mercado português.`;
      tools = [{
        type: "function",
        function: {
          name: "set_salary",
          description: "Define a faixa salarial sugerida",
          parameters: {
            type: "object",
            properties: {
              salary_min: { type: "number", description: "Salário mínimo bruto anual em EUR" },
              salary_max: { type: "number", description: "Salário máximo bruto anual em EUR" },
              reasoning: { type: "string", description: "Justificação breve da sugestão" },
            },
            required: ["salary_min", "salary_max", "reasoning"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "set_salary" } };
    } else if (action === "generate_requirements") {
      systemPrompt = "És um especialista de recrutamento em Portugal. Gera listas de requisitos realistas e concisos para vagas, em português de Portugal.";
      userPrompt = `${ctx}${description ? `\nDescrição: ${description}` : ""}\n\nGera os requisitos obrigatórios e os nice-to-have para esta vaga. Um item por linha.`;
      tools = [{
        type: "function",
        function: {
          name: "set_requirements",
          description: "Define os requisitos da vaga",
          parameters: {
            type: "object",
            properties: {
              requirements: { type: "string", description: "Requisitos obrigatórios, um por linha" },
              nice_to_have: { type: "string", description: "Nice-to-have, um por linha" },
            },
            required: ["requirements", "nice_to_have"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "set_requirements" } };
    } else if (action === "generate_all") {
      systemPrompt = "És um especialista de RH e compensação em Portugal. Gera conteúdo completo para vagas de emprego: descrição, requisitos, nice-to-have e faixa salarial. Tudo em português de Portugal, realista e profissional.";
      userPrompt = `${ctx}\n\nGera toda a informação para esta vaga: descrição completa, requisitos obrigatórios (um por linha), nice-to-have (um por linha) e faixa salarial bruta anual em EUR.`;
      tools = [{
        type: "function",
        function: {
          name: "set_all",
          description: "Define toda a informação da vaga",
          parameters: {
            type: "object",
            properties: {
              description: { type: "string" },
              requirements: { type: "string", description: "Requisitos obrigatórios, um por linha" },
              nice_to_have: { type: "string", description: "Nice-to-have, um por linha" },
              salary_min: { type: "number" },
              salary_max: { type: "number" },
            },
            required: ["description", "requirements", "nice_to_have", "salary_min", "salary_max"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "set_all" } };
    } else {
      return jsonResponse({ error: "Invalid action" }, 400);
    }

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
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) return jsonResponse({ error: "Rate limit exceeded. Tente novamente em breve." }, 429);
      if (status === 402) return jsonResponse({ error: "Créditos IA esgotados." }, 402);
      return jsonResponse({ error: "Erro ao gerar conteúdo" }, 500);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResponse({ error: "No AI response" }, 500);

    const result = JSON.parse(toolCall.function.arguments);
    return jsonResponse({ action, result });
  } catch (e) {
    console.error("hr-job-ai-assist error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
