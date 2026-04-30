import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    const tokens_input = data?.usage?.prompt_tokens ?? 0;
    const tokens_output = data?.usage?.completion_tokens ?? 0;
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input,
      tokens_output,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const candidate_id = body?.candidate_id;

    if (!candidate_id) {
      return new Response(JSON.stringify({ error: "candidate_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get candidate with job posting
    const { data: candidate, error: fetchError } = await supabase
      .from("hr_candidates")
      .select("*, job_posting:hr_job_postings(*)")
      .eq("id", candidate_id)
      .single();

    if (fetchError || !candidate) throw new Error("Candidate not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const jobPosting = (candidate as any).job_posting;
    const jobInfo = jobPosting
      ? `Título: ${jobPosting.title}\nDescrição: ${jobPosting.description}\nRequisitos: ${(jobPosting.requirements || []).join(", ")}`
      : "Sem vaga associada — avaliar perfil genérico";

    const candidateProfile = (candidate as any).cv_parsed_data
      ? JSON.stringify((candidate as any).cv_parsed_data, null, 2)
      : `Nome: ${(candidate as any).first_name} ${(candidate as any).last_name}\nEmail: ${(candidate as any).email}`;

    const aiResponse = await __loggedAIFetch(null, "hr-candidate-score-ai", {
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
            content: `És um recrutador especialista. Avalia candidatos numa escala de 0-100 para a posição. Responde APENAS via tool call.`,
          },
          {
            role: "user",
            content: `Informação da vaga:\n${jobInfo}\n\nPerfil do candidato:\n${candidateProfile}\n\nAvalia este candidato.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "candidate_score_result",
              description: "Return candidate scoring",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "0-100 fit score" },
                  strengths: { type: "array", items: { type: "string" } },
                  concerns: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" },
                  key_matches: { type: "array", items: { type: "string" } },
                },
                required: ["score", "strengths", "concerns", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "candidate_score_result" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em breve." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos IA esgotados. Adicione créditos." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis = { score: 50 } as any;

    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    }

    // Update candidate
    const { error } = await supabase
      .from("hr_candidates")
      .update({
        ai_score: Math.min(100, Math.max(0, Math.round(analysis.score))),
        ai_analysis: analysis,
      })
      .eq("id", candidate_id);

    if (error) throw error;

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-candidate-score-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
