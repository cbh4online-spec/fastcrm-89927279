import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const cv_text = body?.cv_text;

    if (!candidate_id || !cv_text) {
      return new Response(JSON.stringify({ error: "candidate_id and cv_text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `És um especialista em parsing de CVs. Extrai dados estruturados do CV fornecido. Responde APENAS via tool call.`,
          },
          {
            role: "user",
            content: `Analisa e extrai dados estruturados deste CV:\n\n${cv_text}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "cv_parsed_result",
              description: "Return parsed CV data",
              parameters: {
                type: "object",
                properties: {
                  personal: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                    },
                  },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        title: { type: "string" },
                        start_date: { type: "string" },
                        end_date: { type: "string" },
                        description: { type: "string" },
                      },
                    },
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        institution: { type: "string" },
                        degree: { type: "string" },
                        field: { type: "string" },
                        graduation_year: { type: "string" },
                      },
                    },
                  },
                  skills: { type: "array", items: { type: "string" } },
                  languages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        language: { type: "string" },
                        proficiency: { type: "string" },
                      },
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["personal", "experience", "education", "skills", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "cv_parsed_result" } },
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
    let cvParsedData = {};

    if (toolCall?.function?.arguments) {
      cvParsedData = JSON.parse(toolCall.function.arguments);
    }

    const parsed = cvParsedData as any;

    // Update candidate with parsed data
    const updatePayload: Record<string, unknown> = { cv_parsed_data: cvParsedData };
    if (parsed.personal?.location) updatePayload.location = parsed.personal.location;

    const { error } = await supabase
      .from("hr_candidates")
      .update(updatePayload)
      .eq("id", candidate_id);

    if (error) throw error;

    return new Response(JSON.stringify({ cv_parsed_data: cvParsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-cv-parse-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
