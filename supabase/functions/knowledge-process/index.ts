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

async function extractUrlContent(url: string): Promise<string> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  
  // Try Firecrawl first for better extraction
  if (FIRECRAWL_API_KEY) {
    try {
      console.log("[KNOWLEDGE-PROCESS] Using Firecrawl for URL extraction:", url);
      
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000, // Wait for dynamic content
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const markdown = data.data?.markdown || data.markdown || "";
        
        if (markdown && markdown.length > 100) {
          console.log("[KNOWLEDGE-PROCESS] Firecrawl extracted:", markdown.length, "chars");
          return markdown;
        }
      } else {
        console.warn("[KNOWLEDGE-PROCESS] Firecrawl failed:", response.status);
      }
    } catch (e) {
      console.error("[KNOWLEDGE-PROCESS] Firecrawl error:", e);
    }
  }

  // Fallback to basic fetch
  console.log("[KNOWLEDGE-PROCESS] Using basic fetch for URL extraction");
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    
    let html = await response.text();
    
    // Better HTML stripping
    html = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    return html;
  } catch (e) {
    console.error("[KNOWLEDGE-PROCESS] Basic fetch error:", e);
    return `Erro ao extrair conteúdo de ${url}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProcessRequest = await req.json();
    const { sourceId, sourceType, content, url, knowledgeBaseType } = body;

    console.log("[KNOWLEDGE-PROCESS] Processing:", { sourceId, sourceType, url, knowledgeBaseType });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let rawContent = content || '';

    // Extract content from URL using best available method
    if (sourceType === 'url' && url) {
      rawContent = await extractUrlContent(url);
      console.log("[KNOWLEDGE-PROCESS] Extracted content length:", rawContent.length);
    }

    // Expanded prompt for product pages
    const systemPrompt = `És um processador de conhecimento para CRM.
Analisa o conteúdo fornecido e extrai TODA a informação estruturada disponível.

Contexto: Base de conhecimento do tipo "${knowledgeBaseType}"

IMPORTANTE: Extrai TODOS os detalhes relevantes, incluindo:
- Preços, valores, custos
- Datas, horários, durações
- Localizações, moradas
- Requisitos, pré-requisitos
- Certificações, acreditações
- Público-alvo
- Metodologias, conteúdos programáticos
- Formadores, instrutores
- Materiais incluídos
- Formas de pagamento
- Contactos

Tarefas:
1. Resume o conteúdo principal preservando TODOS os dados específicos (preços, datas, etc.)
2. Identifica tópicos/conceitos-chave
3. Gera FAQs relevantes com respostas completas baseadas no conteúdo
4. Sugere melhorias de clareza se necessário

Regras:
- Nunca inventes informação
- Mantém a precisão do conteúdo original
- PRESERVA números, preços, datas exatamente como aparecem
- Usa linguagem simples e acessível
- Foca no que é útil para atendimento, vendas ou suporte

Responde em JSON:
{
  "processedContent": "Conteúdo processado mantendo todos os detalhes específicos...",
  "topics": ["tópico1", "tópico2"],
  "faqs": [
    { "question": "Qual é o preço/valor?", "answer": "O valor é X€..." },
    { "question": "Quais são as datas?", "answer": "As datas são..." }
  ],
  "suggestions": ["sugestão de melhoria se houver"],
  "summary": "Resumo em 2-3 frases com dados principais"
}`;

    // Increase content limit for better extraction
    const contentToProcess = rawContent.slice(0, 60000);
    
    console.log("[KNOWLEDGE-PROCESS] Sending to AI, content size:", contentToProcess.length);

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
          { role: "user", content: `Processa este conteúdo e extrai TODA a informação disponível:\n\n${contentToProcess}` }
        ],
        temperature: 0.2,
        max_tokens: 8000
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

    console.log("[KNOWLEDGE-PROCESS] AI response length:", contentText.length);

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

    console.log("[KNOWLEDGE-PROCESS] Extracted FAQs:", result.faqs?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        originalContent: rawContent.slice(0, 15000),
        processedContent: result.processedContent,
        topics: result.topics || [],
        faqs: result.faqs || [],
        suggestions: result.suggestions || [],
        summary: result.summary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[KNOWLEDGE-PROCESS] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
