

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  direction: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  leadData?: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    source?: string;
    tags?: string[];
  };
  opportunityData?: {
    id?: string;
    title?: string;
    value?: number;
    stage?: string;
    status?: string;
  };
  proposalData?: {
    count: number;
    hasAccepted: boolean;
    hasPending: boolean;
  };
  conversationData?: {
    channel: string;
    status: string;
    assignedTo?: string;
    hoursSinceLastMessage?: number;
    temperature?: number;
  };
  companyData?: {
    name?: string;
    industry?: string;
  };
}

// Trigger patterns for opportunity creation
const opportunityTriggerPatterns = {
  price: [
    /pre[çc]o/i, /valor/i, /custo/i, /quanto/i, /or[çc]amento/i,
    /investimento/i, /quanto custa/i, /qual o pre[çc]o/i,
    /price/i, /cost/i, /quote/i, /budget/i
  ],
  negotiation: [
    /desconto/i, /condi[çc][õo]es/i, /negoci/i, /proposta/i,
    /acordo/i, /parceria/i, /contrato/i, /fech/i,
    /discount/i, /deal/i, /offer/i, /terms/i
  ],
  meeting: [
    /reun[iã]/i, /agendar/i, /marcar/i, /encontr/i, /call/i,
    /disponibilidade/i, /hor[aá]rio/i, /visita/i, /demonstra/i,
    /meeting/i, /schedule/i, /appointment/i, /demo/i
  ],
  proposal: [
    /propost/i, /apresenta[çc]/i, /enviar/i, /receber/i,
    /document/i, /formal/i, /oficial/i, /detalh/i,
    /proposal/i, /send/i, /receive/i, /details/i
  ],
  interest: [
    /interes/i, /gost/i, /quer/i, /precis/i,
    /interessad/i, /quero saber/i, /pode me/i,
    /interested/i, /want/i, /need/i, /like to/i
  ]
};

// Extract monetary values from text
function extractMonetaryValues(text: string): number[] {
  const patterns = [
    /€\s*(\d+(?:[.,]\d+)?(?:\s*(?:mil|k|K))?)/, // €1000, € 1,5k
    /(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i, // 1000€, 1000 euros
    /R\$\s*(\d+(?:[.,]\d+)?(?:\s*(?:mil|k|K))?)/i, // R$ 1000
    /\$\s*(\d+(?:[.,]\d+)?(?:\s*(?:mil|k|K))?)/i, // $1000
    /(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/i, // 5k, 5 mil
  ];

  const values: number[] = [];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      let value = match[1].replace(',', '.');
      // Handle k/mil suffix
      if (/(?:mil|k)/i.test(match[0])) {
        value = value.replace(/\s*(?:mil|k)/i, '');
        values.push(parseFloat(value) * 1000);
      } else {
        values.push(parseFloat(value));
      }
    }
  }
  
  return values.filter(v => !isNaN(v) && v > 0);
}

// Detect triggers in messages
function detectOpportunityTriggers(messages: Message[]): {
  hasTrigger: boolean;
  triggers: string[];
  suggestedValue: number | null;
  relevantContext: string[];
} {
  const triggers: Set<string> = new Set();
  const relevantContext: string[] = [];
  let suggestedValue: number | null = null;

  // Focus on recent messages (last 10)
  const recentMessages = messages.slice(-10);
  
  for (const message of recentMessages) {
    const content = message.content.toLowerCase();
    
    // Check each trigger category
    for (const [category, patterns] of Object.entries(opportunityTriggerPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          triggers.add(category);
          // Extract the relevant sentence
          const sentences = message.content.split(/[.!?]+/);
          for (const sentence of sentences) {
            if (pattern.test(sentence.toLowerCase()) && sentence.trim().length > 10) {
              relevantContext.push(sentence.trim());
            }
          }
        }
      }
    }
    
    // Extract monetary values
    const values = extractMonetaryValues(message.content);
    if (values.length > 0) {
      // Take the highest mentioned value as suggested
      suggestedValue = Math.max(...values, suggestedValue || 0);
    }
  }
  
  return {
    hasTrigger: triggers.size > 0,
    triggers: Array.from(triggers),
    suggestedValue,
    relevantContext: relevantContext.slice(-3), // Last 3 relevant contexts
  };
}

