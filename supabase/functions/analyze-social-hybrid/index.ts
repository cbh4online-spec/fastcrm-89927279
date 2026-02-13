import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  companyId: string;
  companyName: string;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinText?: string;
  employeesText?: string;
  facebookText?: string;
  instagramText?: string;
  workspaceId: string;
  currentCompanyData?: {
    industry?: string;
    website?: string;
    size?: string;
    employee_count?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: AnalysisRequest = await req.json();
    const {
      companyId,
      companyName,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      linkedinText,
      employeesText,
      facebookText,
      instagramText,
      workspaceId,
      currentCompanyData,
    } = body;

    if (!companyId || !workspaceId) {
      throw new Error("companyId and workspaceId are required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Starting hybrid analysis for company: ${companyName} (${companyId})`);

    // Step 1: Try Firecrawl scraping if API key exists and URLs are provided
    let scrapedData: {
      linkedin?: string;
      facebook?: string;
      instagram?: string;
    } = {};

    if (FIRECRAWL_API_KEY) {
      const scrapePromises: Promise<{ platform: string; content: string | null }>[] = [];

      if (linkedinUrl && !linkedinText) {
        scrapePromises.push(
          scrapeWithFirecrawl(linkedinUrl, FIRECRAWL_API_KEY).then(content => ({ platform: 'linkedin', content }))
        );
      }
      if (facebookUrl && !facebookText) {
        scrapePromises.push(
          scrapeWithFirecrawl(facebookUrl, FIRECRAWL_API_KEY).then(content => ({ platform: 'facebook', content }))
        );
      }
      if (instagramUrl && !instagramText) {
        scrapePromises.push(
          scrapeWithFirecrawl(instagramUrl, FIRECRAWL_API_KEY).then(content => ({ platform: 'instagram', content }))
        );
      }

      if (scrapePromises.length > 0) {
        const results = await Promise.allSettled(scrapePromises);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.content) {
            scrapedData[result.value.platform as keyof typeof scrapedData] = result.value.content;
          }
        }
      }
    }

    // Step 2: Combine all available data sources
    const combinedLinkedin = linkedinText || scrapedData.linkedin || '';
    const combinedFacebook = facebookText || scrapedData.facebook || '';
    const combinedInstagram = instagramText || scrapedData.instagram || '';

    // Step 3: Use AI to analyze and infer data
    const analysisPrompt = buildAnalysisPrompt({
      companyName,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      linkedinText: combinedLinkedin,
      employeesText: employeesText || '',
      facebookText: combinedFacebook,
      instagramText: combinedInstagram,
      currentCompanyData,
    });

    console.log("Calling Lovable AI for analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `És um especialista em análise de presença digital de empresas. Analisa os dados fornecidos e extrai informações estruturadas sobre a presença nas redes sociais.

IMPORTANTE:
- Se não houver dados de uma plataforma, usa os URLs fornecidos para inferir informações públicas básicas
- Sê conservador nas estimativas quando não tens dados concretos
- Identifica oportunidades de venda de serviços de marketing digital
- Retorna SEMPRE JSON válido`
          },
          { role: "user", content: analysisPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_social_analysis",
            description: "Guarda a análise estruturada das redes sociais",
            parameters: {
              type: "object",
              properties: {
                linkedin: {
                  type: "object",
                  properties: {
                    description: { type: "string", description: "Descrição da empresa" },
                    industry: { type: "string", description: "Indústria/setor" },
                    size: { type: "string", description: "Tamanho (1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+)" },
                    headquarters: { type: "string", description: "Sede" },
                    website: { type: "string", description: "Website" },
                    founded: { type: "number", description: "Ano de fundação" },
                    employeeCount: { type: "number", description: "Número de funcionários" },
                    followersCount: { type: "number", description: "Número de seguidores" },
                    specialties: { type: "array", items: { type: "string" }, description: "Especialidades" },
                    activityLevel: { type: "string", enum: ["low", "medium", "high"], description: "Nível de atividade" },
                    engagementScore: { type: "number", description: "Score de engagement 0-100" }
                  }
                },
                facebook: {
                  type: "object",
                  properties: {
                    followersCount: { type: "number" },
                    likesCount: { type: "number" },
                    rating: { type: "number" },
                    reviewsCount: { type: "number" },
                    aboutText: { type: "string" },
                    pageCategory: { type: "string" },
                    activityLevel: { type: "string", enum: ["low", "medium", "high"] }
                  }
                },
                instagram: {
                  type: "object",
                  properties: {
                    followersCount: { type: "number" },
                    followingCount: { type: "number" },
                    postsCount: { type: "number" },
                    bio: { type: "string" },
                    activityLevel: { type: "string", enum: ["low", "medium", "high"] },
                    contentType: { type: "string", enum: ["product", "corporate", "lifestyle"] },
                    engagementRate: { type: "number" }
                  }
                },
                keyPeople: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      role: { type: "string" },
                      linkedinUrl: { type: "string" }
                    },
                    required: ["name", "role"]
                  },
                  description: "Pessoas chave identificadas"
                },
                dataSuggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      currentValue: { type: "string" },
                      suggestedValue: { type: "string" },
                      source: { type: "string" }
                    },
                    required: ["field", "suggestedValue", "source"]
                  },
                  description: "Sugestões de atualização para a ficha da empresa"
                },
                salesOpportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      service: { type: "string" }
                    },
                    required: ["type", "severity", "title", "description", "service"]
                  },
                  description: "Oportunidades de venda identificadas"
                },
                digitalMaturity: {
                  type: "object",
                  properties: {
                    score: { type: "number", description: "Score 0-100" },
                    level: { type: "string", enum: ["low", "medium", "high"] },
                    reason: { type: "string" }
                  },
                  required: ["score", "level", "reason"]
                },
                dataSource: {
                  type: "string",
                  enum: ["scraped", "manual", "inferred", "mixed"],
                  description: "Origem principal dos dados"
                }
              },
              required: ["digitalMaturity", "dataSource"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "save_social_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("AI analysis completed:", JSON.stringify(analysis, null, 2).substring(0, 500));

    // Step 4: Save to database
    const now = new Date().toISOString();

    // Save LinkedIn data
    if (analysis.linkedin || linkedinUrl) {
      await supabase.from("company_linkedin_data").upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        linkedin_url: linkedinUrl,
        description: analysis.linkedin?.description || null,
        linkedin_industry: analysis.linkedin?.industry || null,
        company_size_range: analysis.linkedin?.size || null,
        headquarters: analysis.linkedin?.headquarters || null,
        linkedin_website: analysis.linkedin?.website || null,
        founded_year: analysis.linkedin?.founded || null,
        employee_count_linkedin: analysis.linkedin?.employeeCount || null,
        followers_count: analysis.linkedin?.followersCount || null,
        specialties: analysis.linkedin?.specialties || [],
        key_people: analysis.keyPeople || [],
        activity_level: analysis.linkedin?.activityLevel || 'unknown',
        engagement_score: analysis.linkedin?.engagementScore || null,
        data_suggestions: analysis.dataSuggestions || [],
        suggested_contacts: analysis.keyPeople || [],
        analysis_status: "completed",
        analyzed_at: now,
      }, { onConflict: "company_id" });
    }

    // Save Facebook data
    if (analysis.facebook || facebookUrl) {
      await supabase.from("company_facebook_data").upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        facebook_url: facebookUrl,
        followers_count: analysis.facebook?.followersCount || null,
        likes_count: analysis.facebook?.likesCount || null,
        rating: analysis.facebook?.rating || null,
        reviews_count: analysis.facebook?.reviewsCount || null,
        about_text: analysis.facebook?.aboutText || null,
        page_category: analysis.facebook?.pageCategory || null,
        activity_level: analysis.facebook?.activityLevel || 'unknown',
        analysis_status: "completed",
        analyzed_at: now,
      }, { onConflict: "company_id" });
    }

    // Save Instagram data
    if (analysis.instagram || instagramUrl) {
      await supabase.from("company_instagram_data").upsert({
        company_id: companyId,
        workspace_id: workspaceId,
        instagram_url: instagramUrl,
        followers_count: analysis.instagram?.followersCount || null,
        following_count: analysis.instagram?.followingCount || null,
        posts_count: analysis.instagram?.postsCount || null,
        bio: analysis.instagram?.bio || null,
        activity_level: analysis.instagram?.activityLevel || 'unknown',
        content_type: analysis.instagram?.contentType || null,
        engagement_rate: analysis.instagram?.engagementRate || null,
        analysis_status: "completed",
        analyzed_at: now,
      }, { onConflict: "company_id" });
    }

    // Build response
    const response = {
      linkedin: analysis.linkedin ? {
        ...analysis.linkedin,
        url: linkedinUrl,
        keyPeople: analysis.keyPeople || [],
        recentPosts: [],
        postsPerMonth: null,
        lastPostDate: null,
      } : null,
      facebook: analysis.facebook ? {
        ...analysis.facebook,
        url: facebookUrl,
        hasRecentPosts: analysis.facebook?.activityLevel === 'high',
      } : null,
      instagram: analysis.instagram ? {
        ...analysis.instagram,
        url: instagramUrl,
      } : null,
      digitalMaturity: analysis.digitalMaturity,
      dataSuggestions: analysis.dataSuggestions || [],
      salesOpportunities: analysis.salesOpportunities || [],
      suggestedContacts: analysis.keyPeople || [],
      analyzedAt: now,
      dataSource: analysis.dataSource,
    };

    return new Response(
      JSON.stringify({ success: true, data: response }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Hybrid analysis error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string | null> {
  try {
    console.log(`Attempting to scrape: ${url}`);
    
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      console.log(`Firecrawl failed for ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || '';
    
    if (markdown.length < 100) {
      console.log(`Firecrawl returned minimal data for ${url}`);
      return null;
    }

    console.log(`Firecrawl success for ${url}: ${markdown.length} chars`);
    return markdown.substring(0, 15000); // Limit to 15k chars
  } catch (error) {
    console.error(`Firecrawl error for ${url}:`, error);
    return null;
  }
}

