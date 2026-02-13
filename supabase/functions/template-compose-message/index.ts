import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getStructureWeights(stage?: string | null) {
  const s = (stage || "").toLowerCase();
  if (["lead", "qualificação", "qualificacao", "novo"].includes(s)) {
    return { win: 0.45, opp: 0.45, reply: 0.10 };
  }
  if (["proposta", "proposal", "negociação", "negociacao"].includes(s)) {
    return { win: 0.65, opp: 0.25, reply: 0.05 };
  }
  return { win: 0.55, opp: 0.35, reply: 0.10 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const {
      template_id, workspace_id, channel, lead_id, contact_id,
      conversation_id, pipeline_stage, intent_label, sentiment_label,
      lead_score, potential_value,
    } = body;

    if (!template_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "template_id and workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load template
    const { data: template, error: tplErr } = await supabase
      .from("communication_templates")
      .select("*")
      .eq("id", template_id)
      .single();
    if (tplErr) throw tplErr;

    const structureFamilies = template.structure_families || ["AIDA"];
    const brandConstraints = template.brand_constraints || {};
    const maxLengths = template.max_length_by_channel || { whatsapp: 350, email: 1600, sms: 160, inbox: 800 };
    const maxLength = maxLengths[channel || "email"] || 1600;

    // 2. Predict best structure (inline query)
    const { data: stats } = await supabase
      .from("workspace_structure_stats")
      .select("*")
      .eq("workspace_id", workspace_id)
      .in("structure_key", structureFamilies);

    // Score structures
    const scoreMap: Record<string, { score: number; samples: number }> = {};
    for (const key of structureFamilies) {
      let relevantStats = (stats || []).filter((s: any) => s.structure_key === key);
      if (channel) relevantStats = relevantStats.filter((s: any) => s.channel === channel);
      if (pipeline_stage) {
        const stageStats = relevantStats.filter((s: any) => s.pipeline_stage === pipeline_stage);
        if (stageStats.length > 0) relevantStats = stageStats;
      }
      const totalSamples = relevantStats.reduce((sum: number, s: any) => sum + (s.samples || 0), 0);
      const avgScore = totalSamples > 0
        ? relevantStats.reduce((sum: number, s: any) => sum + (s.score || 0) * (s.samples || 0), 0) / totalSamples
        : 0;
      scoreMap[key] = { score: avgScore, samples: totalSamples };
    }

    const ranked = Object.entries(scoreMap).sort((a, b) => b[1].score - a[1].score);
    const totalSamples = ranked.reduce((sum, [, d]) => sum + d.samples, 0);

    // Bandit
    let structureKey = ranked[0]?.[0] || "AIDA";
    if (totalSamples === 0 || Math.random() > 0.8) {
      structureKey = structureFamilies[Math.floor(Math.random() * structureFamilies.length)];
    }

    // 3. Load structure definition
    const { data: structureDef } = await supabase
      .from("persuasion_structures")
      .select("*")
      .eq("key", structureKey)
      .single();

    const blocks = structureDef?.blocks || [];

    // 4. Load CRM data
    let crmData: Record<string, string> = {};
    
    if (lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, company_name, email, phone, source, score, notes, status, pipeline_stage_id")
        .eq("id", lead_id)
        .single();
      if (lead) {
        crmData.lead_name = lead.name || "";
        crmData.first_name = (lead.name || "").split(" ")[0];
        crmData.company_name = lead.company_name || "";
        crmData.lead_source = lead.source || "";
        crmData.lead_score = String(lead.score || "");
        crmData.lead_status = lead.status || "";
      }
    }

    if (contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, email, phone, company_id")
        .eq("id", contact_id)
        .single();
      if (contact) {
        crmData.contact_name = contact.name || "";
        crmData.first_name = crmData.first_name || (contact.name || "").split(" ")[0];
        if (contact.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name, industry")
            .eq("id", contact.company_id)
            .single();
          if (company) {
            crmData.company_name = crmData.company_name || company.name || "";
            crmData.industry = company.industry || "";
          }
        }
      }
    }

    // 5. Generate copy with AI
    const blocksDescription = (Array.isArray(blocks) ? blocks : [])
      .map((b: any) => `[${b.name}]: ${b.description}`)
      .join("\n");

    const toneRules = Array.isArray(brandConstraints.tone)
      ? `Tom: ${brandConstraints.tone.join(", ")}`
      : "";
    const forbiddenClaims = Array.isArray(brandConstraints.forbidden_claims)
      ? `Proibido usar: ${brandConstraints.forbidden_claims.join(", ")}`
      : "";
    const mandatoryMentions = Array.isArray(brandConstraints.mandatory_mentions)
      ? `Mencionar obrigatoriamente: ${brandConstraints.mandatory_mentions.join(", ")}`
      : "";

    const channelRules = brandConstraints.channel_rules?.[channel || "email"] || {};
    const channelGuidelines = Object.entries(channelRules)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");

    const systemPrompt = `Você é um copywriter especializado em vendas B2B usando o Método PARE.
Gere uma mensagem de ${channel || "email"} seguindo EXATAMENTE a estrutura ${structureKey}.

REGRAS CRÍTICAS:
- Nunca invente factos sobre a empresa ou lead
- Se um dado está em falta, use linguagem neutra sem inventar
- Máximo ${maxLength} caracteres
${toneRules}
${forbiddenClaims}
${mandatoryMentions}
${channelGuidelines ? `Regras do canal: ${channelGuidelines}` : ""}

ESTRUTURA (siga esta ordem de blocos):
${blocksDescription}`;

    const crmContext = Object.entries(crmData)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const userPrompt = `Dados do CRM:
${crmContext || "Sem dados específicos disponíveis."}

Pipeline stage: ${pipeline_stage || "desconhecido"}
Intent: ${intent_label || "desconhecido"}
Sentiment: ${sentiment_label || "neutro"}
Canal: ${channel || "email"}

Gere a mensagem completa seguindo a estrutura ${structureKey}.`;

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
            name: "compose_message",
            description: "Return the composed message following the persuasion structure.",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Email subject line (only for email channel)" },
                body: { type: "string", description: "Full message body" },
                cta: { type: "string", description: "Call-to-action text" },
                block_map: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      block_name: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["block_name", "content"],
                  },
                  description: "Content per block for audit",
                },
              },
              required: ["body", "cta", "block_map"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compose_message" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let composed = { subject: "", body: "", cta: "", block_map: [] as any[] };
    
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      composed = {
        subject: args.subject || "",
        body: args.body || "",
        cta: args.cta || "",
        block_map: args.block_map || [],
      };
    } else {
      // Fallback: use content directly
      const content = aiData.choices?.[0]?.message?.content || "";
      composed.body = content;
    }

    return new Response(JSON.stringify({
      success: true,
      subject: composed.subject,
      body: composed.body,
      cta: composed.cta,
      structure_key: structureKey,
      block_map: composed.block_map,
      confidence: totalSamples >= 100 ? "high" : totalSamples >= 30 ? "medium" : "low",
      crm_variables_used: Object.keys(crmData).filter(k => crmData[k]),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("template-compose-message error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
