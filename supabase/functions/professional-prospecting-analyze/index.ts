
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileData {
  profileUrl: string;
  profileName?: string;
  profileBio?: string;
  profileLink?: string;
  profileImageUrl?: string;
  platform?: string;
}

interface AnalysisResult {
  type: "individual" | "clinic" | "company" | "unknown";
  profession: string | null;
  specialty: string | null;
  location: string | null;
  workplace: string | null;
  confidence: number;
  leadScore: number;
  leadScoreExplanation: string;
  leadScoreFactors: {
    positive: string[];
    negative: string[];
  };
}

interface ExtractedContacts {
  email: string | null;
  phone: string | null;
  source: "bio" | "external_link" | "website" | null;
}

// Extract email and phone from text using regex
function extractContactsFromText(text: string | null | undefined): { email: string | null; phone: string | null } {
  if (!text) return { email: null, phone: null };
  
  // Email regex - common patterns
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i);
  
  // Portuguese phone patterns:
  // +351 xxx xxx xxx, +351xxxxxxxxx, 9xxxxxxxx, 2xxxxxxxx
  // Also international: +xx xxx xxx xxx
  const phonePatterns = [
    /(?:\+351\s?)?(?:9[1-9]\d|2[1-9]\d)\s?\d{3}\s?\d{3}/g,  // PT format with optional +351
    /\+351\s?\d{3}\s?\d{3}\s?\d{3}/g,                       // +351 format
    /(?:\+\d{1,3}\s?)?\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}/g,    // International format
  ];
  
  let phone: string | null = null;
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean and normalize phone number
      phone = match[0].replace(/[\s.-]/g, "").replace(/^\+/, "+");
      break;
    }
  }
  
  return {
    email: emailMatch?.[1] || null,
    phone,
  };
}

