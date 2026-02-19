import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { workspace_id, contact_id, lead_id } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contact_id && !lead_id) {
      return new Response(
        JSON.stringify({ error: "Missing contact_id or lead_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[compute-conversation-signals] Computing for", { workspace_id, contact_id, lead_id });

    // 1. Fetch conversations for this entity
    let convQuery = supabase
      .from("conversations")
      .select("id, channel")
      .eq("workspace_id", workspace_id);

    if (contact_id) {
      convQuery = convQuery.eq("contact_id", contact_id);
    } else {
      convQuery = convQuery.eq("lead_id", lead_id);
    }

    const { data: conversations } = await convQuery.limit(20);

    if (!conversations || conversations.length === 0) {
      console.log("[compute-conversation-signals] No conversations found");
      return new Response(
        JSON.stringify({ message: "No conversations found", signals: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationIds = conversations.map((c: any) => c.id);

    // 2. Fetch last 80 messages across all conversations
    const { data: messages } = await supabase
      .from("messages")
      .select("id, content, direction, sent_at, conversation_id")
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: false })
      .limit(80);

    if (!messages || messages.length === 0) {
      console.log("[compute-conversation-signals] No messages found");
      return new Response(
        JSON.stringify({ message: "No messages found", signals: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Build compact context (last 40 messages, chronological)
    const recentMessages = messages
      .slice(0, 40)
      .reverse()
      .map((m: any) => {
        const role = m.direction === "inbound" ? "Cliente" : "Agente";
        const content = (m.content || "").substring(0, 300);
        return `[${role}]: ${content}`;
      })
      .join("\n");

    // 4. Call Lovable AI with tool-calling
    const systemPrompt = `Você é um analista especialista em vendas e comportamento de compra.
Analise a conversa entre um agente de vendas e um cliente potencial.
Identifique sinais comportamentais, intenção de compra, objeções e sugira a próxima ação.
Responda sempre em português europeu. A resposta sugerida deve ser uma mensagem pronta a enviar ao cliente.`;

    const userPrompt = `Analise esta conversa de vendas e compute os sinais de deal intelligence:

${recentMessages}

Número de mensagens analisadas: ${messages.length}
Canais: ${[...new Set(conversations.map((c: any) => c.channel))].join(", ")}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "compute_deal_signals",
              description: "Compute comprehensive deal intelligence signals from conversation analysis",
              parameters: {
                type: "object",
                properties: {
                  temperature: {
                    type: "string",
                    enum: ["cold", "evaluating", "ready_to_buy", "stalling", "lost"],
                    description: "Current lead temperature/stage based on conversation signals",
                  },
                  close_probability: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Probability of closing this deal (0.0 to 1.0)",
                  },
                  trust_score: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Level of trust established in the conversation (0.0 to 1.0)",
                  },
                  churn_risk: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Risk of losing this lead/customer (0.0 to 1.0)",
                  },
                  buying_intent_score: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "How strong is the buying intent signal (0.0 to 1.0)",
                  },
                  urgency_score: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "How urgently does the client need a solution (0.0 to 1.0)",
                  },
                  main_objection: {
                    type: "string",
                    enum: ["price", "timing", "authority", "competitor", "uncertainty", "no_need", "confusion", "none"],
                    description: "The primary objection detected in the conversation",
                  },
                  next_action: {
                    type: "string",
                    description: "The single most impactful next action the agent should take (max 150 chars)",
                  },
                  recommended_reply: {
                    type: "string",
                    description: "A ready-to-use reply message in Portuguese European (max 300 chars)",
                  },
                  signals_detail: {
                    type: "object",
                    description: "Additional signal details",
                    properties: {
                      key_signals: {
                        type: "array",
                        items: { type: "string" },
                        description: "3-5 key signals detected in the conversation",
                      },
                      objection_handling: {
                        type: "string",
                        description: "How to handle the main objection detected",
                      },
                      positive_indicators: {
                        type: "array",
                        items: { type: "string" },
                        description: "Positive buying signals detected",
                      },
                      risk_indicators: {
                        type: "array",
                        items: { type: "string" },
                        description: "Risk or churn signals detected",
                      },
                    },
                    required: ["key_signals", "objection_handling", "positive_indicators", "risk_indicators"],
                    additionalProperties: false,
                  },
                },
                required: [
                  "temperature",
                  "close_probability",
                  "trust_score",
                  "churn_risk",
                  "buying_intent_score",
                  "urgency_score",
                  "main_objection",
                  "next_action",
                  "recommended_reply",
                  "signals_detail",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "compute_deal_signals" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        console.error("[compute-conversation-signals] Rate limit hit");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        console.error("[compute-conversation-signals] Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const signals = JSON.parse(toolCall.function.arguments);
    console.log("[compute-conversation-signals] AI signals computed", { temperature: signals.temperature, close_probability: signals.close_probability });

    // 5. Upsert to conversation_signals
    const upsertData: Record<string, unknown> = {
      workspace_id,
      temperature: signals.temperature,
      close_probability: signals.close_probability,
      trust_score: signals.trust_score,
      churn_risk: signals.churn_risk,
      buying_intent_score: signals.buying_intent_score,
      urgency_score: signals.urgency_score,
      main_objection: signals.main_objection,
      next_action: signals.next_action,
      recommended_reply: signals.recommended_reply,
      signals_data: signals.signals_detail,
      last_updated: new Date().toISOString(),
    };

    if (contact_id) {
      upsertData.contact_id = contact_id;
      upsertData.lead_id = null;
    } else {
      upsertData.lead_id = lead_id;
      upsertData.contact_id = null;
    }

    const conflictColumn = contact_id ? "conversation_signals_contact_idx" : "conversation_signals_lead_idx";
    
    // Use raw upsert with the right ON CONFLICT
    const { data: upserted, error: upsertError } = await supabase
      .from("conversation_signals")
      .upsert(upsertData, {
        onConflict: contact_id ? "workspace_id,contact_id" : "workspace_id,lead_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error("[compute-conversation-signals] Upsert error", upsertError);
      throw upsertError;
    }

    console.log("[compute-conversation-signals] Signals upserted", upserted?.id);

    return new Response(
      JSON.stringify({ success: true, signals: upserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[compute-conversation-signals] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
