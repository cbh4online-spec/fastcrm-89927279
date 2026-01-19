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
    bestTimeToContact?: string;
  };
  warnings: string[];
}

// Extract company/page identifier from social media URLs
function extractIdentifierFromUrl(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    if (platform === "linkedin") {
      // /company/company-name/ or /in/person-name/
      const match = path.match(/\/(company|in)\/([^\/]+)/);
      return match ? match[2].replace(/-/g, " ") : null;
    } else if (platform === "facebook") {
      // /pagename or /pages/xxx/pagename
      const match = path.match(/\/([^\/]+)\/?$/);
      return match ? match[1] : null;
    } else if (platform === "instagram") {
      // /username/
      const match = path.match(/\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
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

    console.log("Analyzing social media for company:", companyId, companyName, {
      linkedin: linkedinUrl || null,
      instagram: instagramUrl || null,
      facebook: facebookUrl || null
    });

    // Extract identifiers from URLs
    const socialPresence: Record<string, any> = {};
    const warnings: string[] = [];

    if (linkedinUrl) {
      const identifier = extractIdentifierFromUrl(linkedinUrl, "linkedin");
      socialPresence.linkedin = {
        url: linkedinUrl,
        identifier,
        platform: "LinkedIn"
      };
    }

    if (facebookUrl) {
      const identifier = extractIdentifierFromUrl(facebookUrl, "facebook");
      socialPresence.facebook = {
        url: facebookUrl,
        identifier,
        platform: "Facebook"
      };
    }

    if (instagramUrl) {
      const identifier = extractIdentifierFromUrl(instagramUrl, "instagram");
      socialPresence.instagram = {
        url: instagramUrl,
        identifier,
        platform: "Instagram"
      };
    }

    // Use web search to find public information about the company
    const searchResults: Record<string, any> = {};
    
    const searchQuery = async (query: string, key: string) => {
      try {
        console.log(`Searching: ${query}`);
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 5,
            lang: "pt",
            scrapeOptions: {
              formats: ["markdown"]
            }
          }),
        });

        if (!response.ok) {
          console.error(`Search failed for ${key}:`, await response.text());
          return null;
        }

        const data = await response.json();
        return data.data || data.results || [];
      } catch (error) {
        console.error(`Error searching ${key}:`, error);
        return null;
      }
    };

    // Build search queries based on available information
    const searchPromises: Promise<void>[] = [];
    const searchName = companyName || socialPresence.linkedin?.identifier || socialPresence.facebook?.identifier || "empresa";

    // Search for company + LinkedIn info
    if (linkedinUrl) {
      searchPromises.push(
        searchQuery(`"${searchName}" LinkedIn site:linkedin.com`, "linkedin").then(results => {
          if (results && results.length > 0) {
            searchResults.linkedin = results;
          }
        })
      );
    }

    // Search for company decision makers
    searchPromises.push(
      searchQuery(`"${searchName}" CEO diretor fundador Portugal`, "decisionMakers").then(results => {
        if (results && results.length > 0) {
          searchResults.decisionMakers = results;
        }
      })
    );

    // Search for company news/activity
    searchPromises.push(
      searchQuery(`"${searchName}" empresa notícias recrutamento expansão`, "news").then(results => {
        if (results && results.length > 0) {
          searchResults.news = results;
        }
      })
    );

    await Promise.all(searchPromises);

    const hasAnySearchData = Object.keys(searchResults).length > 0;

    console.log("Search results found:", {
      linkedin: searchResults.linkedin?.length || 0,
      decisionMakers: searchResults.decisionMakers?.length || 0,
      news: searchResults.news?.length || 0
    });

    // Use AI to analyze available information
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context from URL presence and search results
    const platformsPresent = Object.keys(socialPresence).map(p => socialPresence[p].platform).join(", ");
    
    const searchContext = Object.entries(searchResults).map(([key, results]) => {
      if (!results || !Array.isArray(results)) return "";
      const content = results.slice(0, 3).map((r: any) => 
        `- ${r.title || "Sem título"}: ${(r.markdown || r.description || "").substring(0, 500)}`
      ).join("\n");
      return `\n### ${key.toUpperCase()}:\n${content}`;
    }).join("\n");

    const aiPrompt = `Analisa a presença digital desta empresa e gera insights comerciais para abordagem de vendas.

EMPRESA: ${companyName || "Nome não especificado"}

PRESENÇA EM REDES SOCIAIS DETECTADA:
${linkedinUrl ? `- LinkedIn: ${linkedinUrl}` : "- LinkedIn: Não tem"}
${facebookUrl ? `- Facebook: ${facebookUrl}` : "- Facebook: Não tem"}
${instagramUrl ? `- Instagram: ${instagramUrl}` : "- Instagram: Não tem"}

PLATAFORMAS PRESENTES: ${platformsPresent || "Nenhuma"}

${hasAnySearchData ? `INFORMAÇÃO ENCONTRADA NA WEB:${searchContext}` : "Não foi encontrada informação adicional na web."}

TAREFA:
1. Avalia a maturidade digital baseado na presença em redes sociais (se tem LinkedIn = empresa moderna, se tem Instagram = foco em marca/consumidor)
2. Identifica possíveis decisores mencionados na pesquisa
3. Sugere a melhor estratégia de abordagem comercial baseada nos canais disponíveis
4. Se tem LinkedIn, recomenda conectar lá primeiro
5. Identifica oportunidades de engagement baseadas em notícias ou atividade encontrada

IMPORTANTE: 
- Não inventes dados (seguidores, funcionários) se não tiveres informação concreta
- Foca em recomendações práticas de abordagem
- Se não há muita informação, sugere estratégia genérica baseada nos canais disponíveis`;

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
            content: "És um especialista em social selling e análise de redes sociais empresariais. Extrais insights comerciais para ajudar equipas de vendas a abordar empresas de forma inteligente. Responde em Português de Portugal. Sê prático e objetivo nas recomendações."
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
                    description: "Nível de maturidade digital baseado na presença em redes"
                  },
                  digitalMaturityReason: {
                    type: "string",
                    description: "Explicação breve da avaliação de maturidade digital"
                  },
                  linkedinData: {
                    type: "object",
                    properties: {
                      followers: { type: "number", description: "Só preencher se tiver dados concretos" },
                      employeeCount: { type: "number", description: "Só preencher se tiver dados concretos" },
                      recentActivity: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Atividades ou posts encontrados"
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
                        enum: ["linkedin", "email", "phone", "instagram"],
                        description: "Canal preferido para primeiro contacto"
                      },
                      approachStrategy: { 
                        type: "string", 
                        description: "Estratégia detalhada de abordagem (2-3 frases com ações concretas)" 
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
                        },
                        description: "Só incluir pessoas identificadas na pesquisa"
                      },
                      engagementOpportunities: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Oportunidades concretas para iniciar conversa"
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
    
    // Add informative warnings about limitations
    if (linkedinUrl) {
      warnings.push(`Perfil LinkedIn detectado: ${linkedinUrl} (detalhes via pesquisa web)`);
    }
    if (facebookUrl) {
      warnings.push(`Página Facebook detectada: ${facebookUrl} (detalhes via pesquisa web)`);
    }
    if (instagramUrl) {
      warnings.push(`Perfil Instagram detectado: ${instagramUrl} (detalhes via pesquisa web)`);
    }
    if (!hasAnySearchData) {
      warnings.push("Informação limitada encontrada na web - recomendamos análise manual dos perfis");
    }
    
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