// Build opportunity suggestion details
function buildOpportunitySuggestion(
  triggers: { triggers: string[]; suggestedValue: number | null; relevantContext: string[] },
  leadData?: RequestBody['leadData'],
  hasExistingOpportunity?: boolean
): {
  shouldSuggest: boolean;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  prefillData: {
    title?: string;
    value?: number;
    context?: string;
  };
} {
  if (hasExistingOpportunity) {
    return { shouldSuggest: false, priority: 'low', reason: '', prefillData: {} };
  }

  const hasPriceTrigger = triggers.triggers.includes('price');
  const hasNegotiationTrigger = triggers.triggers.includes('negotiation');
  const hasMeetingTrigger = triggers.triggers.includes('meeting');
  const hasProposalTrigger = triggers.triggers.includes('proposal');
  const hasInterestTrigger = triggers.triggers.includes('interest');

  // Determine priority based on trigger combination
  let priority: 'high' | 'medium' | 'low' = 'low';
  let reason = '';
  let shouldSuggest = false;

  if (hasPriceTrigger && (hasNegotiationTrigger || hasProposalTrigger)) {
    priority = 'high';
    reason = 'Cliente pediu preço e está em negociação';
    shouldSuggest = true;
  } else if (hasPriceTrigger) {
    priority = 'high';
    reason = 'Cliente solicitou informações de preço';
    shouldSuggest = true;
  } else if (hasNegotiationTrigger) {
    priority = 'high';
    reason = 'Conversa em tom de negociação comercial';
    shouldSuggest = true;
  } else if (hasMeetingTrigger) {
    priority = 'medium';
    reason = 'Cliente solicitou reunião/demonstração';
    shouldSuggest = true;
  } else if (hasProposalTrigger) {
    priority = 'medium';
    reason = 'Proposta comercial sendo discutida';
    shouldSuggest = true;
  } else if (hasInterestTrigger && triggers.suggestedValue) {
    priority = 'medium';
    reason = 'Cliente demonstra interesse com valor mencionado';
    shouldSuggest = true;
  }

  // Build pre-fill data
  const prefillData: { title?: string; value?: number; context?: string } = {};
  
  if (leadData?.name) {
    prefillData.title = `Oportunidade - ${leadData.name}`;
  }
  
  if (triggers.suggestedValue) {
    prefillData.value = triggers.suggestedValue;
  }
  
  if (triggers.relevantContext.length > 0) {
    prefillData.context = triggers.relevantContext.join(' | ');
  }

  return { shouldSuggest, priority, reason, prefillData };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { messages, leadData, opportunityData, proposalData, conversationData, companyData } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], opportunityTrigger: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect opportunity triggers
    const triggerAnalysis = detectOpportunityTriggers(messages);
    const opportunitySuggestion = buildOpportunitySuggestion(
      triggerAnalysis,
      leadData,
      !!opportunityData?.id
    );

    // Format conversation for AI context
    const conversationText = messages
      .slice(-15)
      .map((m) => `${m.direction === "inbound" ? "Cliente" : "Equipa"}: ${m.content}`)
      .join("\n");

    const lastMessage = messages[messages.length - 1];
    const isAwaitingReply = lastMessage?.direction === "inbound";

    const systemPrompt = `Você é um assistente de CRM inteligente que sugere ações para conversas de negócios.

REGRAS IMPORTANTES:
1. Analise a conversa e contexto para sugerir ações relevantes
2. Cada sugestão deve ter uma razão clara e específica baseada na conversa
3. Priorize ações com maior impacto comercial
4. NUNCA invente fatos - baseie-se apenas no conteúdo fornecido
5. Sugira entre 2 e 4 ações mais relevantes
6. Se detectar sinais de interesse comercial e não há oportunidade criada, SEMPRE sugira create_opportunity

GATILHOS DE OPORTUNIDADE (sugira create_opportunity quando):
- Cliente pergunta sobre preço, orçamento, custo, investimento
- Linguagem de negociação: desconto, condições, proposta, acordo
- Pedido de reunião, demonstração, call
- Discussão de proposta comercial
- Interesse explícito em produtos/serviços

AÇÕES DISPONÍVEIS:
- reply_now: Responder agora (quando cliente aguarda resposta)
- create_opportunity: Criar oportunidade (quando há interesse comercial)
- send_proposal: Enviar proposta (quando há oportunidade sem proposta)
- schedule_followup: Agendar follow-up (quando conversa precisa de acompanhamento)
- assign_conversation: Atribuir conversa (quando precisa de especialista/responsável)

CONTEXTO ADICIONAL:
${leadData ? `- Lead: ${leadData.name || 'Desconhecido'}, Email: ${leadData.email || 'N/A'}, Status: ${leadData.status || 'novo'}` : ''}
${companyData ? `- Empresa: ${companyData.name || 'N/A'}, Setor: ${companyData.industry || 'N/A'}` : ''}
${opportunityData?.id ? `- Oportunidade existente: ${opportunityData.title}, Valor: €${opportunityData.value}, Etapa: ${opportunityData.stage}` : '- SEM OPORTUNIDADE CRIADA'}
${proposalData ? `- Propostas: ${proposalData.count} enviadas, Aceite: ${proposalData.hasAccepted ? 'Sim' : 'Não'}` : '- Sem propostas'}
${conversationData ? `- Canal: ${conversationData.channel}, Horas desde última msg: ${conversationData.hoursSinceLastMessage || 0}` : ''}
${isAwaitingReply ? '- CLIENTE AGUARDA RESPOSTA' : '- Última mensagem foi da equipa'}
${triggerAnalysis.hasTrigger ? `- GATILHOS DETECTADOS: ${triggerAnalysis.triggers.join(', ')}` : ''}

FORMATO DE RESPOSTA (JSON):
{
  "suggestions": [
    {
      "action": "action_type",
      "reason": "razão específica baseada na conversa (máximo 20 palavras)",
      "priority": "high|medium|low",
      "context": "dado adicional se relevante (ex: valor mencionado, data sugerida)"
    }
  ]
}`;

    const userPrompt = `Analise esta conversa e sugira as ações mais relevantes:

${conversationText}

Forneça sugestões de ações no formato JSON especificado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Try again later.", 
            suggestions: [],
            opportunityTrigger: opportunitySuggestion.shouldSuggest ? opportunitySuggestion : null
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits exhausted. Please add credits.", 
            suggestions: [],
            opportunityTrigger: opportunitySuggestion.shouldSuggest ? opportunitySuggestion : null
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      result = { suggestions: [] };
    }

    // Validate and clean suggestions
    const validActions = ["reply_now", "create_opportunity", "send_proposal", "schedule_followup", "assign_conversation"];
    const validatedSuggestions = (result.suggestions || [])
      .filter((s: any) => validActions.includes(s.action))
      .slice(0, 4)
      .map((s: any) => ({
        action: s.action,
        reason: s.reason || "",
        priority: ["high", "medium", "low"].includes(s.priority) ? s.priority : "medium",
        context: s.context || null,
      }));

    // Ensure create_opportunity is suggested if triggers are detected and not already suggested
    if (opportunitySuggestion.shouldSuggest && 
        !validatedSuggestions.some((s: any) => s.action === 'create_opportunity')) {
      validatedSuggestions.unshift({
        action: 'create_opportunity',
        reason: opportunitySuggestion.reason,
        priority: opportunitySuggestion.priority,
        context: opportunitySuggestion.prefillData.context || null,
      });
    }

    return new Response(
      JSON.stringify({ 
        suggestions: validatedSuggestions.slice(0, 4),
        opportunityTrigger: opportunitySuggestion.shouldSuggest ? {
          ...opportunitySuggestion,
          triggers: triggerAnalysis.triggers,
        } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-inbox-actions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: [],
        opportunityTrigger: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
