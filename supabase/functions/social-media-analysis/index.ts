import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialMediaAnalysis {
  digitalMaturity: "low" | "medium" | "high";
  digitalMaturityReason: string;
  linkedinData?: {
    followers: number | null;
    employeeCount: number | null;
    recentActivity: string[];
    keyPeople: Array<{ name: string; role: string; profileUrl?: string }>;
    industries: string[];
    specialties: string[];
    description: string | null;
  };
  instagramData?: {
    followers: number | null;
    postsCount: number | null;
    contentType: string;
    recentActivity: string[];
  };
  facebookData?: {
    followers: number | null;
    rating: number | null;
    reviewsCount: number | null;
    recentActivity: string[];
  };
  salesInsights: {
    preferredChannel: "linkedin" | "email" | "phone" | "instagram";
    approachStrategy: string;
    keyDecisionMakers: Array<{ name: string; role: string; linkedinUrl?: string }>;
    engagementOpportunities: string[];
    bestTimeToContact: string;
  };
  warnings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { companyId, linkedinUrl, instagramUrl, facebookUrl, companyName } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "ID da empresa é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasSocialUrls = linkedinUrl || instagramUrl || facebookUrl;
    if (!hasSocialUrls) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Nenhum URL de rede social fornecido" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing social media for company:", companyId, {
      linkedin: !!linkedinUrl,
      instagram: !!instagramUrl,
      facebook: !!facebookUrl
    });

    // Scrape social media profiles
    const scrapeResults: Record<string, any> = {};
    const warnings: string[] = [];

    const scrapeUrl = async (url: string, platform: string) => {
      try {
        console.log(`Scraping ${platform}:`, url);
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
            waitFor: 3000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to scrape ${platform}:`, errorText);
          warnings.push(`Não foi possível aceder ao perfil de ${platform}`);
          return null;
        }

        const data = await response.json();
        return data.data?.markdown || data.markdown || null;
      } catch (error) {
        console.error(`Error scraping ${platform}:`, error);
        warnings.push(`Erro ao analisar ${platform}`);
        return null;
      }
    };

    // Scrape all available profiles in parallel
    const scrapePromises: Promise<void>[] = [];

    if (linkedinUrl) {
      scrapePromises.push(
        scrapeUrl(linkedinUrl, "LinkedIn").then(content => {
          if (content) scrapeResults.linkedin = content;
        })
      );
    }

    if (instagramUrl) {
      scrapePromises.push(
        scrapeUrl(instagramUrl, "Instagram").then(content => {
          if (content) scrapeResults.instagram = content;
        })
      );
    }

    if (facebookUrl) {
      scrapePromises.push(
        scrapeUrl(facebookUrl, "Facebook").then(content => {
          if (content) scrapeResults.facebook = content;
        })
      );
    }

    await Promise.all(scrapePromises);

    const hasAnyData = Object.keys(scrapeResults).length > 0;

    if (!hasAnyData) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            digitalMaturity: "low",
            digitalMaturityReason: "Não foi possível aceder aos perfis de redes sociais",
            salesInsights: {
              preferredChannel: "email",
              approachStrategy: "Contactar por email ou telefone, redes sociais não acessíveis",
              keyDecisionMakers: [],
              engagementOpportunities: [],
              bestTimeToContact: "Horário laboral"
            },
            warnings
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to analyze the scraped content
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiPrompt = `Analisa os perfis de redes sociais desta empresa e gera insights comerciais.

EMPRESA: ${companyName || "Desconhecida"}

${scrapeResults.linkedin ? `
--- LINKEDIN ---
${scrapeResults.linkedin.substring(0, 8000)}
` : "LinkedIn: Não disponível"}

${scrapeResults.instagram ? `
--- INSTAGRAM ---
${scrapeResults.instagram.substring(0, 4000)}
` : "Instagram: Não disponível"}

${scrapeResults.facebook ? `
--- FACEBOOK ---
${scrapeResults.facebook.substring(0, 4000)}
` : "Facebook: Não disponível"}

TAREFA:
1. Avalia a maturidade digital da empresa (baixa, média, alta)
2. Extrai informações relevantes de cada rede social
3. Identifica decisores-chave (CEO, diretores, responsáveis)
4. Sugere a melhor estratégia de abordagem comercial
5. Identifica oportunidades de engagement (posts recentes, eventos, contratações)`;

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
            content: "És um especialista em social selling e análise de redes sociais empresariais. Extrais insights comerciais para ajudar equipas de vendas a abordar empresas de forma inteligente. Responde em Português de Portugal."
          },
          { role: "user", content: aiPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_social_analysis",
              description: "Gera análise de redes sociais e insights comerciais",
              parameters: {
                type: "object",
                properties: {
                  digitalMaturity: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Nível de maturidade digital"
                  },
                  digitalMaturityReason: {
                    type: "string",
                    description: "Explicação da avaliação de maturidade digital"
                  },
                  linkedinData: {
                    type: "object",
                    properties: {
                      followers: { type: "number" },
                      employeeCount: { type: "number" },
                      recentActivity: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Posts ou atividades recentes relevantes"
                      },
                      keyPeople: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            role: { type: "string" },
                            profileUrl: { type: "string" }
                          }
                        }
                      },
                      industries: { type: "array", items: { type: "string" } },
                      specialties: { type: "array", items: { type: "string" } },
                      description: { type: "string" }
                    }
                  },
                  instagramData: {
                    type: "object",
                    properties: {
                      followers: { type: "number" },
                      postsCount: { type: "number" },
                      contentType: { type: "string", description: "product, lifestyle, corporate, mixed" },
                      recentActivity: { type: "array", items: { type: "string" } }
                    }
                  },
                  facebookData: {
                    type: "object",
                    properties: {
                      followers: { type: "number" },
                      rating: { type: "number" },
                      reviewsCount: { type: "number" },
                      recentActivity: { type: "array", items: { type: "string" } }
                    }
                  },
                  salesInsights: {
                    type: "object",
                    properties: {
                      preferredChannel: { 
                        type: "string", 
                        enum: ["linkedin", "email", "phone", "instagram"] 
                      },
                      approachStrategy: { 
                        type: "string", 
                        description: "Estratégia detalhada de abordagem (2-3 frases)" 
                      },
                      keyDecisionMakers: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            role: { type: "string" },
                            linkedinUrl: { type: "string" }
                          }
                        }
                      },
                      engagementOpportunities: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Oportunidades concretas para iniciar conversa (posts, eventos, etc)"
                      },
                      bestTimeToContact: { type: "string" }
                    },
                    required: ["preferredChannel", "approachStrategy", "keyDecisionMakers", "engagementOpportunities"]
                  }
                },
                required: ["digitalMaturity", "digitalMaturityReason", "salesInsights"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_social_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI analysis failed:", errorText);
      throw new Error("Falha na análise AI");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta AI inválida");
    }

    const analysis: SocialMediaAnalysis = JSON.parse(toolCall.function.arguments);
    analysis.warnings = warnings;

    console.log("Social media analysis completed for:", companyId);

    return new Response(
      JSON.stringify({ success: true, data: analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Social media analysis error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro na análise"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
