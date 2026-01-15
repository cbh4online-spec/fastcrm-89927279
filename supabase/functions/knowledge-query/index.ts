import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueryRequest {
  query: string;
  context: string; // inbox, vendas, suporte, etc
  personaId?: string;
  knowledgeBaseIds?: string[];
  knowledgeEntries: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
  }>;
  persona?: {
    name: string;
    toneOfVoice: string;
    technicalDepth: string;
    systemPrompt?: string;
    limitations?: string[];
  };
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: QueryRequest = await req.json();
    const { query, context, knowledgeEntries, persona, conversationHistory } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build knowledge context
    let knowledgeContext = "";
    if (knowledgeEntries && knowledgeEntries.length > 0) {
      knowledgeContext = "\n\n## Base de Conhecimento Disponível:\n";
      knowledgeEntries.forEach((entry, i) => {
        knowledgeContext += `\n### ${i + 1}. ${entry.title}\n${entry.content}\n`;
      });
    }

    // Build persona prompt
    let personaPrompt = persona?.systemPrompt || 
      "És um assistente de CRM inteligente. Ajudas com atendimento, vendas e suporte.";
    
    if (persona) {
      personaPrompt += `\n\nTom de voz: ${persona.toneOfVoice}`;
      personaPrompt += `\nProfundidade técnica: ${persona.technicalDepth}`;
      
      if (persona.limitations && persona.limitations.length > 0) {
        personaPrompt += `\n\nLimitações (NÃO fazer):\n${persona.limitations.map(l => `- ${l}`).join('\n')}`;
      }
    }

    const systemPrompt = `${personaPrompt}

Contexto atual: ${context}
${knowledgeContext}

## Regras Críticas:
1. APENAS responde com informação da base de conhecimento acima
2. Se não tiveres informação suficiente, diz claramente
3. Nunca inventes informação
4. Mantém respostas claras, empáticas e humanas
5. Se a pergunta for sensível ou complexa, sugere contacto humano

Responde em JSON:
{
  "response": "A tua resposta clara e humana...",
  "confidence": 0.85,
  "sourceEntryIds": ["id1", "id2"],
  "needsHumanReview": false,
  "suggestedActions": ["ação sugerida se aplicável"]
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: query }
    ];

    const startTime = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.5,
        max_tokens: 1500
      }),
    });

    const responseTimeMs = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "Estou temporariamente sobrecarregado. Por favor, tenta novamente.",
            confidence: 0,
            needsHumanReview: true,
            error: "rate_limit"
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const contentText = aiResponse.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = contentText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        contentText.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, contentText];
      result = JSON.parse(jsonMatch[1] || contentText);
    } catch {
      result = {
        response: contentText,
        confidence: 0.5,
        sourceEntryIds: [],
        needsHumanReview: true,
        suggestedActions: []
      };
    }

    // If confidence is low, flag for human review
    if (result.confidence < 0.6) {
      result.needsHumanReview = true;
      result.response += "\n\n_Vou confirmar esta informação com um especialista._";
    }

    return new Response(
      JSON.stringify({
        ...result,
        responseTimeMs,
        responseSource: knowledgeEntries.length > 0 ? 'knowledge_base' : 'fallback'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error querying knowledge:", error);
    return new Response(
      JSON.stringify({ 
        response: "Ocorreu um erro. Por favor, tenta novamente ou contacta suporte.",
        confidence: 0,
        needsHumanReview: true,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
