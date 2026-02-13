import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecommendationRequest {
  workspaceId: string;
  action: "generate" | "explain" | "generate_message" | "batch_generate" | "generate_contact_message";
  profileId?: string;
  courseId?: string;
  profileIds?: string[];
  messageType?: "general" | "course_invite" | "reactivation" | "followup";
}

interface ScoreBreakdown {
  thematic_fit: number;
  progression_fit: number;
  timing_fit: number;
  profile_fit: number;
  activation_fit: number;
  similarity_bonus: number;
  penalties: number;
  total: number;
}

interface MatchReason {
  type: string;
  text: string;
  weight: number;
}

const LEVEL_ORDER: Record<string, number> = {
  foundation: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body: RecommendationRequest = await req.json();
    const { workspaceId, action, profileId, courseId, profileIds, messageType } = body;

    // Fetch all active courses with new fields
    const { data: courses, error: coursesError } = await supabase
      .from("sj_courses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (coursesError) throw coursesError;

    if (action === "generate" && profileId) {
      // Generate recommendations for single profile
      const { data: profile, error: profileError } = await supabase
        .from("sj_profiles")
        .select("*")
        .eq("id", profileId)
        .eq("workspace_id", workspaceId)
        .single();

      if (profileError) throw profileError;

      // Get completed enrollments
      const { data: enrollments } = await supabase
        .from("sj_enrollments")
        .select("*")
        .eq("profile_id", profileId)
        .eq("workspace_id", workspaceId);

      const completedEnrollments = (enrollments || []).filter((e: { status: string }) => e.status === "completed");
      const completedCourseIds = completedEnrollments.map((e: { course_id: string }) => e.course_id);

      // Calculate matches
      const recommendations = calculateMatches(profile, completedEnrollments, courses || [], completedCourseIds);

      // Check data quality
      const dataQuality = checkDataQuality(profile);

      // Store recommendations in database
      if (recommendations.length > 0) {
        // Delete old recommendations for this profile
        await supabase
          .from("sj_course_recommendations")
          .delete()
          .eq("profile_id", profileId)
          .in("status", ["new", "shown"]);

        // Insert new recommendations (top 5)
        const toInsert = recommendations.slice(0, 5).map(rec => ({
          workspace_id: workspaceId,
          profile_id: profileId,
          course_id: rec.course_id,
          match_score: rec.score,
          match_reasons: rec.reasons,
          score_breakdown: rec.breakdown,
          created_by: "ai",
          status: "new",
        }));

        await supabase.from("sj_course_recommendations").insert(toInsert);
      }

      return new Response(
        JSON.stringify({
          success: true,
          recommendations: recommendations.slice(0, 5),
          data_quality: dataQuality,
          profile_id: profileId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "explain" && profileId && courseId) {
      // Explain why a specific course was recommended
      const { data: profile } = await supabase
        .from("sj_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      const course = courses?.find(c => c.id === courseId);

      if (!profile || !course) {
        throw new Error("Perfil ou curso não encontrado");
      }

      // Get existing recommendation
      const { data: recommendation } = await supabase
        .from("sj_course_recommendations")
        .select("*")
        .eq("profile_id", profileId)
        .eq("course_id", courseId)
        .single();

      // Call AI for detailed explanation
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `És um assistente especializado em recomendar formações. Explica de forma clara e persuasiva porque este curso é adequado para o aluno.
              
REGRAS:
- Usa PT-PT profissional
- Sê específico com base nos dados fornecidos
- Não inventes informação
- Máximo 3-4 frases por ponto`,
            },
            {
              role: "user",
              content: `Explica porque o curso "${course.name}" é recomendado para este aluno:

Perfil do aluno:
- Nome: ${profile.full_name}
- Interesses: ${JSON.stringify(profile.interests || [])}
- Nível atual: ${profile.current_level || "foundation"}
- Cursos concluídos: ${profile.total_courses_completed || 0}
- Score: ${profile.student_score || 0}%

Curso:
- Nome: ${course.name}
- Nível: ${course.level || "foundation"}
- Tags: ${JSON.stringify(course.tags || [])}

Score de match: ${recommendation?.match_score || "N/A"}%
Razões identificadas: ${JSON.stringify(recommendation?.match_reasons || [])}

Fornece uma explicação estruturada com:
1. **Porque é adequado** - razão principal
2. **Benefícios esperados** - o que o aluno ganha
3. **Próximo passo sugerido** - ação concreta`,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const aiData = await aiResponse.json();
      const explanation = aiData.choices?.[0]?.message?.content || "Explicação não disponível.";

      return new Response(
        JSON.stringify({
          success: true,
          explanation,
          recommendation,
          profile: { name: profile.full_name, id: profile.id },
          course: { name: course.name, id: course.id },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_message" && profileId && courseId) {
      // Generate personalized invitation message
      const { data: profile } = await supabase
        .from("sj_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      const course = courses?.find(c => c.id === courseId);

      if (!profile || !course) {
        throw new Error("Perfil ou curso não encontrado");
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `És um especialista em comunicação para formação profissional. Gera mensagens de convite personalizadas.

REGRAS:
- PT-PT profissional mas cordial
- Tom empresarial, não informal
- Curto e direto (máx. 100 palavras)
- Incluir CTA claro
- Personalizar com nome e contexto
- NÃO incluir preços ou datas fictícias`,
            },
            {
              role: "user",
              content: `Gera uma mensagem de convite para formação:

Aluno: ${profile.full_name}
Canal preferido: ${profile.preferred_channel || "email"}
Última formação: ${profile.last_course_completed_at ? new Date(profile.last_course_completed_at).toLocaleDateString("pt-PT") : "N/A"}
Interesses: ${JSON.stringify(profile.interests || [])}

Curso a propor: ${course.name}
Descrição: ${course.description || "N/A"}
Nível: ${course.level || "foundation"}

Responde em JSON:
{
  "subject": "assunto do email (se aplicável)",
  "message": "corpo da mensagem",
  "cta": "call to action"
}`,
            },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      
      let parsedMessage = { subject: "", message: "", cta: "" };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedMessage = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        parsedMessage.message = content;
      }

      return new Response(
        JSON.stringify({
          success: true,
          ...parsedMessage,
          profile_id: profileId,
          course_id: courseId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "batch_generate" && profileIds && profileIds.length > 0) {
      // Batch generate for multiple profiles
      const results = [];
      
      for (const pid of profileIds.slice(0, 20)) { // Limit to 20
        try {
          const { data: profile } = await supabase
            .from("sj_profiles")
            .select("*")
            .eq("id", pid)
            .eq("workspace_id", workspaceId)
            .single();

          if (!profile || profile.recommendations_enabled === false) continue;

          const { data: enrollments } = await supabase
            .from("sj_enrollments")
            .select("*")
            .eq("profile_id", pid);

          const completedEnrollments = (enrollments || []).filter((e: { status: string }) => e.status === "completed");
          const completedCourseIds = completedEnrollments.map((e: { course_id: string }) => e.course_id);

          const recommendations = calculateMatches(profile, completedEnrollments, courses || [], completedCourseIds);

          if (recommendations.length > 0) {
            await supabase
              .from("sj_course_recommendations")
              .delete()
              .eq("profile_id", pid)
              .in("status", ["new", "shown"]);

            const toInsert = recommendations.slice(0, 3).map(rec => ({
              workspace_id: workspaceId,
              profile_id: pid,
              course_id: rec.course_id,
              match_score: rec.score,
              match_reasons: rec.reasons,
              score_breakdown: rec.breakdown,
              created_by: "ai",
              status: "new",
            }));

            await supabase.from("sj_course_recommendations").insert(toInsert);
            results.push({ profile_id: pid, count: toInsert.length });
          }
        } catch (e) {
          console.error(`Error processing profile ${pid}:`, e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_contact_message" && profileId) {
      // Generate personalized contact/reactivation message (no course required)
      const { data: profile } = await supabase
        .from("sj_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (!profile) {
        throw new Error("Perfil não encontrado");
      }

      const messageTypePrompts: Record<string, string> = {
        general: "Gera uma mensagem de contacto geral para reatar a comunicação com este aluno.",
        reactivation: "Gera uma mensagem de reativação para incentivar este aluno inativo a voltar a participar em formações.",
        followup: "Gera uma mensagem de follow-up para verificar o interesse ou progresso deste aluno.",
      };

      const prompt = messageTypePrompts[messageType || "general"] || messageTypePrompts.general;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `És um especialista em comunicação para formação profissional. Gera mensagens personalizadas.

REGRAS:
- PT-PT profissional mas cordial
- Tom empresarial, não informal
- Curto e direto (máx. 100 palavras)
- Incluir CTA claro
- Personalizar com nome e contexto
- NÃO incluir preços ou datas fictícias`,
            },
            {
              role: "user",
              content: `${prompt}

Aluno: ${profile.full_name}
Email: ${profile.email || "N/A"}
Canal preferido: ${profile.preferred_channel || "email"}
Última formação: ${profile.last_course_completed_at ? new Date(profile.last_course_completed_at).toLocaleDateString("pt-PT") : "N/A"}
Interesses: ${JSON.stringify(profile.interests || [])}
Especialidade principal: ${profile.primary_specialty || profile.primary_interest || "N/A"}
Total cursos concluídos: ${profile.total_courses_completed || 0}

Responde em JSON:
{
  "subject": "assunto do email",
  "message": "corpo da mensagem",
  "cta": "call to action"
}`,
            },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
      });

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      
      let parsedMessage = { subject: "", message: "", cta: "" };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedMessage = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        parsedMessage.message = content;
      }

      return new Response(
        JSON.stringify({
          success: true,
          ...parsedMessage,
          profile_id: profileId,
          message_type: messageType || "general",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error) {
    console.error("Recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// MATCHING ALGORITHM
// ============================================

function calculateMatches(
  profile: Record<string, unknown>,
  completedEnrollments: Array<{ course_id: string; status: string; completed_at?: string }>,
  courses: Array<Record<string, unknown>>,
  completedCourseIds: string[]
): Array<{ course_id: string; score: number; reasons: MatchReason[]; breakdown: ScoreBreakdown }> {
  const results: Array<{ course_id: string; score: number; reasons: MatchReason[]; breakdown: ScoreBreakdown }> = [];

  for (const course of courses) {
    // Gate checks
    if (completedCourseIds.includes(course.id as string)) continue;
    if (!(course.is_active as boolean)) continue;

    const profileLevel = LEVEL_ORDER[(profile.current_level as string) || "foundation"] || 1;
    const courseLevel = LEVEL_ORDER[(course.level as string) || "foundation"] || 1;
    if (courseLevel > profileLevel + 1) continue;

    // Check prerequisites
    const prerequisites = (course.prerequisites || []) as Array<{ course_id?: string; min_level?: string }>;
    let prereqFailed = false;
    for (const prereq of prerequisites) {
      if (prereq.course_id && !completedCourseIds.includes(prereq.course_id)) {
        prereqFailed = true;
        break;
      }
      if (prereq.min_level && profileLevel < (LEVEL_ORDER[prereq.min_level] || 1)) {
        prereqFailed = true;
        break;
      }
    }
    if (prereqFailed) continue;

    // Calculate scores
    const reasons: MatchReason[] = [];
    let thematicFit = 0;
    let progressionFit = 0;
    let timingFit = 0;
    let profileFit = 0;
    let activationFit = 0;

    // Thematic fit (0-40)
    const profileInterests = ((profile.interests || []) as string[]).map(i => i.toLowerCase());
    const courseTags = ((course.tags || []) as string[]).map(t => t.toLowerCase());
    
    const interestMatches = courseTags.filter(tag => 
      profileInterests.some(interest => interest.includes(tag) || tag.includes(interest))
    );
    
    if (interestMatches.length > 0) {
      thematicFit = Math.min(interestMatches.length * 12, 40);
      reasons.push({
        type: "interest",
        text: `Interesse declarado em ${interestMatches.slice(0, 2).join(", ")}`,
        weight: thematicFit,
      });
    }

    // Progression fit (0-20)
    for (const enrollment of completedEnrollments.filter(e => e.status === "completed")) {
      const completedCourse = courses.find(c => c.id === enrollment.course_id);
      if (completedCourse && ((completedCourse.next_courses || []) as string[]).includes(course.id as string)) {
        progressionFit = 20;
        reasons.push({
          type: "progression",
          text: `Concluiu "${completedCourse.name}" — progressão natural`,
          weight: 20,
        });
        break;
      }
    }

    // Timing fit (0-15)
    if (profile.last_course_completed_at) {
      const daysSince = Math.floor((Date.now() - new Date(profile.last_course_completed_at as string).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 30 && daysSince <= 90) {
        timingFit = 10;
        reasons.push({
          type: "timing",
          text: `Última formação há ${daysSince} dias — bom timing`,
          weight: 10,
        });
      } else if (daysSince > 90) {
        timingFit = 5;
        reasons.push({
          type: "timing",
          text: `Há ${Math.floor(daysSince / 30)} meses sem formação`,
          weight: 5,
        });
      }
    }

    const urgencyScore = (course.urgency_score as number) || 0;
    if (urgencyScore >= 7) {
      timingFit = Math.min(timingFit + 5, 15);
      reasons.push({
        type: "urgency",
        text: "Vagas limitadas ou início próximo",
        weight: 5,
      });
    }

    // Profile fit (0-10)
    const recommendedFor = (course.recommended_for || []) as string[];
    if (recommendedFor.length > 0 && profile.role) {
      const profileRole = (profile.role as string).toLowerCase();
      if (recommendedFor.some(r => r.toLowerCase().includes(profileRole))) {
        profileFit = 10;
        reasons.push({
          type: "level",
          text: `Recomendado para perfil "${profile.role}"`,
          weight: 10,
        });
      }
    }

    if (profileFit === 0 && courseLevel === profileLevel + 1) {
      profileFit = 5;
      reasons.push({
        type: "level",
        text: `Nível compatível — próximo passo natural`,
        weight: 5,
      });
    }

    // Activation fit (0-10)
    if (profile.activation_potential === "high") {
      activationFit = 6;
    } else if (profile.activation_potential === "medium") {
      activationFit = 3;
    }

    const studentScore = (profile.student_score as number) || 0;
    if (studentScore >= 80) {
      activationFit = Math.min(activationFit + 4, 10);
      reasons.push({
        type: "similarity",
        text: `Score de aluno elevado (${studentScore}%)`,
        weight: 4,
      });
    }

    const breakdown: ScoreBreakdown = {
      thematic_fit: thematicFit,
      progression_fit: progressionFit,
      timing_fit: timingFit,
      profile_fit: profileFit,
      activation_fit: activationFit,
      similarity_bonus: 0,
      penalties: 0,
      total: thematicFit + progressionFit + timingFit + profileFit + activationFit,
    };

    results.push({
      course_id: course.id as string,
      score: breakdown.total,
      reasons: reasons.sort((a, b) => b.weight - a.weight).slice(0, 5),
      breakdown,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

function checkDataQuality(profile: Record<string, unknown>): {
  has_interests: boolean;
  has_specialties: boolean;
  has_completions: boolean;
  missing_fields: string[];
  quality_score: number;
} {
  const missing: string[] = [];
  let qualityScore = 100;

  const hasInterests = ((profile.interests as string[]) || []).length > 0;
  const hasSpecialties = Object.keys((profile.specialties_progress as Record<string, unknown>) || {}).length > 0;
  const hasCompletions = ((profile.total_courses_completed as number) || 0) > 0;

  if (!hasInterests) {
    missing.push("interests");
    qualityScore -= 30;
  }

  if (!hasSpecialties && !profile.primary_specialty) {
    missing.push("specialties_progress");
    qualityScore -= 20;
  }

  if (!profile.role) {
    missing.push("role");
    qualityScore -= 15;
  }

  return {
    has_interests: hasInterests,
    has_specialties: hasSpecialties,
    has_completions: hasCompletions,
    missing_fields: missing,
    quality_score: Math.max(0, qualityScore),
  };
}
