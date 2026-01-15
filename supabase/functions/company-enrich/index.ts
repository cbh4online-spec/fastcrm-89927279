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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website, email, companyName } = await req.json();

    if (!website && !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Website ou email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de enriquecimento não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the URL to scrape
    let targetUrl = website;
    if (!targetUrl && email) {
      const domain = extractDomainFromEmail(email);
      if (domain) {
        targetUrl = `https://${domain}`;
      }
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível determinar o website" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        onlyMainContent: false, // Include footer/contact info
        waitFor: 2000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Não foi possível aceder ao website",
          details: scrapeData.error 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      // Return what we have from scraping without AI analysis
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
            description: metadata.description ? {
              value: metadata.description,
              confidence: "medium" as const,
              source: "meta description"
            } : undefined
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        model: "google/gemini-2.5-flash",
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
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
            description: metadata.description ? {
              value: metadata.description,
              confidence: "medium" as const,
              source: "meta description"
            } : undefined
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let extractedData: Partial<EnrichmentResult> = {};
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        
        // Add source information to each field
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

    // Merge with social links
    const result: EnrichmentResult = {
      ...extractedData,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    };

    console.log("Enrichment complete:", result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
