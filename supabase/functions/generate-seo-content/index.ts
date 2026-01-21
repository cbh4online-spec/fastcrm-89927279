import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  entity_type: "keyword" | "template" | "category" | "tool" | "glossary" | "guide" | "blog";
  topic: string;
  intent?: "informational" | "commercial" | "transactional";
  language?: string;
  additional_context?: string;
}

interface SEOContent {
  title: string;
  meta_description: string;
  h1: string;
  tldr: string;
  sections: Array<{
    id: string;
    heading: string;
    content: string;
    type: "text" | "list" | "steps";
    items?: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    type: string;
    text: string;
    url: string;
  };
  schema_markup: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateRequest = await req.json();
    const { entity_type, topic, intent = "informational", language = "pt", additional_context } = body;

    if (!entity_type || !topic) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entity_type and topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt based on entity type
    const prompt = buildPrompt(entity_type, topic, intent, language, additional_context);

    // Call Lovable AI (Google Gemini)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate content", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = parseAIResponse(aiData, entity_type, topic);

    // Generate slug from topic
    const slug = generateSlug(topic);

    // Return the generated content
    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        metadata: {
          entity_type,
          slug,
          intent,
          language,
          generated_at: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSystemPrompt(language: string): string {
  const lang = language === "pt" ? "português de Portugal" : "English";
  
  return `Você é um especialista em SEO e copywriting. Gere conteúdo otimizado para SEO em ${lang}.

REGRAS IMPORTANTES:
1. Escreva conteúdo original, útil e de alta qualidade
2. Use linguagem natural e evite keyword stuffing
3. Inclua exemplos práticos e acionáveis
4. Mantenha parágrafos curtos (2-3 frases)
5. Use linguagem acessível mas profissional
6. Otimize para featured snippets quando apropriado
7. Inclua FAQs relevantes que respondam a perguntas reais
8. O conteúdo deve ser educativo e fornecer valor real

FORMATO DE RESPOSTA:
Responda SEMPRE em JSON válido com a estrutura exata solicitada.`;
}

function buildPrompt(
  entityType: string,
  topic: string,
  intent: string,
  language: string,
  additionalContext?: string
): string {
  const intentDescriptions = {
    informational: "O utilizador quer aprender ou entender o tema",
    commercial: "O utilizador está a comparar opções antes de comprar",
    transactional: "O utilizador está pronto para tomar uma ação",
  };

  const entityInstructions: Record<string, string> = {
    keyword: `Crie uma página de conteúdo SEO sobre a keyword "${topic}". 
Deve explicar o conceito, dar exemplos práticos, e mostrar como usar na prática.`,
    
    template: `Crie conteúdo para uma página de template sobre "${topic}".
Explique o que é o template, quando usar, benefícios, e inclua instruções de uso.`,
    
    category: `Crie conteúdo para uma categoria de "${topic}".
Apresente uma visão geral da categoria, principais subcategorias, e guie o utilizador.`,
    
    tool: `Crie conteúdo para uma ferramenta gratuita de "${topic}".
Explique o que faz, benefícios, como usar, e casos de uso práticos.`,
    
    glossary: `Crie uma definição de glossário para o termo "${topic}".
Dê uma definição clara, contexto, exemplos de uso, e termos relacionados.`,
    
    guide: `Crie um guia passo-a-passo sobre "${topic}".
Estruture em secções lógicas com passos claros e acionáveis.`,
    
    blog: `Crie um artigo de blog sobre "${topic}".
Forneça insights valiosos, dados quando relevante, e conclusões práticas.`,
  };

  return `${entityInstructions[entityType] || `Crie conteúdo SEO sobre "${topic}".`}

CONTEXTO:
- Tipo de entidade: ${entityType}
- Intenção de busca: ${intentDescriptions[intent as keyof typeof intentDescriptions] || intent}
- Idioma: ${language === "pt" ? "Português de Portugal" : "English"}
${additionalContext ? `- Contexto adicional: ${additionalContext}` : ""}

GERE A SEGUINTE ESTRUTURA JSON:
{
  "title": "Título SEO (máximo 60 caracteres)",
  "meta_description": "Meta description (máximo 155 caracteres)",
  "h1": "Título principal H1 da página",
  "tldr": "Resumo executivo em 2-3 frases",
  "sections": [
    {
      "id": "section-1",
      "heading": "Título da secção H2",
      "content": "Conteúdo em HTML simples (pode usar <p>, <strong>, <em>)",
      "type": "text"
    },
    {
      "id": "section-2", 
      "heading": "Título para lista",
      "type": "list",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "faqs": [
    {
      "question": "Pergunta frequente?",
      "answer": "Resposta clara e completa."
    }
  ],
  "cta": {
    "type": "signup",
    "text": "Texto do botão CTA",
    "url": "/auth"
  }
}

Gere pelo menos 3 secções e 3 FAQs relevantes.`;
}

function parseAIResponse(aiData: any, entityType: string, topic: string): SEOContent {
  try {
    // Extract content from AI response
    let content = aiData.choices?.[0]?.message?.content || aiData.content || "";
    
    // If content is a string, try to parse as JSON
    if (typeof content === "string") {
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      content = JSON.parse(content);
    }

    // Validate and return the content
    return {
      title: content.title || `${topic} - Guia Completo`,
      meta_description: content.meta_description || `Descubra tudo sobre ${topic}. Guia completo com exemplos práticos.`,
      h1: content.h1 || topic,
      tldr: content.tldr || `Aprenda sobre ${topic} de forma simples e prática.`,
      sections: content.sections || [
        {
          id: "intro",
          heading: "Introdução",
          content: `<p>Conteúdo sobre ${topic}.</p>`,
          type: "text",
        },
      ],
      faqs: content.faqs || [
        {
          question: `O que é ${topic}?`,
          answer: `${topic} é um conceito importante que...`,
        },
      ],
      cta: content.cta || {
        type: "signup",
        text: "Começar Grátis",
        url: "/auth",
      },
      schema_markup: generateSchemaMarkup(entityType, content, topic),
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    // Return fallback content
    return {
      title: `${topic} - Guia Completo`,
      meta_description: `Descubra tudo sobre ${topic}. Guia completo com exemplos práticos.`,
      h1: topic,
      tldr: `Aprenda sobre ${topic} de forma simples e prática.`,
      sections: [
        {
          id: "intro",
          heading: "Introdução",
          content: `<p>Conteúdo sobre ${topic}.</p>`,
          type: "text",
        },
      ],
      faqs: [
        {
          question: `O que é ${topic}?`,
          answer: `${topic} é um conceito importante.`,
        },
      ],
      cta: {
        type: "signup",
        text: "Começar Grátis",
        url: "/auth",
      },
      schema_markup: {},
    };
  }
}

function generateSchemaMarkup(entityType: string, content: any, topic: string): Record<string, unknown> {
  const baseSchema = {
    "@context": "https://schema.org",
  };

  switch (entityType) {
    case "glossary":
      return {
        ...baseSchema,
        "@type": "DefinedTerm",
        name: topic,
        description: content.tldr || content.meta_description,
      };
    
    case "tool":
      return {
        ...baseSchema,
        "@type": "SoftwareApplication",
        name: topic,
        description: content.meta_description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
      };
    
    case "guide":
    case "blog":
      return {
        ...baseSchema,
        "@type": "Article",
        headline: content.h1 || topic,
        description: content.meta_description,
        author: {
          "@type": "Organization",
          name: "FastCRM",
        },
      };
    
    default:
      return {
        ...baseSchema,
        "@type": "WebPage",
        name: content.title || topic,
        description: content.meta_description,
      };
  }
}

function generateSlug(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens
    .trim();
}
