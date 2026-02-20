import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProposalItem {
  name: string;
  quantity: number;
  unit_price: number;
  description?: string;
  category?: string;
}

interface RequestBody {
  mode: "analyze" | "generate_scope" | "generate_timeline" | "suggest_conditions" | "suggest_references" | "copilot";
  proposalData: {
    id: string;
    title: string;
    price: number;
    status: string;
    items: ProposalItem[];
  };
  opportunityData?: {
    title: string;
    value: number;
    stage: string;
    lead?: { name: string; company?: string };
  };
  clientData?: {
    name: string;
    type: "contact" | "company";
    industry?: string;
    previousProposals?: number;
  };
  existingData?: {
    scope?: Record<string, unknown>;
    timeline?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    references?: Record<string, unknown>;
  };
  question?: string;
}

const systemPrompts: Record<string, string> = {
  analyze: `És um analista de propostas comerciais experiente. Analisa a proposta fornecida e retorna uma avaliação detalhada.
Avalia:
- Score de sucesso (0-100 baseado na completude e qualidade)
- Probabilidade de fecho (0-100 baseado no contexto)
- Factores positivos e negativos
- Recomendações prioritárias
- Elementos em falta

Responde APENAS com JSON válido no formato:
{
  "successScore": number,
  "closeProbability": number,
  "confidence": number,
  "positiveFactors": [{"factor": string, "impact": "high"|"medium"|"low", "description": string}],
  "riskFactors": [{"factor": string, "severity": "high"|"medium"|"low", "mitigation": string}],
  "recommendations": [{"action": string, "priority": "now"|"soon"|"later", "expectedImpact": string}],
  "missingElements": [string],
  "strengthAreas": [string],
  "summary": string
}`,

  generate_scope: `És um consultor de projectos experiente. Baseado nos itens da proposta e contexto, gera um âmbito de projecto profissional.
Inclui:
- Objectivos claros e mensuráveis
- Entregáveis específicos
- Exclusões importantes
- Pressupostos do projecto

Responde APENAS com JSON válido no formato:
{
  "objectives": string,
  "deliverables": [string],
  "exclusions": [string],
  "assumptions": string,
  "confidence": number,
  "reasoning": string
}`,

  generate_timeline: `És um gestor de projectos experiente. Baseado nos itens e âmbito, cria um cronograma realista.
Considera:
- Complexidade dos entregáveis
- Dependências entre fases
- Marcos importantes
- Buffers para revisões

Responde APENAS com JSON válido no formato:
{
  "phases": [{"type": "phase"|"milestone", "title": string, "duration": number, "week": number, "description": string}],
  "totalDuration": number,
  "confidence": number,
  "reasoning": string
}`,

  suggest_conditions: `És um especialista em vendas B2B. Sugere condições de pagamento e validade apropriadas.
Considera:
- Valor da proposta
- Tipo de cliente
- Práticas do mercado
- Gestão de risco

Responde APENAS com JSON válido no formato:
{
  "paymentConditions": string,
  "validityDays": number,
  "notes": string,
  "reasoning": string,
  "confidence": number
}`,

  suggest_references: `És um especialista em marketing B2B. Sugere referências e credenciais relevantes.
Considera:
- Tipo de projecto
- Indústria do cliente
- Casos de sucesso típicos

Responde APENAS com JSON válido no formato:
{
  "projects": [{"title": string, "description": string}],
  "testimonial": {"quote": string, "author": string, "company": string, "role": string},
  "certifications": [string],
  "reasoning": string,
  "confidence": number
}`,

  copilot: `És um assistente especializado em propostas comerciais. Ajuda o utilizador a melhorar a sua proposta.
Responde de forma concisa e accionável. Se apropriado, sugere melhorias específicas.
Usa português europeu (PT-PT).`,
};

function buildPrompt(mode: string, body: RequestBody): string {
  const { proposalData, opportunityData, clientData, existingData, question } = body;
  
  let prompt = `## Proposta\n`;
  prompt += `- Título: ${proposalData.title}\n`;
  prompt += `- Valor: €${proposalData.price?.toFixed(2) || "0.00"}\n`;
  prompt += `- Status: ${proposalData.status}\n\n`;
  
  if (proposalData.items?.length > 0) {
    prompt += `## Itens (${proposalData.items.length})\n`;
    proposalData.items.forEach((item, i) => {
      prompt += `${i + 1}. ${item.name} - ${item.quantity}x €${item.unit_price}`;
      if (item.category) prompt += ` (${item.category})`;
      if (item.description) prompt += `\n   ${item.description}`;
      prompt += "\n";
    });
    prompt += "\n";
  }
  
  if (opportunityData) {
    prompt += `## Oportunidade\n`;
    prompt += `- Título: ${opportunityData.title}\n`;
    prompt += `- Valor: €${opportunityData.value}\n`;
    prompt += `- Fase: ${opportunityData.stage}\n`;
    if (opportunityData.lead) {
      prompt += `- Lead: ${opportunityData.lead.name}`;
      if (opportunityData.lead.company) prompt += ` (${opportunityData.lead.company})`;
      prompt += "\n";
    }
    prompt += "\n";
  }
  
  if (clientData) {
    prompt += `## Cliente\n`;
    prompt += `- Nome: ${clientData.name}\n`;
    prompt += `- Tipo: ${clientData.type === "company" ? "Empresa" : "Particular"}\n`;
    if (clientData.industry) prompt += `- Indústria: ${clientData.industry}\n`;
    if (clientData.previousProposals) prompt += `- Propostas anteriores: ${clientData.previousProposals}\n`;
    prompt += "\n";
  }
  
  if (existingData && Object.keys(existingData).length > 0) {
    prompt += `## Dados Existentes\n`;
    if (existingData.scope) {
      prompt += `### Âmbito\n${JSON.stringify(existingData.scope, null, 2)}\n\n`;
    }
    if (existingData.timeline) {
      prompt += `### Cronograma\n${JSON.stringify(existingData.timeline, null, 2)}\n\n`;
    }
    if (existingData.conditions) {
      prompt += `### Condições\n${JSON.stringify(existingData.conditions, null, 2)}\n\n`;
    }
  }
  
  if (mode === "copilot" && question) {
    prompt += `## Pergunta do Utilizador\n${question}\n`;
  }
  
  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { mode } = body;
    
    if (!mode || !systemPrompts[mode]) {
      return new Response(
        JSON.stringify({ error: "Modo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = systemPrompts[mode];
    const userPrompt = buildPrompt(mode, body);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: mode === "copilot" ? 0.7 : 0.3,
        max_tokens: mode === "copilot" ? 1000 : 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // For copilot mode, return the text directly
    if (mode === "copilot") {
      return new Response(
        JSON.stringify({ response: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For structured modes, parse the JSON
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonString = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ai-proposal-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
