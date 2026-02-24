

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingInput {
  businessType: string;
  customBusinessType?: string;
  successDefinition: string;
  processDescription: string;
  channels: string[];
  revenueModel?: string;
  teamSize?: string;
  salesComplexity?: string;
  primaryObjective?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, customBusinessType, successDefinition, processDescription, channels, revenueModel, teamSize, salesComplexity, primaryObjective }: OnboardingInput = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const actualBusinessType = businessType === "other" ? customBusinessType : businessType;

    const systemPrompt = `Tu és um especialista em CRM e processos de vendas. Com base nas informações do negócio do utilizador, deves criar uma configuração personalizada para o CRM.

Responde APENAS com um JSON válido no formato especificado. Não incluas markdown, explicações ou texto adicional.

O JSON deve ter esta estrutura:
{
  "pipeline": {
    "name": "string - nome do pipeline",
    "stages": [
      {
        "name": "string",
        "description": "string - breve descrição",
        "position": number,
        "color": "string - cor hex"
      }
    ]
  },
  "customFields": {
    "leads": [
      {
        "name": "string",
        "field_type": "text|number|select|date|boolean",
        "required": boolean,
        "options": ["array de opções se select"],
        "reason": "string - porque este campo é útil"
      }
    ],
    "contacts": [...],
    "companies": [...],
    "opportunities": [...]
  },
  "forms": [
    {
      "name": "string",
      "description": "string",
      "fields": [
        {
          "name": "string",
          "type": "text|email|phone|select|textarea",
          "required": boolean,
          "options": ["se select"]
        }
      ]
    }
  ],
  "automations": [
    {
      "name": "string",
      "description": "string",
      "trigger": "string - quando dispara",
      "actions": ["array de ações"]
    }
  ],
  "dashboardKPIs": [
    {
      "name": "string",
      "metric": "string - o que mede",
      "priority": "high|medium|low"
    }
  ],
  "explanations": {
    "pipeline": "string - explica as decisões do pipeline",
    "customFields": "string - explica os campos criados",
    "forms": "string - explica os formulários",
    "automations": "string - explica as automações",
    "general": "string - resumo geral da configuração"
  }
}`;

    const channelNames: Record<string, string> = {
      forms: "Formulários no site",
      email: "Email",
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      phone: "Telefone",
      website: "Chat no site",
      referrals: "Referências/Boca-a-boca",
      other: "Outros canais",
    };
    
    const selectedChannels = channels?.map((c: string) => channelNames[c] || c).join(", ") || "Não especificados";

    const revenueLabels: Record<string, string> = {
      subscription: "Subscrição recorrente",
      "one-time": "Venda única",
      "project-based": "Baseado em projetos",
      mixed: "Modelo misto",
    };
    const teamLabels: Record<string, string> = {
      solo: "1 pessoa (solo)",
      "2-5": "2-5 pessoas",
      "6-20": "6-20 pessoas",
      "20+": "Mais de 20 pessoas",
    };
    const complexityLabels: Record<string, string> = {
      simple: "Simples (decisão rápida)",
      medium: "Médio (várias etapas)",
      complex: "Complexo (vários decisores, longo)",
    };

    const objectiveLabels: Record<string, string> = {
      organize_pipeline: "Organizar pipeline de vendas",
      improve_forecast: "Melhorar previsão de receita (forecast)",
      automate_followups: "Automatizar follow-ups",
      manage_docs: "Gerir propostas e faturas",
    };

    const userPrompt = `Tipo de negócio: ${actualBusinessType}

Modelo de receita: ${revenueLabels[revenueModel || ""] || revenueModel || "Não especificado"}

Tamanho da equipa: ${teamLabels[teamSize || ""] || teamSize || "Não especificado"}

Complexidade do ciclo de vendas: ${complexityLabels[salesComplexity || ""] || salesComplexity || "Não especificado"}

Objetivo principal: ${objectiveLabels[primaryObjective || ""] || primaryObjective || "Não especificado"}

O que representa uma venda bem-sucedida: ${successDefinition}

Canais de entrada de contactos: ${selectedChannels}

Descrição do processo de vendas:
${processDescription}

Com base nestas informações, cria uma configuração completa e personalizada para este CRM. Considera as especificidades deste tipo de negócio e adapta os nomes, etapas e campos para o contexto português/brasileiro. 

Adapta o número de etapas do pipeline à complexidade indicada. Se o ciclo é simples, usa 3-4 etapas. Se complexo, usa 6-8 etapas.

Adapta os formulários para capturar leads dos canais indicados. Se usam WhatsApp ou Instagram, cria campos específicos para esses canais.

Dá prioridade às automações e KPIs que apoiam o objetivo principal indicado.`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adiciona créditos à tua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao comunicar com a IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse the JSON response
    let setupConfig;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      setupConfig = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Erro ao processar resposta da IA");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        config: setupConfig,
        businessType: actualBusinessType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Onboarding AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
