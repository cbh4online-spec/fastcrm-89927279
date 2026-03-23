import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { profile_id, workspace_id } = await req.json();
    if (!profile_id || !workspace_id) throw new Error("Missing profile_id or workspace_id");

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Not a workspace member");

    // Get the source profile
    const { data: sourceProfile } = await supabase
      .from("fastmatch_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();
    if (!sourceProfile) throw new Error("Profile not found");

    // Get all other active profiles in the workspace
    const { data: otherProfiles } = await supabase
      .from("fastmatch_profiles")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .neq("id", profile_id);

    if (!otherProfiles || otherProfiles.length === 0) {
      return new Response(JSON.stringify({ scored: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let scored = 0;

    // Score each pair
    for (const target of otherProfiles) {
      try {
        const prompt = `Analisa a compatibilidade estratégica entre estas duas empresas para uma parceria B2B.

EMPRESA A:
- Nome: ${sourceProfile.company_name || "N/A"}
- Indústria: ${sourceProfile.industry || "N/A"}
- Público-alvo: ${sourceProfile.target_audience || "N/A"}
- Ticket: ${sourceProfile.ticket_range || "N/A"}
- Serviços oferecidos: ${(sourceProfile.services_offered || []).join(", ") || "N/A"}
- Serviços procurados: ${(sourceProfile.services_needed || []).join(", ") || "N/A"}
- Bio: ${sourceProfile.bio || "N/A"}

EMPRESA B:
- Nome: ${target.company_name || "N/A"}
- Indústria: ${target.industry || "N/A"}
- Público-alvo: ${target.target_audience || "N/A"}
- Ticket: ${target.ticket_range || "N/A"}
- Serviços oferecidos: ${(target.services_offered || []).join(", ") || "N/A"}
- Serviços procurados: ${(target.services_needed || []).join(", ") || "N/A"}
- Bio: ${target.bio || "N/A"}

Avalia: complementaridade de serviços, alinhamento de público-alvo, sinergia de indústrias, compatibilidade de ticket.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Avalia compatibilidade B2B. Responde apenas com a tool call." },
              { role: "user", content: prompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "score_match",
                description: "Score de compatibilidade entre duas empresas",
                parameters: {
                  type: "object",
                  properties: {
                    score: { type: "number", description: "Score 0-100" },
                    reasons: {
                      type: "object",
                      properties: {
                        complementarity: { type: "string", description: "Razão de complementaridade" },
                        audience: { type: "string", description: "Razão de alinhamento de público" },
                        synergy: { type: "string", description: "Razão de sinergia" },
                      },
                      required: ["complementarity", "audience", "synergy"],
                    },
                  },
                  required: ["score", "reasons"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "score_match" } },
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${target.id}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) continue;

        const result = JSON.parse(toolCall.function.arguments);
        const score = Math.min(100, Math.max(0, Math.round(result.score)));

        // Update target profile's strategic_score relative to source
        // We update the target's score as the average of all its pairwise scores
        await supabase
          .from("fastmatch_profiles")
          .update({
            strategic_score: score,
            strategic_reasons: result.reasons,
            last_score_update: new Date().toISOString(),
          })
          .eq("id", target.id);

        scored++;
      } catch (err) {
        console.error(`Score error for ${target.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ scored, total: otherProfiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fastmatch-score error:", err);
    const status = err instanceof Error && err.message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
