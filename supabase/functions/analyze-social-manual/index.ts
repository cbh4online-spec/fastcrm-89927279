import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      companyId, 
      companyName, 
      workspaceId,
      linkedinText,
      employeesText,
      facebookText,
      instagramText,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      currentCompanyData
    } = await req.json();

    if (!companyId || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if we have any text to analyze
    const hasContent = linkedinText || employeesText || facebookText || instagramText;
    if (!hasContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided for analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt for AI analysis
    const prompt = buildAnalysisPrompt(companyName, linkedinText, employeesText, facebookText, instagramText, currentCompanyData);

    // Call Lovable AI for analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: getSystemPrompt() },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_social_data",
              description: "Extract structured social media data from the provided text",
              parameters: {
                type: "object",
                properties: {
                  linkedin: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Company description/about text" },
                      industry: { type: "string", description: "Industry/sector" },
                      size: { type: "string", description: "Company size range (e.g., 11-50, 51-200)" },
                      headquarters: { type: "string", description: "Location/headquarters" },
                      website: { type: "string", description: "Website URL" },
                      foundedYear: { type: "number", description: "Year founded" },
                      employeeCount: { type: "number", description: "Number of employees" },
                      followersCount: { type: "number", description: "Number of followers" },
                      specialties: { type: "array", items: { type: "string" }, description: "Company specialties/services" },
                      tagline: { type: "string", description: "Company tagline/slogan" },
                      postsPerMonth: { type: "number", description: "Estimated posts per month" },
                      activityLevel: { type: "string", enum: ["low", "medium", "high"], description: "Activity level based on posting frequency" }
                    }
                  },
                  employees: {
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
                    description: "List of key employees/contacts found"
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
                      contentType: { type: "string", enum: ["product", "corporate", "lifestyle"] }
                    }
                  },
                  dataSuggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "Field name to update (e.g., industry, size, website)" },
                        suggestedValue: { type: "string" },
                        source: { type: "string", enum: ["linkedin", "facebook", "instagram"] }
                      },
                      required: ["field", "suggestedValue", "source"]
                    },
                    description: "Suggestions for updating company data based on found information"
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
                    description: "Sales opportunities identified from the analysis"
                  }
                },
                required: ["linkedin", "employees", "dataSuggestions", "salesOpportunities"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_social_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(aiData));
      throw new Error('AI did not return structured data');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));

    // Save LinkedIn data if available
    if (extractedData.linkedin && (linkedinText || employeesText)) {
      const linkedinData = {
        company_id: companyId,
        workspace_id: workspaceId,
        linkedin_url: linkedinUrl || null,
        description: extractedData.linkedin.description || null,
        linkedin_industry: extractedData.linkedin.industry || null,
        company_size_range: extractedData.linkedin.size || null,
        headquarters: extractedData.linkedin.headquarters || null,
        linkedin_website: extractedData.linkedin.website || null,
        founded_year: extractedData.linkedin.foundedYear || null,
        employee_count_linkedin: extractedData.linkedin.employeeCount || null,
        followers_count: extractedData.linkedin.followersCount || null,
        specialties: extractedData.linkedin.specialties || [],
        tagline: extractedData.linkedin.tagline || null,
        posts_per_month: extractedData.linkedin.postsPerMonth || null,
        activity_level: extractedData.linkedin.activityLevel || 'unknown',
        key_people: extractedData.employees || [],
        suggested_contacts: extractedData.employees || [],
        data_suggestions: extractedData.dataSuggestions?.filter((s: any) => s.source === 'linkedin') || [],
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      };

      const { error: linkedinError } = await supabase
        .from('company_linkedin_data')
        .upsert(linkedinData, { onConflict: 'company_id' });

      if (linkedinError) {
        console.error('Error saving LinkedIn data:', linkedinError);
      }
    }

    // Save Facebook data if available
    if (extractedData.facebook && facebookText) {
      const facebookData = {
        company_id: companyId,
        workspace_id: workspaceId,
        facebook_url: facebookUrl || null,
        followers_count: extractedData.facebook.followersCount || null,
        likes_count: extractedData.facebook.likesCount || null,
        rating: extractedData.facebook.rating || null,
        reviews_count: extractedData.facebook.reviewsCount || null,
        about_text: extractedData.facebook.aboutText || null,
        page_category: extractedData.facebook.pageCategory || null,
        activity_level: extractedData.facebook.activityLevel || 'unknown',
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      };

      const { error: facebookError } = await supabase
        .from('company_facebook_data')
        .upsert(facebookData, { onConflict: 'company_id' });

      if (facebookError) {
        console.error('Error saving Facebook data:', facebookError);
      }
    }

    // Save Instagram data if available
    if (extractedData.instagram && instagramText) {
      const instagramData = {
        company_id: companyId,
        workspace_id: workspaceId,
        instagram_url: instagramUrl || null,
        followers_count: extractedData.instagram.followersCount || null,
        following_count: extractedData.instagram.followingCount || null,
        posts_count: extractedData.instagram.postsCount || null,
        bio: extractedData.instagram.bio || null,
        activity_level: extractedData.instagram.activityLevel || 'unknown',
        content_type: extractedData.instagram.contentType || null,
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      };

      const { error: instagramError } = await supabase
        .from('company_instagram_data')
        .upsert(instagramData, { onConflict: 'company_id' });

      if (instagramError) {
        console.error('Error saving Instagram data:', instagramError);
      }
    }

    // Build response
    const response = {
      success: true,
      data: {
        linkedin: extractedData.linkedin ? {
          ...extractedData.linkedin,
          keyPeople: extractedData.employees || [],
          activityLevel: extractedData.linkedin.activityLevel || 'unknown',
        } : null,
        facebook: extractedData.facebook || null,
        instagram: extractedData.instagram || null,
        suggestedContacts: extractedData.employees || [],
        dataSuggestions: extractedData.dataSuggestions || [],
        salesOpportunities: extractedData.salesOpportunities || [],
        digitalMaturity: calculateDigitalMaturity(extractedData),
        analyzedAt: new Date().toISOString(),
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-social-manual:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function getSystemPrompt(): string {
  return `Você é um especialista em análise de redes sociais empresariais. 
Sua tarefa é extrair dados estruturados de textos copiados de perfis do LinkedIn, Facebook e Instagram.

Regras importantes:
1. Extraia APENAS informações que estão explicitamente no texto
2. Para números (seguidores, funcionários), extraia o valor exato mencionado
3. Para funcionários/pessoas, extraia nome, cargo e URL do LinkedIn se disponível
4. Identifique oportunidades de venda baseadas em lacunas na presença digital
5. Sugira atualizações de dados da empresa apenas quando encontrar informação mais completa

Seja preciso e não invente dados que não estão no texto fornecido.`;
}

function buildAnalysisPrompt(
  companyName: string, 
  linkedinText?: string, 
  employeesText?: string,
  facebookText?: string, 
  instagramText?: string,
  currentCompanyData?: any
): string {
  let prompt = `Analise os seguintes dados de redes sociais da empresa "${companyName}":\n\n`;

  if (currentCompanyData) {
    prompt += `## Dados Atuais da Empresa:\n`;
    if (currentCompanyData.industry) prompt += `- Indústria: ${currentCompanyData.industry}\n`;
    if (currentCompanyData.website) prompt += `- Website: ${currentCompanyData.website}\n`;
    if (currentCompanyData.size) prompt += `- Tamanho: ${currentCompanyData.size}\n`;
    prompt += '\n';
  }

  if (linkedinText) {
    prompt += `## Texto do LinkedIn (Página "Sobre"):\n${linkedinText}\n\n`;
  }

  if (employeesText) {
    prompt += `## Lista de Funcionários/Pessoas do LinkedIn:\n${employeesText}\n\n`;
  }

  if (facebookText) {
    prompt += `## Texto do Facebook (Página "Sobre"):\n${facebookText}\n\n`;
  }

  if (instagramText) {
    prompt += `## Dados do Instagram (Bio e estatísticas):\n${instagramText}\n\n`;
  }

  prompt += `Extraia todos os dados estruturados possíveis e identifique oportunidades de venda de serviços de marketing digital.`;

  return prompt;
}

function calculateDigitalMaturity(data: any): { score: number; level: 'low' | 'medium' | 'high'; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // LinkedIn scoring
  if (data.linkedin) {
    if (data.linkedin.followersCount > 1000) {
      score += 20;
      reasons.push('boa audiência LinkedIn');
    } else if (data.linkedin.followersCount > 100) {
      score += 10;
    }
    if (data.linkedin.activityLevel === 'high') {
      score += 20;
      reasons.push('ativo no LinkedIn');
    } else if (data.linkedin.activityLevel === 'medium') {
      score += 10;
    }
    if (data.linkedin.description) score += 5;
    if (data.linkedin.specialties?.length > 0) score += 5;
  }

  // Facebook scoring
  if (data.facebook) {
    if (data.facebook.followersCount > 1000) {
      score += 15;
      reasons.push('boa audiência Facebook');
    } else if (data.facebook.followersCount > 100) {
      score += 7;
    }
    if (data.facebook.activityLevel === 'high') {
      score += 15;
    }
  }

  // Instagram scoring
  if (data.instagram) {
    if (data.instagram.followersCount > 1000) {
      score += 20;
      reasons.push('boa audiência Instagram');
    } else if (data.instagram.followersCount > 100) {
      score += 10;
    }
    if (data.instagram.activityLevel === 'high') {
      score += 15;
      reasons.push('ativo no Instagram');
    }
  }

  // Employees scoring
  if (data.employees?.length > 3) {
    score += 10;
    reasons.push('equipa identificada');
  }

  let level: 'low' | 'medium' | 'high';
  let reason: string;

  if (score >= 60) {
    level = 'high';
    reason = reasons.length > 0 ? `Empresa digitalmente madura: ${reasons.slice(0, 2).join(', ')}.` : 'Boa presença digital.';
  } else if (score >= 30) {
    level = 'medium';
    reason = 'Presença digital em desenvolvimento. Oportunidade para melhorias.';
  } else {
    level = 'low';
    reason = 'Baixa maturidade digital. Grande potencial para serviços de marketing digital.';
  }

  return { score: Math.min(score, 100), level, reason };
}