// Extract contacts from WhatsApp links
function extractWhatsAppNumber(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // WhatsApp link patterns: wa.me/XXXXX, api.whatsapp.com/send?phone=XXXXX
  const waMatch = url.match(/wa\.me\/(\+?\d+)/i) || 
                  url.match(/whatsapp\.com\/send\?phone=(\+?\d+)/i) ||
                  url.match(/api\.whatsapp\.com\/.*phone=(\+?\d+)/i);
  
  if (waMatch) {
    const number = waMatch[1];
    // Add + if not present
    return number.startsWith("+") ? number : `+${number}`;
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profiles, workspaceId, searchId, autoEnrichInstagram } = await req.json();

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Profiles array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Workspace ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check usage limits
    const { data: usage, error: usageError } = await supabase.rpc(
      "get_or_create_prospecting_usage",
      { p_workspace_id: workspaceId }
    );

    if (usageError) {
      console.error("Error getting usage:", usageError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check usage limits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remainingProfiles = usage.profiles_analyzed_limit - usage.profiles_analyzed_count;
    if (remainingProfiles <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Monthly profile analysis limit reached",
          usage: {
            analyzed: usage.profiles_analyzed_count,
            limit: usage.profiles_analyzed_limit
          }
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit profiles to remaining quota
    const limitedProfiles = profiles.slice(0, Math.min(profiles.length, remainingProfiles));

    // Second layer: filter out already converted/rejected profiles to avoid wasting credits
    const profileUrls = limitedProfiles.map((p: ProfileData) => p.profileUrl);
    const { data: existingInDb } = await supabase
      .from("professional_prospecting_profiles")
      .select("profile_url, status")
      .eq("workspace_id", workspaceId)
      .in("profile_url", profileUrls);

    const alreadyProcessed = new Set(
      (existingInDb || [])
        .filter((p: any) => p.status === "converted" || p.status === "rejected")
        .map((p: any) => p.profile_url)
    );

    const profilesToAnalyze = limitedProfiles.filter(
      (p: ProfileData) => !alreadyProcessed.has(p.profileUrl)
    );

    console.log(`Filtered ${alreadyProcessed.size} already processed profiles, analyzing ${profilesToAnalyze.length}`);

    const results: any[] = [];

    // Analyze each profile with AI
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const canEnrichInstagram = !!RAPIDAPI_KEY && autoEnrichInstagram !== false;

    for (const profile of profilesToAnalyze) {
      try {
        const analysis = await analyzeProfile(profile, LOVABLE_API_KEY);
        const platform = detectPlatform(profile.profileUrl);
        
        // Prepare profile data
        const profileData: any = {
          workspace_id: workspaceId,
          search_id: searchId || null,
          profile_url: profile.profileUrl,
          platform,
          profile_name: profile.profileName || null,
          profile_bio: profile.profileBio || null,
          profile_link: profile.profileLink || null,
          profile_image_url: profile.profileImageUrl || null,
          raw_data: profile,
          ai_analysis: analysis,
          inferred_type: analysis.type,
          inferred_profession: analysis.profession,
          inferred_specialty: analysis.specialty,
          inferred_location: analysis.location,
          inferred_workplace: analysis.workplace,
          confidence_score: analysis.confidence,
          lead_score: analysis.leadScore,
          lead_score_explanation: analysis.leadScoreExplanation,
          lead_score_factors: analysis.leadScoreFactors,
          status: "analyzed",
          analyzed_at: new Date().toISOString(),
        };

        // Extract contacts from bio/link
        let extractedContacts: ExtractedContacts = { email: null, phone: null, source: null };
        
        // First try to extract from bio
        const bioContacts = extractContactsFromText(profile.profileBio);
        if (bioContacts.email || bioContacts.phone) {
          extractedContacts = { ...bioContacts, source: "bio" };
        }
        
        // Check for WhatsApp link
        if (!extractedContacts.phone && profile.profileLink) {
          const waNumber = extractWhatsAppNumber(profile.profileLink);
          if (waNumber) {
            extractedContacts.phone = waNumber;
            extractedContacts.source = extractedContacts.source || "external_link";
          }
        }

        // Auto-enrich Instagram profiles
        if (canEnrichInstagram && platform === "instagram") {
          try {
            const enrichedData = await enrichInstagramProfile(profile.profileUrl, RAPIDAPI_KEY);
            if (enrichedData) {
              profileData.instagram_followers_count = enrichedData.followersCount;
              profileData.instagram_following_count = enrichedData.followingCount;
              profileData.instagram_posts_count = enrichedData.postsCount;
              profileData.instagram_full_bio = enrichedData.fullBio;
              profileData.instagram_external_url = enrichedData.externalUrl;
              profileData.instagram_category = enrichedData.category;
              profileData.instagram_is_verified = enrichedData.isVerified;
              profileData.instagram_is_business = enrichedData.isBusiness;
              profileData.instagram_enriched_at = new Date().toISOString();
              profileData.instagram_raw_data = enrichedData.rawData;
              // Update profile data with enriched values
              if (enrichedData.fullName) profileData.profile_name = enrichedData.fullName;
              if (enrichedData.fullBio) profileData.profile_bio = enrichedData.fullBio;
              if (enrichedData.profilePicUrl) profileData.profile_image_url = enrichedData.profilePicUrl;
              
              // Try to extract contacts from enriched bio (more complete)
              if (enrichedData.fullBio) {
                const enrichedBioContacts = extractContactsFromText(enrichedData.fullBio);
                if (!extractedContacts.email && enrichedBioContacts.email) {
                  extractedContacts.email = enrichedBioContacts.email;
                  extractedContacts.source = "bio";
                }
                if (!extractedContacts.phone && enrichedBioContacts.phone) {
                  extractedContacts.phone = enrichedBioContacts.phone;
                  extractedContacts.source = extractedContacts.source || "bio";
                }
              }
              
              // Check external URL for WhatsApp
              if (!extractedContacts.phone && enrichedData.externalUrl) {
                const waNumber = extractWhatsAppNumber(enrichedData.externalUrl);
                if (waNumber) {
                  extractedContacts.phone = waNumber;
                  extractedContacts.source = extractedContacts.source || "external_link";
                }
              }
            }
          } catch (enrichError) {
            console.error("Error enriching Instagram profile:", profile.profileUrl, enrichError);
          }
        }
        
        // Add extracted contacts to profile data
        if (extractedContacts.email) {
          profileData.extracted_email = extractedContacts.email;
        }
        if (extractedContacts.phone) {
          profileData.extracted_phone = extractedContacts.phone;
        }
        if (extractedContacts.source) {
          profileData.contact_source = extractedContacts.source;
        }
        
        console.log(`Extracted contacts for ${profile.profileName}: email=${extractedContacts.email}, phone=${extractedContacts.phone}`);
        
        // Store in database
        const { data: savedProfile, error: saveError } = await supabase
          .from("professional_prospecting_profiles")
          .upsert(profileData, {
            onConflict: "workspace_id,profile_url"
          })
          .select()
          .single();

        if (saveError) {
          console.error("Error saving profile:", saveError);
        }

        results.push({
          profileUrl: profile.profileUrl,
          success: true,
          analysis,
          savedProfile
        });
      } catch (error) {
        console.error("Error analyzing profile:", profile.profileUrl, error);
        results.push({
          profileUrl: profile.profileUrl,
          success: false,
          error: error instanceof Error ? error.message : "Analysis failed"
        });
      }
    }

    // Update usage count
    const successCount = results.filter(r => r.success).length;
    await supabase
      .from("professional_prospecting_usage")
      .update({ 
        profiles_analyzed_count: usage.profiles_analyzed_count + successCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", usage.id);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: successCount,
        total: profiles.length,
        limitedTo: profilesToAnalyze.length,
        results,
        usage: {
          analyzed: usage.profiles_analyzed_count + successCount,
          limit: usage.profiles_analyzed_limit
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in professional-prospecting-analyze:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Instagram API constants
const RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com";
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}`;

// Function to enrich Instagram profile with API data
async function enrichInstagramProfile(profileUrl: string, apiKey: string): Promise<{
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  fullBio: string | null;
  externalUrl: string | null;
  category: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  fullName: string | null;
  profilePicUrl: string | null;
  rawData: any;
} | null> {
  // Extract username from URL
  const urlMatch = profileUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  if (!urlMatch) return null;
  const username = urlMatch[1];

  try {
    const url = `${RAPIDAPI_URL}/profile?username=${encodeURIComponent(username)}`;
    console.log("Enriching Instagram profile:", username);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      console.error("Instagram API error:", response.status);
      return null;
    }

    const apiData = await response.json();
    const profileData = apiData.data || apiData;

    return {
      followersCount: profileData.follower_count || profileData.edge_followed_by?.count || null,
      followingCount: profileData.following_count || profileData.edge_follow?.count || null,
      postsCount: profileData.media_count || profileData.edge_owner_to_timeline_media?.count || null,
      fullBio: profileData.biography || null,
      externalUrl: profileData.external_url || null,
      category: profileData.category_name || profileData.category || null,
      isVerified: profileData.is_verified || false,
      isBusiness: profileData.is_business_account || profileData.is_professional_account || false,
      fullName: profileData.full_name || null,
      profilePicUrl: profileData.profile_pic_url_hd || profileData.profile_pic_url || null,
      rawData: profileData,
    };
  } catch (error) {
    console.error("Error fetching Instagram profile:", error);
    return null;
  }
}

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("facebook.com")) return "facebook";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  return "other";
}

async function analyzeProfile(profile: ProfileData, apiKey: string): Promise<AnalysisResult> {
  const platform = profile.platform || detectPlatform(profile.profileUrl);
  
  const systemPrompt = `És um analista de perfis profissionais em redes sociais (${platform === "facebook" ? "Facebook" : "Instagram"}).
Com base apenas em dados públicos fornecidos, identifica se o perfil representa:
- Um profissional individual (médico, dentista, advogado, etc.)
- Uma clínica ou consultório
- Uma empresa/organização
- Desconhecido/incerto

Extrai:
1. Tipo de perfil (individual/clinic/company/unknown)
2. Profissão provável (se individual)
3. Especialidade (se aplicável)
4. Localização inferida (cidade/região)
5. Local de trabalho mencionado (clínica, empresa)
6. Score de confiança (0.0 a 1.0)
7. Lead Score (0 a 100) baseado em:
   - Perfil ativo e profissional
   - Profissão claramente descrita
   - Especialidade definida
   - Link profissional presente
   - Linguagem profissional
   - Consistência de conteúdo

CONTEXTO ESPECÍFICO:
${platform === "facebook" ? `
- Estás a analisar uma página Facebook (geralmente negócio/profissional)
- Páginas Facebook costumam ter descrições mais formais
- Considera que pode ser uma página de negócio de um profissional individual
` : `
- Estás a analisar um perfil Instagram
- Perfis podem ser mais informais mas profissionais usam bio estruturada
- Procura indicadores como "📍", "🩺", "📞" na bio
`}

REGRAS:
- Nunca inventes dados que não estejam no input
- Sempre indica nível de confiança
- Explica as inferências
- Se não conseguires determinar algo, retorna null
- Deteta a língua/país do perfil a partir da bio, nome, URL ou localização
- Inclui um campo "detectedLanguage" (ex: "pt", "en", "es", "fr") na tua resposta JSON com o código ISO da língua predominante do perfil`;

  const userPrompt = `Analisa este perfil profissional:

URL: ${profile.profileUrl}
Nome: ${profile.profileName || "Não disponível"}
Bio: ${profile.profileBio || "Não disponível"}
Link na bio: ${profile.profileLink || "Não disponível"}

Retorna a análise no formato especificado.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_professional_profile",
            description: "Analyze a professional profile and return structured data",
            parameters: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["individual", "clinic", "company", "unknown"],
                  description: "Type of profile"
                },
                profession: {
                  type: "string",
                  nullable: true,
                  description: "Inferred profession"
                },
                specialty: {
                  type: "string",
                  nullable: true,
                  description: "Professional specialty"
                },
                location: {
                  type: "string",
                  nullable: true,
                  description: "Inferred location (city/region)"
                },
                workplace: {
                  type: "string",
                  nullable: true,
                  description: "Mentioned workplace (clinic, company)"
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                  description: "Confidence score 0-1"
                },
                leadScore: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                  description: "Lead score 0-100"
                },
                leadScoreExplanation: {
                  type: "string",
                  description: "Brief explanation of the lead score"
                },
                positiveFactors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Positive factors for lead score"
                },
                negativeFactors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Negative factors for lead score"
                }
              },
              required: ["type", "confidence", "leadScore", "leadScoreExplanation", "positiveFactors", "negativeFactors"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "analyze_professional_profile" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || !toolCall.function?.arguments) {
    throw new Error("Invalid AI response format");
  }

  const args = JSON.parse(toolCall.function.arguments);
  
  return {
    type: args.type || "unknown",
    profession: args.profession || null,
    specialty: args.specialty || null,
    location: args.location || null,
    workplace: args.workplace || null,
    confidence: args.confidence || 0.5,
    leadScore: args.leadScore || 50,
    leadScoreExplanation: args.leadScoreExplanation || "Análise inconclusiva",
    leadScoreFactors: {
      positive: args.positiveFactors || [],
      negative: args.negativeFactors || []
    }
  };
}
