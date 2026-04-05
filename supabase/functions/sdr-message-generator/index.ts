import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const {
      enrollment_id,
      step_id,
      workspace_id,
      channel,
      template_subject,
      template_body,
      step_number,
      preview = false,
    } = body;

    if (!enrollment_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "enrollment_id and workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load enrollment data
    const { data: enrollment } = await supabase
      .from("sdr_enrollments")
      .select("*, campaign:sdr_campaigns(id, name, settings, ai_employee_id)")
      .eq("id", enrollment_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: "Enrollment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaign = (enrollment as any).campaign;
    const settings = (campaign?.settings || {}) as Record<string, any>;
    const aiPersonalization = settings.ai_personalization || false;
    const personalizationLevel = settings.personalization_level || "light";
    const aiEmployeeId = campaign?.ai_employee_id;

    // 2. Build merge variables
    const enrichmentData = (enrollment.metadata as any)?.enrichment_data || {};
    const mergeVars: Record<string, string> = {
      prospect_name: enrollment.prospect_name || "",
      prospect_email: enrollment.prospect_email || "",
      prospect_phone: enrollment.prospect_phone || "",
      company: enrichmentData.company || enrichmentData.organization || "",
      campaign_name: campaign?.name || "",
      step_number: String(step_number || (enrollment.current_step || 0) + 1),
      sender_name: "",
    };

    // Load sender name from ai_employee if available
    if (aiEmployeeId) {
      const { data: bot } = await supabase
        .from("ai_employees")
        .select("name")
        .eq("id", aiEmployeeId)
        .maybeSingle();
      if (bot) mergeVars.sender_name = bot.name;
    }

    // 3. Apply merge variables to template
    let subject = applyMergeVars(template_subject || "", mergeVars);
    let bodyContent = applyMergeVars(template_body || "", mergeVars);

    // 4. AI personalization (if enabled and level > "light")
    let aiUsed = false;
    let aiFailed = false;

    if (aiPersonalization && aiEmployeeId && personalizationLevel !== "light") {
      try {
        const aiResult = await generateAIContent(
          supabase,
          workspace_id,
          aiEmployeeId,
          personalizationLevel,
          channel || "email",
          subject,
          bodyContent,
          mergeVars
        );

        if (aiResult) {
          subject = aiResult.subject || subject;
          bodyContent = aiResult.body || bodyContent;
          aiUsed = true;
        }
      } catch (err) {
        console.error("[sdr-message-generator] AI personalization failed, using fallback:", err);
        aiFailed = true;
        // Fallback: use merge-vars-only version (already applied above)
      }
    }

    // 5. Log AI usage if used
    if (aiUsed) {
      await logAIUsage(supabase, workspace_id, personalizationLevel);
    }

    const result = {
      subject,
      body: bodyContent,
      channel: channel || "email",
      ai_used: aiUsed,
      ai_failed: aiFailed,
      personalization_level: aiPersonalization ? personalizationLevel : "none",
      merge_vars_applied: Object.keys(mergeVars),
      preview,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sdr-message-generator] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function applyMergeVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(regex, value || "");
  }
  // Clean any remaining unresolved vars
  result = result.replace(/\{\{\s*\w+\s*\}\}/g, "");
  return result;
}

async function generateAIContent(
  supabase: any,
  workspaceId: string,
  aiEmployeeId: string,
  level: string,
  channel: string,
  subject: string,
  body: string,
  mergeVars: Record<string, string>
): Promise<{ subject: string; body: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[sdr-message-generator] LOVABLE_API_KEY not configured");
    return null;
  }

  // Check aiGate — simple budget check
  const gateOk = await checkAIGate(supabase, workspaceId, level);
  if (!gateOk) {
    console.warn("[sdr-message-generator] AI gate blocked — budget exceeded");
    return null;
  }

  // Load business context
  const { data: bizCtx } = await supabase
    .from("business_context")
    .select("context_type, content")
    .eq("workspace_id", workspaceId)
    .limit(10);

  const businessContextStr = (bizCtx || [])
    .map((c: any) => `[${c.context_type}]: ${c.content}`)
    .join("\n");

  // Load persona from ai_employee
  const { data: bot } = await supabase
    .from("ai_employees")
    .select("name, backstory, system_prompt, expertise_areas")
    .eq("id", aiEmployeeId)
    .maybeSingle();

  const personaStr = bot
    ? `Nome: ${bot.name}\nBackstory: ${bot.backstory || ""}\nEspecialidades: ${(bot.expertise_areas || []).join(", ")}`
    : "";

  const levelInstruction =
    level === "total"
      ? "Reescreve completamente a mensagem mantendo a intenção original. Personaliza ao máximo para o prospect."
      : "Reescreve parcialmente a mensagem, melhorando a linguagem e adicionando toques de personalização. Mantém a estrutura original.";

  const systemPrompt = `És um SDR profissional que personaliza mensagens de outreach.

Contexto de Negócio:
${businessContextStr}

Persona:
${personaStr}

Prospect:
- Nome: ${mergeVars.prospect_name}
- Empresa: ${mergeVars.company}
- Canal: ${channel}

Instrução: ${levelInstruction}

Regras:
- Tom profissional mas humano
- Máximo 150 palavras no body
- Não uses emojis excessivos
- Mantém o assunto conciso (máx 60 caracteres)
- Responde APENAS com JSON: {"subject": "...", "body": "..."}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Personaliza esta mensagem:\n\nAssunto: ${subject}\n\nCorpo:\n${body}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "personalize_message",
            description: "Return personalized subject and body for outreach message",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Personalized email subject" },
                body: { type: "string", description: "Personalized message body" },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "personalize_message" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errText = await response.text();
    if (status === 429 || status === 402) {
      console.warn(`[sdr-message-generator] AI rate limited/payment (${status})`);
      return null;
    }
    throw new Error(`AI gateway error: ${status} — ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("[sdr-message-generator] Failed to parse AI response");
    }
  }

  return null;
}

async function checkAIGate(supabase: any, workspaceId: string, level: string): Promise<boolean> {
  // Simple check: count AI calls this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfMonth.toISOString());

  // Allow up to 1000 AI calls/month per workspace (basic gate)
  const limit = level === "total" ? 500 : 1000;
  return (count || 0) < limit;
}

async function logAIUsage(supabase: any, workspaceId: string, level: string) {
  try {
    await supabase.from("ai_usage_logs").insert({
      workspace_id: workspaceId,
      feature: "sdr_message_generator",
      tier: level === "total" ? "heavy" : "medium",
      model: "google/gemini-2.5-flash",
      metadata: { personalization_level: level },
    });
  } catch (err) {
    console.error("[sdr-message-generator] Failed to log AI usage:", err);
  }
}
