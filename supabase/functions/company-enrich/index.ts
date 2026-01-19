import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  industry?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  size?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  phone?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  email?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  address?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  description?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  website?: { value: string; confidence: "high" | "medium" | "low"; source: string };
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}

function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : null;
}

function normalizeWebsite(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

// Enrich using only company name via AI
async function enrichFromNameOnly(companyName: string, LOVABLE_API_KEY: string): Promise<EnrichmentResult> {
  const aiPrompt = `Pesquisa informações públicas sobre a empresa "${companyName}" em Portugal.

Tenta encontrar:
- Setor de atividade
- Website oficial (se conheceres)
- Descrição breve da empresa
- Possíveis redes sociais

IMPORTANTE: Só inclui informações que tenhas alta confiança que estão corretas. 
Se não tiveres certeza, não inventes dados.
Marca a confiança como "low" para informações que não tens a certeza.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "És um assistente especializado em pesquisar informações sobre empresas portuguesas. Responde sempre usando a ferramenta fornecida. Sê conservador - só extrai informação que tenhas confiança razoável."
        },
        { role: "user", content: aiPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_company_info",
            description: "Extrai informações estruturadas sobre uma empresa",
            parameters: {
              type: "object",
              properties: {
                industry: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                website: {
                  type: "object",
                  properties: {
                    value: { type: "string", description: "URL do website oficial" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                description: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                linkedin: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_company_info" } }
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("AI enrichment from name failed:", errorText);
    throw new Error("Falha na pesquisa por IA");
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  const result: EnrichmentResult = {};
  
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      if (parsed.industry?.value) {
        result.industry = { ...parsed.industry, source: "AI knowledge" };
      }
      if (parsed.website?.value) {
        result.website = { ...parsed.website, source: "AI knowledge" };
      }
      if (parsed.description?.value) {
        result.description = { ...parsed.description, source: "AI knowledge" };
      }
      if (parsed.linkedin?.value) {
        result.socialLinks = { linkedin: parsed.linkedin.value };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }
  }

  return result;
}

// Enrich from website scraping
async function enrichFromWebsite(
  targetUrl: string, 
  companyName: string,
  FIRECRAWL_API_KEY: string,
  LOVABLE_API_KEY: string | undefined
): Promise<EnrichmentResult> {
  const normalizedUrl = normalizeWebsite(targetUrl);
  console.log("Enriching company from:", normalizedUrl);

  // Scrape the website using Firecrawl
  const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: normalizedUrl,
      formats: ["markdown", "links"],
      onlyMainContent: false,
      waitFor: 2000,
    }),
  });

  const scrapeData = await scrapeResponse.json();

  if (!scrapeResponse.ok || !scrapeData.success) {
    console.error("Firecrawl error:", scrapeData);
    throw new Error("Não foi possível aceder ao website");
  }

  const pageContent = scrapeData.data?.markdown || "";
  const pageLinks = scrapeData.data?.links || [];
  const metadata = scrapeData.data?.metadata || {};

  // Extract social links from page links
  const socialLinks: EnrichmentResult["socialLinks"] = {};
  for (const link of pageLinks) {
    if (link.includes("linkedin.com")) socialLinks.linkedin = link;
    if (link.includes("instagram.com")) socialLinks.instagram = link;
    if (link.includes("facebook.com")) socialLinks.facebook = link;
    if (link.includes("twitter.com") || link.includes("x.com")) socialLinks.twitter = link;
  }

  // Use AI to extract structured information
  if (!LOVABLE_API_KEY) {
    return {
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      description: metadata.description ? {
        value: metadata.description,
        confidence: "medium" as const,
        source: "meta description"
      } : undefined
    };
  }

  // AI extraction for more detailed analysis
  const aiPrompt = `Analisa o seguinte conteúdo de um website empresarial e extrai as informações relevantes.

Nome da empresa: ${companyName || "Desconhecido"}
URL: ${normalizedUrl}

Conteúdo do website:
${pageContent.slice(0, 8000)}

Extrai as seguintes informações SE estiverem claramente presentes no conteúdo. Não inventes dados.
Para cada campo que encontrares, indica também a tua confiança (high/medium/low).

Campos a extrair:
- industry: setor de atividade (ex: Tecnologia, Saúde, Finanças, etc.)
- size: tamanho da empresa se mencionado
- phone: número de telefone principal
- email: email de contacto geral
- address: morada física
- description: breve descrição da empresa (máx 2 frases)`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "És um assistente especializado em extrair informações empresariais de websites. Responde sempre em JSON válido. Sê conservador - só extrai informação que esteja claramente presente."
        },
        { role: "user", content: aiPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_company_info",
            description: "Extrai informações estruturadas sobre uma empresa",
            parameters: {
              type: "object",
              properties: {
                industry: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                size: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                phone: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                email: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                address: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                },
                description: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_company_info" } }
    }),
  });

  if (!aiResponse.ok) {
    console.error("AI extraction failed:", await aiResponse.text());
    return {
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      description: metadata.description ? {
        value: metadata.description,
        confidence: "medium" as const,
        source: "meta description"
      } : undefined
    };
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  let extractedData: Partial<EnrichmentResult> = {};
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      if (parsed.industry?.value) {
        extractedData.industry = { ...parsed.industry, source: "website content" };
      }
      if (parsed.size?.value) {
        extractedData.size = { ...parsed.size, source: "website content" };
      }
      if (parsed.phone?.value) {
        extractedData.phone = { ...parsed.phone, source: "website content" };
      }
      if (parsed.email?.value) {
        extractedData.email = { ...parsed.email, source: "website content" };
      }
      if (parsed.address?.value) {
        extractedData.address = { ...parsed.address, source: "website content" };
      }
      if (parsed.description?.value) {
        extractedData.description = { ...parsed.description, source: "website content" };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }
  }

  return {
    ...extractedData,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website, email, companyName } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Determine enrichment strategy
    let targetUrl = website;
    if (!targetUrl && email) {
      const domain = extractDomainFromEmail(email);
      if (domain) {
        targetUrl = `https://${domain}`;
      }
    }

    // Strategy 1: If we have a website/email, scrape it
    if (targetUrl && FIRECRAWL_API_KEY) {
      try {
        const result = await enrichFromWebsite(targetUrl, companyName, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
        console.log("Enrichment from website complete:", result);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (scrapeError) {
        console.error("Website scraping failed, falling back to AI:", scrapeError);
        // Fall through to AI-only enrichment
      }
    }

    // Strategy 2: If we only have company name, use AI knowledge
    if (companyName && LOVABLE_API_KEY) {
      console.log("Enriching from company name only:", companyName);
      try {
        const result = await enrichFromNameOnly(companyName, LOVABLE_API_KEY);
        console.log("Enrichment from AI complete:", result);
        return new Response(
          JSON.stringify({ success: true, data: result, source: "ai_knowledge" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (aiError) {
        console.error("AI enrichment failed:", aiError);
        return new Response(
          JSON.stringify({ success: false, error: "Não foi possível obter informações sobre esta empresa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No valid enrichment source
    if (!companyName) {
      return new Response(
        JSON.stringify({ success: false, error: "É necessário pelo menos o nome da empresa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Serviço de enriquecimento não está disponível" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro ao enriquecer dados"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
