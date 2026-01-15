import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  sourceId: string;
  sourceType: 'url' | 'document' | 'manual';
  content?: string;
  url?: string;
  knowledgeBaseType: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProcessRequest = await req.json();
    const { sourceId, sourceType, content, url, knowledgeBaseType } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let rawContent = content || '';

    // If URL, we would fetch content (simplified - in production use Firecrawl)
    if (sourceType === 'url' && url) {
      try {
        const response = await fetch(url);
        rawContent = await response.text();
        // Basic HTML stripping
        rawContent = rawContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 50000); // Limit content size
      } catch (e) {
        console.error('Error fetching URL:', e);
        rawContent = `Erro ao extrair conteúdo de ${url}`;
      }
    }

    const systemPrompt = `És um processador de conhecimento para CRM.
Analisa o conteúdo fornecido e extrai informação estruturada.

Contexto: Base de conhecimento do tipo "${knowledgeBaseType}"

Tarefas:
1. Resume o conteúdo principal em linguagem clara e humana
2. Identifica tópicos/conceitos-chave
3. Gera FAQs relevantes (perguntas e respostas)
4. Sugere melhorias de clareza se necessário

Regras:
- Nunca inventes informação
- Mantém a precisão do conteúdo original
- Usa linguagem simples e acessível
- Foca no que é útil para atendimento, vendas ou suporte

Responde em JSON:
{
  "processedContent": "Conteúdo processado e resumido...",
  "topics": ["tópico1", "tópico2"],
  "faqs": [
    { "question": "Pergunta?", "answer": "Resposta." }
  ],
  "suggestions": ["sugestão de melhoria se houver"],
  "summary": "Resumo em 2-3 frases"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Processa este conteúdo:\n\n${rawContent.slice(0, 30000)}` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
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
        processedContent: contentText,
        topics: [],
        faqs: [],
        suggestions: [],
        summary: contentText.slice(0, 200)
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        originalContent: rawContent.slice(0, 10000),
        processedContent: result.processedContent,
        topics: result.topics || [],
        faqs: result.faqs || [],
        suggestions: result.suggestions || [],
        summary: result.summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing knowledge:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
