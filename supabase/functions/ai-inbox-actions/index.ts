import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    status?: string;
    source?: string;
    tags?: string[];
  };
  opportunityData?: {
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { messages, leadData, opportunityData, proposalData, conversationData } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversation for context
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

AÇÕES DISPONÍVEIS:
- reply_now: Responder agora (quando cliente aguarda resposta)
- create_opportunity: Criar oportunidade (quando há interesse/pedido de orçamento)
- send_proposal: Enviar proposta (quando há oportunidade sem proposta)
- schedule_followup: Agendar follow-up (quando conversa precisa de acompanhamento)
- assign_conversation: Atribuir conversa (quando precisa de especialista/responsável)

CONTEXTO ADICIONAL:
${leadData ? `- Lead: ${leadData.name || 'Desconhecido'}, Status: ${leadData.status || 'novo'}` : ''}
${opportunityData ? `- Oportunidade: ${opportunityData.title}, Valor: €${opportunityData.value}, Etapa: ${opportunityData.stage}` : '- Sem oportunidade criada'}
${proposalData ? `- Propostas: ${proposalData.count} enviadas, Aceite: ${proposalData.hasAccepted ? 'Sim' : 'Não'}` : '- Sem propostas'}
${conversationData ? `- Canal: ${conversationData.channel}, Horas desde última msg: ${conversationData.hoursSinceLastMessage || 0}` : ''}
${isAwaitingReply ? '- CLIENTE AGUARDA RESPOSTA' : '- Última mensagem foi da equipa'}

FORMATO DE RESPOSTA (JSON):
{
  "suggestions": [
    {
      "action": "action_type",
      "reason": "razão específica baseada na conversa (máximo 20 palavras)",
      "priority": "high|medium|low",
      "context": "dado adicional se relevante (ex: valor mencionado)"
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later.", suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits.", suggestions: [] }),
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

    return new Response(
      JSON.stringify({ suggestions: validatedSuggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-inbox-actions:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