function buildAnalysisPrompt(data: {
  companyName: string;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinText: string;
  employeesText: string;
  facebookText: string;
  instagramText: string;
  currentCompanyData?: {
    industry?: string;
    website?: string;
    size?: string;
    employee_count?: number;
  };
}): string {
  const parts: string[] = [];

  parts.push(`# Análise de Redes Sociais: ${data.companyName}`);
  parts.push("");

  if (data.currentCompanyData) {
    parts.push("## Dados Atuais da Empresa");
    if (data.currentCompanyData.industry) parts.push(`- Indústria: ${data.currentCompanyData.industry}`);
    if (data.currentCompanyData.website) parts.push(`- Website: ${data.currentCompanyData.website}`);
    if (data.currentCompanyData.size) parts.push(`- Tamanho: ${data.currentCompanyData.size}`);
    if (data.currentCompanyData.employee_count) parts.push(`- Funcionários: ${data.currentCompanyData.employee_count}`);
    parts.push("");
  }

  parts.push("## URLs das Redes Sociais");
  if (data.linkedinUrl) parts.push(`- LinkedIn: ${data.linkedinUrl}`);
  if (data.facebookUrl) parts.push(`- Facebook: ${data.facebookUrl}`);
  if (data.instagramUrl) parts.push(`- Instagram: ${data.instagramUrl}`);
  parts.push("");

  if (data.linkedinText) {
    parts.push("## Dados do LinkedIn (copiados ou scrapeados)");
    parts.push(data.linkedinText.substring(0, 8000));
    parts.push("");
  }

  if (data.employeesText) {
    parts.push("## Lista de Funcionários");
    parts.push(data.employeesText.substring(0, 5000));
    parts.push("");
  }

  if (data.facebookText) {
    parts.push("## Dados do Facebook");
    parts.push(data.facebookText.substring(0, 5000));
    parts.push("");
  }

  if (data.instagramText) {
    parts.push("## Dados do Instagram");
    parts.push(data.instagramText.substring(0, 5000));
    parts.push("");
  }

  const hasAnyData = data.linkedinText || data.employeesText || data.facebookText || data.instagramText;

  parts.push("## Instruções");
  if (hasAnyData) {
    parts.push("Analisa os dados fornecidos e extrai informações estruturadas.");
  } else {
    parts.push("Não foram fornecidos dados das páginas. Usa os URLs para inferir informações básicas públicas conhecidas sobre esta empresa.");
    parts.push("Sê conservador - indica apenas informações que são provavelmente corretas com base no nome e URLs.");
  }

  parts.push("");
  parts.push("Identifica:");
  parts.push("1. Métricas de cada plataforma (seguidores, engagement, atividade)");
  parts.push("2. Pessoas chave (gestores, diretores, fundadores)");
  parts.push("3. Oportunidades de venda de serviços (marketing digital, gestão de redes, tráfego pago)");
  parts.push("4. Sugestões de atualização da ficha (se encontrares dados melhores que os atuais)");
  parts.push("5. Score de maturidade digital (0-100)");

  return parts.join("\n");
}
