import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    const { review_id } = await req.json();
    if (!review_id) throw new Error("review_id is required");

    // Fetch review with employee info
    const { data: review, error: reviewErr } = await supabase
      .from("hr_performance_reviews")
      .select("*, hr_employees!hr_performance_reviews_employee_id_fkey(full_name, job_title, department)")
      .eq("id", review_id)
      .maybeSingle();

    if (reviewErr || !review) throw new Error("Review not found");

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", review.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not a workspace member");

    // Fetch competency ratings
    const { data: compRatings } = await supabase
      .from("hr_review_competency_ratings")
      .select("*, hr_competencies(name, category)")
      .eq("review_id", review_id);

    // Fetch peer reviews
    const { data: peerReviews } = await supabase
      .from("hr_peer_reviews")
      .select("rating, strengths, areas_improvement, comments, is_anonymous")
      .eq("review_id", review_id)
      .eq("status", "submitted");

    // Fetch OKRs for the year
    const { data: cycle } = await supabase
      .from("hr_review_cycles")
      .select("year")
      .eq("id", review.review_cycle_id)
      .maybeSingle();

    let okrs: any[] = [];
    if (cycle?.year) {
      const { data: okrData } = await supabase
        .from("hr_okrs")
        .select("title, progress, status")
        .eq("workspace_id", review.workspace_id)
        .eq("employee_id", review.employee_id);
      okrs = okrData || [];
    }

    // Fetch feedback received
    const { data: feedback } = await supabase
      .from("hr_feedback")
      .select("type, content, created_at")
      .eq("workspace_id", review.workspace_id)
      .eq("to_employee_id", review.employee_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Build AI prompt
    const employee = review.hr_employees;
    const prompt = `Analisa os seguintes dados de desempenho de um funcionário e sugere um rating de 1 a 5.

FUNCIONÁRIO: ${employee?.full_name || "N/A"}
CARGO: ${employee?.job_title || "N/A"}
DEPARTAMENTO: ${employee?.department || "N/A"}

AUTO-AVALIAÇÃO:
- Rating: ${review.self_rating || "Não submetido"}
- Conquistas: ${JSON.stringify(review.self_achievements || [])}
- Desafios: ${review.self_challenges || "N/A"}
- Comentários: ${review.self_comments || "N/A"}

AVALIAÇÃO DO MANAGER:
- Rating: ${review.manager_rating || "Não submetido"}
- Pontos fortes: ${review.manager_strengths || "N/A"}
- Áreas de melhoria: ${review.manager_areas_improvement || "N/A"}

COMPETÊNCIAS:
${(compRatings || []).map((cr: any) => `- ${cr.hr_competencies?.name}: Self=${cr.self_rating || "N/A"}, Manager=${cr.manager_rating || "N/A"}, Peer=${cr.peer_avg_rating || "N/A"}`).join("\n")}

PEER REVIEWS (${(peerReviews || []).length} recebidos):
${(peerReviews || []).map((pr: any, i: number) => `Peer ${i + 1}: Rating=${pr.rating}, Pontos fortes: ${pr.strengths || "N/A"}, Áreas: ${pr.areas_improvement || "N/A"}`).join("\n")}

OKRs:
${(okrs || []).map((o: any) => `- ${o.title}: ${o.progress}% (${o.status})`).join("\n") || "Sem OKRs"}

FEEDBACK RECENTE:
${(feedback || []).slice(0, 10).map((f: any) => `- [${f.type}] ${f.content}`).join("\n") || "Sem feedback"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "És um especialista em RH e avaliação de desempenho. Analisa dados e sugere um rating justo. Responde SEMPRE usando a tool suggest_rating."
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_rating",
              description: "Suggest a performance rating based on employee data",
              parameters: {
                type: "object",
                properties: {
                  suggested_rating: { type: "integer", minimum: 1, maximum: 5, description: "Rating 1-5" },
                  rating_label: { type: "string", enum: ["Insuficiente", "Necessita Melhoria", "Atinge Expectativas", "Excede Expectativas", "Excecional"] },
                  confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence 0-1" },
                  key_factors: { type: "array", items: { type: "string" }, description: "Key factors for the rating" },
                  strengths: { type: "array", items: { type: "string" }, description: "Key strengths" },
                  areas_for_improvement: { type: "array", items: { type: "string" }, description: "Areas for improvement" },
                  summary: { type: "string", description: "Brief summary in Portuguese" }
                },
                required: ["suggested_rating", "rating_label", "confidence", "key_factors", "strengths", "areas_for_improvement", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_rating" } }
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({
          error: status === 429 ? "Rate limit exceeded" : "Payment required",
          fallback: { suggested_rating: null, summary: "IA temporariamente indisponível. Tente novamente mais tarde." }
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis: any = null;

    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    }

    if (analysis) {
      await supabase
        .from("hr_performance_reviews")
        .update({
          ai_suggested_rating: analysis.suggested_rating,
          ai_analysis: analysis,
        })
        .eq("id", review_id);

      // Log activity
      await supabase.from("hr_review_activities").insert({
        workspace_id: review.workspace_id,
        review_id: review_id,
        activity_type: "ai_suggestion",
        description: `IA sugeriu rating ${analysis.suggested_rating}/5 (${analysis.rating_label})`,
        metadata: { confidence: analysis.confidence },
      });
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("hr-review-ai-suggest-rating error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
