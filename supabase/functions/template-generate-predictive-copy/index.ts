import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const {
      workspace_id,
      variant_id,
      template_id,
      channel,
      lead_id,
      contact_id,
      crm_variables,
      smart_variables,
      intent_label,
      generate_alternatives,
    } = body;

    if (!workspace_id || (!variant_id && !template_id)) {
      return new Response(JSON.stringify({ error: "workspace_id and variant_id or template_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get variant content
    let variantBody = "";
    let variantSubject = "";
    let variantCta = "";
    let variantTone = "consultative";

    if (variant_id) {
      const { data: variant } = await supabase
        .from("communication_template_variants")
        .select("*")
        .eq("id", variant_id)
        .single();

      if (variant) {
        variantBody = variant.body;
        variantSubject = variant.subject || "";
        variantCta = variant.cta || "";
        variantTone = variant.tone || "consultative";
      }
    } else if (template_id) {
      const { data: tpl } = await supabase
        .from("communication_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (tpl) {
        variantBody = tpl.body;
        variantSubject = tpl.subject || "";
        variantCta = (tpl as any).cta || "";
        variantTone = tpl.tone || "consultative";
      }
    }

    if (!variantBody) {
      return new Response(JSON.stringify({ error: "Variant/template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace performance stats for context
    const { data: topStats } = await supabase
      .from("workspace_template_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("score", { ascending: false })
      .limit(5);

    const statsContext = topStats && topStats.length > 0
      ? `Top performing patterns in this workspace: ${topStats.map(s => 
          `tone=${s.tone}, reply_rate=${((s.reply_rate || 0) * 100).toFixed(0)}%, score=${((s.score || 0) * 100).toFixed(0)}%`
        ).join("; ")}`
      : "No historical performance data yet.";

    // Build CRM context string
    const crmContext = crm_variables
      ? Object.entries(crm_variables)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "No CRM data available.";

    const smartContext = smart_variables
      ? Object.entries(smart_variables)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    const channelGuidelines: Record<string, string> = {
      email: "Structured, can be longer. Include subject line. Use paragraphs.",
      whatsapp: "Short, conversational. Max 3-4 short paragraphs. No HTML. Use emojis sparingly.",
      sms: "Ultra-concise. Max 160 characters. Direct CTA.",
      inbox: "Medium length. Conversational but professional.",
    };

    const systemPrompt = `You are a sales copywriting AI for a CRM platform. Your task is to rewrite a template variant to maximize response rates based on workspace performance data.

RULES:
- Never invent factual data about the company or lead. If data is missing, use neutral language.
- Keep the original structure and intent.
- Adapt tone to: ${variantTone}
- Channel: ${channel || "email"}. ${channelGuidelines[channel || "email"] || ""}
- Language: Portuguese (European).
- ${intent_label ? `Intent context: ${intent_label}` : ""}

WORKSPACE PERFORMANCE CONTEXT:
${statsContext}

CRM VARIABLES:
${crmContext}

SMART VARIABLES (AI-calculated):
${smartContext}

Return JSON with: { "subject": "...", "body": "...", "cta": "..." }
${generate_alternatives ? 'Also include "alternatives": [{ "subject": "...", "body": "...", "cta": "..." }, ...]  with 2 alternatives.' : ""}`;

    const userPrompt = `Rewrite this template for maximum conversion:

ORIGINAL SUBJECT: ${variantSubject}
ORIGINAL BODY: ${variantBody}
ORIGINAL CTA: ${variantCta}`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_rewritten_template",
            description: "Return the rewritten template copy",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Rewritten email subject" },
                body: { type: "string", description: "Rewritten message body" },
                cta: { type: "string", description: "Rewritten call-to-action" },
                alternatives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      body: { type: "string" },
                      cta: { type: "string" },
                    },
                    required: ["body"],
                  },
                  description: "Alternative versions",
                },
              },
              required: ["body"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_rewritten_template" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: return original
      result = { subject: variantSubject, body: variantBody, cta: variantCta };
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-generate-predictive-copy error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
