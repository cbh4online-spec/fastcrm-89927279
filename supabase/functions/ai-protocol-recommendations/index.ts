import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pathologyId, workspaceId } = await req.json();

    if (!pathologyId || !workspaceId) {
      return new Response(JSON.stringify({ error: "Missing pathologyId or workspaceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pathology
    const { data: pathology } = await supabase
      .from("pathologies")
      .select("name, description, tags")
      .eq("id", pathologyId)
      .single();

    if (!pathology) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all protocols for this workspace
    const { data: protocols } = await supabase
      .from("product_protocols")
      .select("id, name, description, short_description")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (!protocols || protocols.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing associations
    const { data: existingLinks } = await supabase
      .from("pathology_protocols")
      .select("protocol_id")
      .eq("pathology_id", pathologyId);

    const linkedIds = new Set((existingLinks || []).map((l: any) => l.protocol_id));

    // Ask AI to recommend protocols
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const protocolList = protocols
      .filter((p: any) => !linkedIds.has(p.id))
      .map((p: any) => `- ${p.name}: ${p.short_description || p.description || "sem descrição"}`)
      .join("\n");

    if (!protocolList) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            content: `Você é um consultor técnico em tricologia e cosmetologia profissional. Recomende protocolos para a situação clínica indicada. Responda APENAS com recomendações técnicas, NUNCA diagnostique. Use linguagem profissional em português.`,
          },
          {
            role: "user",
            content: `Patologia/Situação: ${pathology.name}\nDescrição: ${pathology.description || "N/A"}\nTags: ${(pathology.tags || []).join(", ")}\n\nProtocolos disponíveis:\n${protocolList}\n\nRecomende os protocolos mais adequados para esta situação.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_protocols",
              description: "Return recommended protocols for the pathology",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        protocol_name: { type: "string" },
                        reason: { type: "string", description: "Short technical reason in Portuguese" },
                        priority: { type: "string", enum: ["alta", "media", "baixa"] },
                      },
                      required: ["protocol_name", "reason", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_protocols" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[B2B-INTELLIGENCE] PROTOCOL_AI_ERROR status=" + aiResponse.status);
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let recommendations: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = parsed.recommendations || [];

        // Map protocol names to IDs
        recommendations = recommendations.map((r: any) => {
          const matchedProtocol = protocols.find(
            (p: any) => p.name.toLowerCase() === r.protocol_name.toLowerCase()
          );
          return {
            ...r,
            protocol_id: matchedProtocol?.id || null,
          };
        }).filter((r: any) => r.protocol_id);
      } catch {
        recommendations = [];
      }
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[B2B-INTELLIGENCE] PROTOCOL_RECS_FAILED", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
