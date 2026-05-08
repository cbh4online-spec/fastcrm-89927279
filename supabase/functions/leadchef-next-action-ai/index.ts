import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NextActionRequest {
  workspaceId: string;
  leadId: string;
  forceRefresh?: boolean;
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, leadId, forceRefresh } = (await req.json()) as NextActionRequest;
    if (!workspaceId || !leadId) {
      return new Response(JSON.stringify({ error: "workspaceId and leadId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Carregar perfil + lead
    const { data: profile, error: pErr } = await supabase
      .from("leadchef_lead_profiles")
      .select("*, lead:leads(name, phone, email, status)")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (pErr) throw pErr;
    if (!profile) {
      return new Response(JSON.stringify({ error: "lead_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ageDays = Math.floor(
      (Date.now() - new Date(profile.updated_at).getTime()) / 86400000
    );

    const contextStr = JSON.stringify({
      stage: profile.stage,
      temperature: profile.temperature,
      origin: profile.origin,
      interest: profile.interest,
      ageDays,
      hasNextAction: !!profile.next_action_at,
    });
    const contextHash = await sha256(contextStr);

    // Cache lookup
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("leadchef_ai_suggestions")
        .select("id, payload, created_at")
        .eq("lead_id", leadId)
        .eq("context_hash", contextHash)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ ...cached.payload, suggestion_id: cached.id, cached: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `És um coach de vendas para agentes LeadChef. Para cada lead, sugere a próxima ação concreta, o canal mais adequado e um rascunho de mensagem curto, profissional, em português de Portugal. Responde sempre via tool calling.`;

    const userPrompt = `Lead: ${profile.lead?.name ?? "—"}
Etapa: ${profile.stage}
Temperatura: ${profile.temperature}
Interesse: ${profile.interest ?? "—"}
Origem: ${profile.origin ?? "—"}
Dias desde última atualização: ${ageDays}
Tem próxima ação agendada: ${profile.next_action_at ? "sim" : "não"}

Sugere a próxima ação.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_next_action",
              description: "Sugere próxima ação para o lead",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    description: "Ação concreta a executar (ex: agendar demonstração, enviar follow-up)",
                  },
                  channel: {
                    type: "string",
                    enum: ["whatsapp", "phone", "email", "in_person"],
                  },
                  message_draft: {
                    type: "string",
                    description: "Rascunho de mensagem curto, em pt-PT, máx 280 caracteres",
                  },
                  reasoning: {
                    type: "string",
                    description: "Justificação curta (1 frase)",
                  },
                  urgency: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                },
                required: ["action", "channel", "message_draft", "reasoning", "urgency"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_next_action" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "credits_exhausted", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("no tool call in AI response");

    const payload = JSON.parse(toolCall.function.arguments);

    // Cache
    const { data: inserted } = await supabase
      .from("leadchef_ai_suggestions")
      .insert({
        workspace_id: workspaceId,
        lead_id: leadId,
        kind: "next_action",
        context_hash: contextHash,
        payload,
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({ ...payload, suggestion_id: inserted?.id, cached: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[leadchef-next-action-ai] error", e);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
