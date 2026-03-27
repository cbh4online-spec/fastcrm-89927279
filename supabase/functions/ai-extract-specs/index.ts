import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'light', 'ai-extract-specs');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const { workspace_id, product_id, mode, text, product_name, product_description, category, existing_specs } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = "";
    let systemPrompt = "";

    if (mode === "extract-from-text") {
      // Extract specs from datasheet text (PDF content)
      systemPrompt = `You are a technical product specification extractor. 
Extract key-value specifications from product datasheets.
Return structured JSON with groups of specifications.
Always respond in Portuguese (PT-PT) for group names.
Common groups: Técnico, Dimensional, Elétrico, Óptico, Rede, Ambiental, Certificações, Performance.
Include units where applicable (mm, kg, V, W, °C, dB, m, etc.).`;

      prompt = `Extract ALL technical specifications from this product datasheet text.
${product_name ? `Product: ${product_name}` : ""}
${category ? `Category: ${category}` : ""}

Datasheet text:
---
${text}
---

Return JSON array with this structure (no markdown):
[
  {
    "spec_key": "Resolução",
    "spec_value": "3840x2160",
    "unit": "px",
    "spec_group": "Técnico"
  }
]

Rules:
- Extract EVERY specification mentioned
- Group logically (Técnico, Dimensional, Elétrico, Óptico, Rede, Ambiental, Certificações, Performance)
- Include units separately when applicable
- Use proper Portuguese names for keys and groups
- Don't include marketing text, only factual specs
- If a value has a unit embedded (e.g. "30m"), separate into value "30" and unit "m"`;

    } else if (mode === "suggest-specs") {
      // Suggest specs based on product info
      systemPrompt = `You are a product specification expert.
Given a product name, category, and description, suggest the most relevant technical specifications that should be documented.
Always respond in Portuguese (PT-PT).`;

      prompt = `Suggest technical specifications for this product:
Name: ${product_name || "Unknown"}
Category: ${category || "Unknown"}
Description: ${product_description || "N/A"}
${existing_specs ? `Already has these specs: ${JSON.stringify(existing_specs)}` : ""}

Return JSON array of suggested specs to ADD (don't repeat existing ones):
[
  {
    "spec_key": "Nome da spec",
    "spec_value": "",
    "unit": "unidade ou null",
    "spec_group": "Grupo"
  }
]

Suggest 5-15 relevant specs grouped logically. Leave spec_value empty for user to fill.`;

    } else if (mode === "generate-template") {
      // Generate a template for a category
      systemPrompt = `You are a product specification template designer.
Create templates of common specifications for product categories.
Always respond in Portuguese (PT-PT).`;

      prompt = `Create a specification template for the category: "${category}"

Return JSON with this structure (no markdown):
{
  "template_name": "Nome do Template",
  "spec_keys": [
    {
      "key": "Nome da Spec",
      "unit": "unidade ou null",
      "group": "Grupo",
      "description": "Breve descrição"
    }
  ]
}

Include 10-20 common specifications for this category, grouped logically.`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid mode. Use: extract-from-text, suggest-specs, generate-template" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed: any;
    try {
      const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If mode is extract-from-text and product_id provided, optionally save
    if (mode === "extract-from-text" && product_id && body.auto_save) {
      const specs = Array.isArray(parsed) ? parsed : [];
      if (specs.length > 0) {
        const rows = specs.map((s: any, i: number) => ({
          workspace_id,
          product_id,
          spec_key: s.spec_key,
          spec_value: s.spec_value || "",
          unit: s.unit || null,
          spec_group: s.spec_group || "Geral",
          display_order: i,
        }));

        const { error: insertError } = await supabase
          .from("product_spec_attributes")
          .insert(rows);

        if (insertError) {
          console.error("Insert error:", insertError);
        }
      }
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-extract-specs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
