
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileAnalysisInput {
  username: string;
  full_name?: string;
  biography?: string;
  external_url?: string;
  followers_count?: number;
  following_count?: number;
  media_count?: number;
  is_business?: boolean;
  is_verified?: boolean;
  category?: string;
  recent_captions?: string[];
  recent_hashtags?: string[];
  city_name?: string;
}

interface MediaAnalysisInput {
  caption: string;
  hashtags?: string[];
  posted_at?: string;
  niche_context?: string;
}

interface ProfileAnalysisOutput {
  is_individual: boolean;
  category_guess: string;
  specialty_guess: string;
  city_guess: string;
  works_at: string | null;
  contact_signals: string[];
  confidence: number;
  reasons: string[];
  red_flags: string[];
  lead_score: number;
  lead_score_breakdown: {
    activity: number;
    clarity: number;
    location: number;
    contact: number;
    communication: number;
  };
  posting_frequency: string;
  avg_engagement: number;
  last_post_days_ago: number;
}

interface MediaAnalysisOutput {
  content_type: string;
  tone: string;
  has_cta: boolean;
  approach_suggestion: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, data, workspace_id } = body;

    // Verify workspace access
    const { data: memberData, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "No workspace access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only editors and admins can analyze
    if (memberData.role === "viewer") {
      return new Response(JSON.stringify({ error: "Viewers cannot analyze profiles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    if (action === "analyze_profile") {
      result = await analyzeProfile(data as ProfileAnalysisInput);
    } else if (action === "analyze_media") {
      result = await analyzeMedia(data as MediaAnalysisInput);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Track usage
    await trackUsage(supabase, workspace_id, user.id, "ai_analysis");

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Analysis error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeProfile(input: ProfileAnalysisInput): Promise<ProfileAnalysisOutput> {
  // Build analysis based on available data
  const bio = input.biography?.toLowerCase() || "";
  const name = input.full_name?.toLowerCase() || "";
  const captions = input.recent_captions?.join(" ").toLowerCase() || "";
  const hashtags = input.recent_hashtags || [];
  
  // Detect professional signals
  const professionalKeywords = {
    dentist: ["dentista", "dentistry", "dental", "ortodontia", "orthodontic", "smile", "teeth", "dentes", "sorriso", "clínica dental", "dr.", "dra."],
    hairdresser: ["cabelereiro", "cabeleireira", "hair", "cabelo", "salon", "salão", "colorista", "hairstylist", "corte", "mechas", "balayage"],
    aesthetician: ["esteticista", "estética", "beauty", "beleza", "skincare", "facial", "tratamento", "massagem", "spa", "limpeza de pele"],
    nutritionist: ["nutricionista", "nutrição", "nutrition", "dieta", "alimentação", "healthy", "saúde", "emagrecimento"],
    physiotherapist: ["fisioterapeuta", "fisioterapia", "physiotherapy", "reabilitação", "pilates", "postura"],
    psychologist: ["psicólogo", "psicóloga", "psicologia", "psychology", "terapia", "mental health", "saúde mental"],
    doctor: ["médico", "médica", "doctor", "dr.", "dra.", "medicina", "clínica", "consultório"],
    lawyer: ["advogado", "advogada", "lawyer", "direito", "jurídico", "legal"],
    personal_trainer: ["personal trainer", "personal", "fitness", "treino", "gym", "musculação", "academia"],
  };

  let detectedCategory = "unknown";
  let maxScore = 0;
  const allText = `${bio} ${name} ${captions} ${hashtags.join(" ")}`.toLowerCase();

  for (const [category, keywords] of Object.entries(professionalKeywords)) {
    const score = keywords.filter(k => allText.includes(k)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }

  // Determine if individual or business
  const businessSignals = ["clínica", "clinic", "salão", "salon", "centro", "center", "studio", "estúdio", "empresa", "company"];
  const isBusinessSignal = businessSignals.some(s => allText.includes(s));
  const isIndividual = !isBusinessSignal || allText.includes("dr.") || allText.includes("dra.") || allText.includes("@");

  // Extract city
  const portugalCities = ["lisboa", "porto", "braga", "coimbra", "faro", "setúbal", "aveiro", "leiria", "viseu", "évora", "funchal", "guimarães", "cascais", "sintra", "amadora", "almada", "oeiras", "matosinhos", "gondomar", "vila nova de gaia"];
  let cityGuess = input.city_name || "unknown";
  if (cityGuess === "unknown") {
    for (const city of portugalCities) {
      if (allText.includes(city)) {
        cityGuess = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }
  }

  // Contact signals
  const contactSignals: string[] = [];
  if (input.external_url) {
    if (input.external_url.includes("wa.me") || input.external_url.includes("whatsapp")) {
      contactSignals.push("WhatsApp link");
    }
    if (input.external_url.includes("linktr.ee") || input.external_url.includes("linktree")) {
      contactSignals.push("Linktree");
    }
    if (input.external_url.includes("calendly") || input.external_url.includes("booking")) {
      contactSignals.push("Booking link");
    }
    if (!contactSignals.length) {
      contactSignals.push("Website link");
    }
  }
  if (bio.includes("email") || bio.includes("@") && bio.includes(".com")) {
    contactSignals.push("Email na bio");
  }
  if (bio.includes("whatsapp") || bio.includes("📱") || bio.includes("📞")) {
    contactSignals.push("WhatsApp mencionado");
  }

  // Calculate lead score
  const activityScore = Math.min(25, (input.media_count || 0) > 50 ? 25 : ((input.media_count || 0) / 50) * 25);
  const clarityScore = Math.min(25, maxScore * 5);
  const locationScore = cityGuess !== "unknown" ? 15 : 0;
  const contactScore = Math.min(15, contactSignals.length * 5);
  const communicationScore = Math.min(20, input.is_business ? 15 : 10 + (input.biography?.length || 0 > 100 ? 5 : 0));

  const leadScore = Math.round(activityScore + clarityScore + locationScore + contactScore + communicationScore);

  // Reasons
  const reasons: string[] = [];
  if (maxScore > 0) reasons.push(`Palavras-chave profissionais detectadas: ${detectedCategory}`);
  if (input.is_business) reasons.push("Conta business/profissional");
  if (input.is_verified) reasons.push("Conta verificada");
  if (contactSignals.length > 0) reasons.push(`Sinais de contacto: ${contactSignals.join(", ")}`);
  if (cityGuess !== "unknown") reasons.push(`Localização identificada: ${cityGuess}`);

  // Red flags
  const redFlags: string[] = [];
  if ((input.followers_count || 0) < 100) redFlags.push("Poucos seguidores");
  if ((input.media_count || 0) < 10) redFlags.push("Pouco conteúdo publicado");
  if (!input.biography) redFlags.push("Bio vazia");
  if (maxScore === 0) redFlags.push("Sem sinais profissionais claros");

  // Specialty guess
  let specialtyGuess = "Geral";
  if (detectedCategory === "dentist") {
    if (allText.includes("ortodontia") || allText.includes("orthodontic")) specialtyGuess = "Ortodontia";
    else if (allText.includes("implant")) specialtyGuess = "Implantes";
    else if (allText.includes("estética") || allText.includes("aesthetic")) specialtyGuess = "Estética Dental";
  } else if (detectedCategory === "hairdresser") {
    if (allText.includes("colorista") || allText.includes("color")) specialtyGuess = "Coloração";
    else if (allText.includes("corte") || allText.includes("cut")) specialtyGuess = "Cortes";
    else if (allText.includes("noiva") || allText.includes("bride")) specialtyGuess = "Noivas";
  }

  // Calculate posting frequency
  let postingFrequency = "unknown";
  if (input.media_count) {
    if (input.media_count > 500) postingFrequency = "Muito ativo (500+ posts)";
    else if (input.media_count > 200) postingFrequency = "Ativo (200-500 posts)";
    else if (input.media_count > 50) postingFrequency = "Moderado (50-200 posts)";
    else postingFrequency = "Baixo (<50 posts)";
  }

  // Confidence calculation
  const confidence = Math.min(1, (maxScore * 0.15) + (reasons.length * 0.1) + (contactSignals.length > 0 ? 0.15 : 0) + (cityGuess !== "unknown" ? 0.1 : 0));

  // Works at
  let worksAt: string | null = null;
  const clinicMatch = allText.match(/(?:clínica|clinic|salão|salon|centro|studio)\s+[\w\s]{2,30}/);
  if (clinicMatch) {
    worksAt = clinicMatch[0].trim();
    worksAt = worksAt.charAt(0).toUpperCase() + worksAt.slice(1);
  }

  return {
    is_individual: isIndividual,
    category_guess: detectedCategory === "unknown" ? "Não identificado" : 
      detectedCategory.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    specialty_guess: specialtyGuess,
    city_guess: cityGuess,
    works_at: worksAt,
    contact_signals: contactSignals,
    confidence: Math.round(confidence * 100) / 100,
    reasons,
    red_flags: redFlags,
    lead_score: leadScore,
    lead_score_breakdown: {
      activity: Math.round(activityScore),
      clarity: Math.round(clarityScore),
      location: locationScore,
      contact: contactScore,
      communication: communicationScore,
    },
    posting_frequency: postingFrequency,
    avg_engagement: 0, // Would need actual engagement data
    last_post_days_ago: 0, // Would need actual post dates
  };
}

async function analyzeMedia(input: MediaAnalysisInput): Promise<MediaAnalysisOutput> {
  const caption = input.caption?.toLowerCase() || "";
  const hashtags = input.hashtags?.join(" ").toLowerCase() || "";
  const allText = `${caption} ${hashtags}`;

  // Detect content type
  let contentType = "outro";
  if (allText.includes("antes") && allText.includes("depois") || allText.includes("before") && allText.includes("after")) {
    contentType = "antes_depois";
  } else if (allText.includes("resultado") || allText.includes("result") || allText.includes("cliente") || allText.includes("paciente")) {
    contentType = "prova_social";
  } else if (allText.includes("dica") || allText.includes("tip") || allText.includes("sabia") || allText.includes("aprenda") || allText.includes("como")) {
    contentType = "educativo";
  } else if (allText.includes("promoção") || allText.includes("desconto") || allText.includes("oferta") || allText.includes("agenda") || allText.includes("marque")) {
    contentType = "promo";
  } else if (allText.includes("bastidores") || allText.includes("behind") || allText.includes("dia a dia") || allText.includes("rotina")) {
    contentType = "bastidores";
  }

  // Detect tone
  const formalIndicators = ["prezado", "cordialmente", "atenciosamente", "informamos", "comunicamos"];
  const informalIndicators = ["😀", "😍", "💪", "🔥", "haha", "kkk", "rs", "!!", "gente", "vocês", "vc"];
  
  const formalScore = formalIndicators.filter(i => allText.includes(i)).length;
  const informalScore = informalIndicators.filter(i => allText.includes(i)).length;
  const tone = formalScore > informalScore ? "formal" : "informal";

  // Detect CTA
  const ctaIndicators = ["agende", "marque", "ligue", "entre em contato", "clique", "link na bio", "saiba mais", "fale conosco", "whatsapp", "reserve", "garanta"];
  const hasCta = ctaIndicators.some(i => allText.includes(i));

  // Generate approach suggestion
  let approachSuggestion = "";
  if (contentType === "prova_social") {
    approachSuggestion = "Perfil focado em resultados - abordar mostrando como pode ajudar a alcançar mais clientes satisfeitos";
  } else if (contentType === "educativo") {
    approachSuggestion = "Profissional que valoriza educação - abordar com conteúdo de valor e parcerias educativas";
  } else if (contentType === "promo") {
    approachSuggestion = "Perfil comercial ativo - abordar com propostas diretas de valor agregado";
  } else if (contentType === "antes_depois") {
    approachSuggestion = "Demonstra resultados visuais - abordar com foco em ferramentas que destaquem transformações";
  } else if (contentType === "bastidores") {
    approachSuggestion = "Valoriza autenticidade - abordar de forma pessoal e genuína";
  } else {
    approachSuggestion = "Analisar mais conteúdo para definir melhor abordagem";
  }

  return {
    content_type: contentType,
    tone,
    has_cta: hasCta,
    approach_suggestion: approachSuggestion,
  };
}

async function trackUsage(supabase: any, workspaceId: string, userId: string, actionType: string) {
  const today = new Date().toISOString().split("T")[0];
  
  const { data: existing } = await supabase
    .from("ig_looter_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  if (existing) {
    const updateField = actionType === "ai_analysis" ? "ai_analyses_count" : "actions_count";
    await supabase
      .from("ig_looter_usage")
      .update({ 
        [updateField]: (existing[updateField] || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("ig_looter_usage")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        usage_date: today,
        ai_analyses_count: actionType === "ai_analysis" ? 1 : 0,
        actions_count: actionType !== "ai_analysis" ? 1 : 0,
      });
  }
}
