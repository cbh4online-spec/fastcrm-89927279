// ============================================================
// FastCRM | AI Employee Executor
// POST /functions/v1/ai-employee-executor
//
// Responsibilities:
//   1. Receive a message from any channel
//   2. Resolve the correct bot for workspace + channel
//   3. Dispatch to guided / prompt / flow execution logic
//   4. Persist memory, run logs and analytics
//   5. Return response + side-effects (lead, booking, handover)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ───────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-channel-type, x-channel-identifier",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── TYPES ──────────────────────────────────────────────────
interface ExecutorRequest {
  /** Incoming user message text */
  message: string;
  /** Conversation already created in the inbox */
  conversationId: string;
  /** Optional: linked lead id */
  leadId?: string;
  /** Workspace id – also read from x-workspace-id header */
  workspaceId?: string;
  /** Channel – also read from x-channel-type header */
  channelType?: string;
  /** Channel identifier – also read from x-channel-identifier header */
  channelIdentifier?: string;
  /** Caller may pass the bot id directly to skip resolution */
  botId?: string;
  /** Extra context forwarded from webhook (e.g. wa_message_id) */
  metadata?: Record<string, unknown>;
}

interface BotRow {
  id: string;
  workspace_id: string;
  name: string;
  type: "guided" | "prompt" | "flow";
  status: "draft" | "active" | "paused" | "archived";
  ai_profile_id: string | null;
  knowledge_base_id: string | null;
  calendar_id: string | null;
  created_by: string;
}

interface BotSettingsRow {
  tone: string | null;
  greeting_message: string | null;
  fallback_message: string | null;
  handover_enabled: boolean;
  handover_role: string | null;
  handover_user_id: string | null;
  trigger_keywords: string[] | null;
  capture_name: boolean;
  capture_email: boolean;
  capture_phone: boolean;
}

interface ExecutorResponse {
  success: boolean;
  botId: string;
  botName: string;
  botType: string;
  reply: string | null;
  replies?: string[];
  actions: SideEffect[];
  runId: string;
  sessionState?: string;
  collectedVariables?: Record<string, unknown>;
  error?: string;
}

interface SideEffect {
  type: "create_lead" | "update_lead" | "handover" | "booking" | "tag" | "automation";
  payload: Record<string, unknown>;
}

// ─── HELPERS ────────────────────────────────────────────────

/**
 * Resolve headers → request body precedence for the three routing keys.
 */
function resolveRoutingKeys(req: Request, body: ExecutorRequest) {
  const workspaceId =
    req.headers.get("x-workspace-id") || body.workspaceId || "";
  const channelType =
    req.headers.get("x-channel-type") || body.channelType || "inbox";
  const channelIdentifier =
    req.headers.get("x-channel-identifier") ||
    body.channelIdentifier ||
    null;
  return { workspaceId, channelType, channelIdentifier };
}

/**
 * Find the active bot assigned to a channel for this workspace.
 * If botId is already provided, just fetch that bot directly.
 */
async function resolveBot(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  channelType: string,
  channelIdentifier: string | null,
  explicitBotId?: string
): Promise<BotRow | null> {
  if (explicitBotId) {
    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("id", explicitBotId)
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .single();
    return (data as BotRow) || null;
  }

  // Try exact match with channel_identifier
  if (channelIdentifier) {
    const { data: exact } = await supabase
      .from("bot_channels")
      .select("bot_id, bots!inner(*)")
      .eq("workspace_id", workspaceId)
      .eq("channel_type", channelType)
      .eq("channel_identifier", channelIdentifier)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (exact?.bot_id) {
      const inner = (exact as any).bots as BotRow;
      if (inner?.status === "active") return inner;
    }
  }

  // Fallback: any active bot_channel for this channel_type
  const { data: fallback } = await supabase
    .from("bot_channels")
    .select("bot_id, bots!inner(*)")
    .eq("workspace_id", workspaceId)
    .eq("channel_type", channelType)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (fallback?.bot_id) {
    const inner = (fallback as any).bots as BotRow;
    if (inner?.status === "active") return inner;
  }

  return null;
}

/** Detect handover trigger keywords in the user message */
function shouldHandover(message: string, settings: BotSettingsRow | null): boolean {
  if (!settings?.handover_enabled) return false;
  const keywords = settings.trigger_keywords || [];
  if (!keywords.length) return false;
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/** Simple email/phone/name extraction from a message */
function extractLeadData(message: string, settings: BotSettingsRow | null) {
  const result: Record<string, string> = {};
  if (!settings) return result;

  if (settings.capture_email) {
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) result.email = emailMatch[0];
  }
  if (settings.capture_phone) {
    const phoneMatch = message.match(/(\+?[0-9]{9,15})/);
    if (phoneMatch) result.phone = phoneMatch[0];
  }
  return result;
}

/** Persist a run log to bot_runs */
async function logRun(
  supabase: ReturnType<typeof createClient>,
  params: {
    workspaceId: string;
    botId: string;
    conversationId: string;
    status: "success" | "error" | "handover" | "skipped";
    inputPayload: unknown;
    outputPayload: unknown;
    errorMessage?: string;
  }
): Promise<string> {
  const { data } = await supabase
    .from("bot_runs")
    .insert({
      workspace_id: params.workspaceId,
      bot_id: params.botId,
      conversation_id: params.conversationId,
      status: params.status,
      input_payload: params.inputPayload,
      output_payload: params.outputPayload,
      error_message: params.errorMessage || null,
    })
    .select("id")
    .single();
  return (data as any)?.id || crypto.randomUUID();
}

/** Increment bot_analytics counters */
async function incrementAnalytics(
  supabase: ReturnType<typeof createClient>,
  botId: string,
  workspaceId: string,
  delta: {
    conversations?: number;
    messagesIn?: number;
    messagesOut?: number;
    leads?: number;
    handovers?: number;
  }
) {
  // Use service role (already set) – upsert to guarantee row exists
  await supabase.rpc("increment_bot_analytics", {
    p_bot_id: botId,
    p_workspace_id: workspaceId,
    p_conversations: delta.conversations || 0,
    p_messages_in: delta.messagesIn || 0,
    p_messages_out: delta.messagesOut || 0,
    p_leads: delta.leads || 0,
    p_handovers: delta.handovers || 0,
  }).then(({ error }) => {
    if (error) {
      console.warn("[AI-EMPLOYEE-EXECUTOR] Analytics increment RPC failed (non-fatal):", error.message);
    }
  });
}

// ─── MODE EXECUTORS ─────────────────────────────────────────

/** GUIDED: pre-defined conversational script using bot_settings */
async function runGuided(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  message: string,
  conversationId: string
): Promise<{ reply: string; actions: SideEffect[] }> {
  const actions: SideEffect[] = [];

  // Check handover
  if (shouldHandover(message, settings)) {
    actions.push({
      type: "handover",
      payload: {
        conversationId,
        reason: "contact_request",
        assignToUserId: settings?.handover_user_id,
        botId: bot.id,
      },
    });
    const reply = settings?.fallback_message || "Vou transferir para um elemento da nossa equipa. Aguarde um momento!";
    return { reply, actions };
  }

  // Extract lead data
  const extracted = extractLeadData(message, settings);
  if (Object.keys(extracted).length > 0) {
    actions.push({ type: "update_lead", payload: extracted });
  }

  // Greeting logic: if first message pattern
  const lower = message.toLowerCase();
  const isGreeting = /^(ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|hi|hello|oi)/.test(lower);

  if (isGreeting && settings?.greeting_message) {
    return { reply: settings.greeting_message, actions };
  }

  // Fallback
  const reply =
    settings?.fallback_message ||
    "Obrigado pela sua mensagem! A nossa equipa irá responder em breve.";

  return { reply, actions };
}

/** PROMPT: LLM-powered response using ai_profile persona + optional KB */
async function runPrompt(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  message: string,
  conversationId: string,
  workspaceId: string
): Promise<{ reply: string; actions: SideEffect[] }> {
  const actions: SideEffect[] = [];

  // Check handover first
  if (shouldHandover(message, settings)) {
    actions.push({
      type: "handover",
      payload: {
        conversationId,
        reason: "contact_request",
        assignToUserId: settings?.handover_user_id,
        botId: bot.id,
      },
    });
    return {
      reply: settings?.fallback_message || "A transferir para a nossa equipa. Um momento!",
      actions,
    };
  }

  // Fetch conversation history for context (last 10 messages)
  const { data: history } = await supabase
    .from("messages")
    .select("content, direction, sender_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const conversationHistory = (history || [])
    .reverse()
    .map((m: any) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content,
    }));

  // Fetch persona if configured
  let personaPrompt = "";
  if (bot.ai_profile_id) {
    const { data: persona } = await supabase
      .from("ai_personas")
      .select("name, tone_of_voice, system_prompt, technical_depth, language_style, limitations")
      .eq("id", bot.ai_profile_id)
      .single();

    if (persona) {
      personaPrompt = `
## Persona: ${persona.name}
- Tom: ${persona.tone_of_voice || "profissional"}
- Estilo: ${persona.language_style || "conversacional"}
- Profundidade técnica: ${persona.technical_depth || "medium"}
${persona.system_prompt ? `\nInstruções personalizadas:\n${persona.system_prompt}` : ""}
${persona.limitations?.length ? `\nLimitações:\n${(persona.limitations as string[]).map((l) => `- ${l}`).join("\n")}` : ""}
      `.trim();
    }
  }

  // Fetch knowledge base context if configured
  let kbContext = "";
  if (bot.knowledge_base_id) {
    const keywords = message
      .toLowerCase()
      .replace(/[?!.,;:()]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6);

    if (keywords.length > 0) {
      const orClauses = keywords
        .map((kw) => `title.ilike.%${kw}%,content.ilike.%${kw}%`)
        .join(",");

      const { data: entries } = await supabase
        .from("knowledge_entries")
        .select("title, content")
        .eq("workspace_id", workspaceId)
        .eq("knowledge_base_id", bot.knowledge_base_id)
        .eq("status", "validated")
        .or(orClauses)
        .limit(4);

      if (entries?.length) {
        kbContext = `\n## Base de Conhecimento:\n${entries
          .map((e: any, i: number) => `### ${i + 1}. ${e.title}\n${e.content}`)
          .join("\n\n")}`;
      }
    }
  }

  const systemPrompt = `És um assistente virtual profissional do bot "${bot.name}".
${personaPrompt}
${kbContext}

REGRAS:
- Responde sempre em Português de Portugal
- Sê conciso e útil
- Não inventes informação que não tens
- Se não souberes responder, diz que vais encaminhar para a equipa
`;

  // Call Lovable AI (OpenAI-compatible via LOVABLE_API_KEY)
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[AI-EMPLOYEE-EXECUTOR] LOVABLE_API_KEY not set – using fallback reply");
    return {
      reply: settings?.fallback_message || "Obrigado pela sua mensagem! A nossa equipa irá responder em breve.",
      actions,
    };
  }

  const llmResponse = await fetch("https://api.lovable.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!llmResponse.ok) {
    const errText = await llmResponse.text();
    throw new Error(`LLM call failed: ${llmResponse.status} ${errText}`);
  }

  const llmData = await llmResponse.json();
  const reply =
    llmData.choices?.[0]?.message?.content?.trim() ||
    settings?.fallback_message ||
    "Obrigado pela sua mensagem!";

  // Extract lead data
  const extracted = extractLeadData(message, settings);
  if (Object.keys(extracted).length > 0) {
    actions.push({ type: "update_lead", payload: extracted });
  }

  return { reply, actions };
}

/** FLOW: execute visual flow_json via the existing flow-engine function */
async function runFlow(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  message: string,
  conversationId: string,
  workspaceId: string,
  leadId?: string
): Promise<{
  reply: string;
  replies: string[];
  actions: SideEffect[];
  sessionState: string;
  collectedVariables: Record<string, unknown>;
}> {
  const actions: SideEffect[] = [];

  // Check handover first
  if (shouldHandover(message, settings)) {
    actions.push({
      type: "handover",
      payload: {
        conversationId,
        reason: "contact_request",
        assignToUserId: settings?.handover_user_id,
        botId: bot.id,
      },
    });
    return {
      reply: settings?.fallback_message || "A transferir para a nossa equipa!",
      replies: [],
      actions,
      sessionState: "handed_off",
      collectedVariables: {},
    };
  }

  // Delegate to flow-engine function
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const flowResp = await fetch(`${supabaseUrl}/functions/v1/flow-engine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      action: "continue",
      workspaceId,
      conversationId,
      leadId,
      userMessage: message,
    }),
  });

  if (!flowResp.ok) {
    const errText = await flowResp.text();
    throw new Error(`flow-engine call failed: ${flowResp.status} ${errText}`);
  }

  const flowData = await flowResp.json();

  // Map flow session state → side effects
  if (flowData.sessionState === "handed_off") {
    actions.push({
      type: "handover",
      payload: {
        conversationId,
        reason: "contact_request",
        botId: bot.id,
        assignToUserId: settings?.handover_user_id,
      },
    });
  }

  // Extract lead data from collected variables
  const vars = flowData.collectedVariables || {};
  const leadPayload: Record<string, string> = {};
  if (vars.email) leadPayload.email = String(vars.email);
  if (vars.phone) leadPayload.phone = String(vars.phone);
  if (vars.name) leadPayload.name = String(vars.name);
  if (Object.keys(leadPayload).length > 0) {
    actions.push({ type: "update_lead", payload: leadPayload });
  }

  const replies: string[] = flowData.responses || [];
  const reply = replies[0] || settings?.fallback_message || "Obrigado pela sua mensagem!";

  return {
    reply,
    replies,
    actions,
    sessionState: flowData.sessionState || "active",
    collectedVariables: vars,
  };
}

// ─── SIDE EFFECTS EXECUTOR ──────────────────────────────────

async function executeSideEffects(
  supabase: ReturnType<typeof createClient>,
  actions: SideEffect[],
  workspaceId: string,
  leadId: string | undefined,
  conversationId: string,
  botId: string
): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "handover": {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/human-handover`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              workspaceId,
              conversationId,
              reason: action.payload.reason || "contact_request",
              assignToUserId: action.payload.assignToUserId,
              botId,
            }),
          });
          break;
        }

        case "update_lead": {
          if (!leadId) break;
          await supabase
            .from("leads")
            .update(action.payload)
            .eq("id", leadId)
            .eq("workspace_id", workspaceId);
          break;
        }

        case "create_lead": {
          await supabase.from("leads").insert({
            workspace_id: workspaceId,
            ...action.payload,
          });
          break;
        }

        case "tag": {
          if (!leadId) break;
          const { data: lead } = await supabase
            .from("leads")
            .select("tags")
            .eq("id", leadId)
            .single();
          const currentTags: string[] = (lead as any)?.tags || [];
          const tagName = String(action.payload.tag);
          if (!currentTags.includes(tagName)) {
            await supabase
              .from("leads")
              .update({ tags: [...currentTags, tagName] })
              .eq("id", leadId);
          }
          break;
        }

        default:
          console.log(`[AI-EMPLOYEE-EXECUTOR] Unhandled side effect: ${action.type}`);
      }
    } catch (err) {
      console.error(`[AI-EMPLOYEE-EXECUTOR] Side effect ${action.type} failed:`, err);
    }
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse body
    const body: ExecutorRequest = await req.json();
    const { workspaceId, channelType, channelIdentifier } = resolveRoutingKeys(req, body);

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId is required (header or body)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.message || !body.conversationId) {
      return new Response(
        JSON.stringify({ error: "message and conversationId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client – channels like WhatsApp/Instagram call this from webhooks
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1) Resolve bot ───────────────────────────────────────
    const bot = await resolveBot(
      supabase,
      workspaceId,
      channelType,
      channelIdentifier,
      body.botId
    );

    if (!bot) {
      console.log(`[AI-EMPLOYEE-EXECUTOR] No active bot found for workspace=${workspaceId} channel=${channelType}`);
      return new Response(
        JSON.stringify({ success: false, error: "No active bot configured for this channel" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-EMPLOYEE-EXECUTOR] Dispatching bot=${bot.id} type=${bot.type} workspace=${workspaceId}`);

    // ── 2) Load bot settings ─────────────────────────────────
    const { data: settingsData } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("bot_id", bot.id)
      .single();
    const settings = settingsData as BotSettingsRow | null;

    // ── 3) Execute mode ──────────────────────────────────────
    let reply: string = "";
    let replies: string[] = [];
    let actions: SideEffect[] = [];
    let sessionState: string | undefined;
    let collectedVariables: Record<string, unknown> | undefined;
    let runStatus: "success" | "error" | "handover" | "skipped" = "success";

    try {
      if (bot.type === "guided") {
        const result = await runGuided(supabase, bot, settings, body.message, body.conversationId);
        reply = result.reply;
        actions = result.actions;
      } else if (bot.type === "prompt") {
        const result = await runPrompt(
          supabase, bot, settings, body.message, body.conversationId, workspaceId
        );
        reply = result.reply;
        actions = result.actions;
      } else if (bot.type === "flow") {
        const result = await runFlow(
          supabase, bot, settings, body.message, body.conversationId, workspaceId, body.leadId
        );
        reply = result.reply;
        replies = result.replies;
        actions = result.actions;
        sessionState = result.sessionState;
        collectedVariables = result.collectedVariables;
      }

      if (actions.some((a) => a.type === "handover")) {
        runStatus = "handover";
      }
    } catch (execError) {
      console.error("[AI-EMPLOYEE-EXECUTOR] Execution error:", execError);
      runStatus = "error";
      reply = settings?.fallback_message || "Ocorreu um erro. A nossa equipa irá responder em breve.";
    }

    // ── 4) Persist reply as outbound message ─────────────────
    if (reply) {
      await supabase.from("messages").insert({
        workspace_id: workspaceId,
        conversation_id: body.conversationId,
        content: reply,
        direction: "outbound",
        sender_type: "bot",
        sender_id: bot.id,
        status: "sent",
      }).then(({ error }) => {
        if (error) console.warn("[AI-EMPLOYEE-EXECUTOR] Failed to persist outbound message:", error.message);
      });
    }

    // ── 5) Execute side effects ──────────────────────────────
    await executeSideEffects(
      supabase,
      actions,
      workspaceId,
      body.leadId,
      body.conversationId,
      bot.id
    );

    // ── 6) Log run ───────────────────────────────────────────
    const runId = await logRun(supabase, {
      workspaceId,
      botId: bot.id,
      conversationId: body.conversationId,
      status: runStatus,
      inputPayload: { message: body.message, channel: channelType, metadata: body.metadata },
      outputPayload: { reply, actions, sessionState },
    });

    // ── 7) Update analytics (fire-and-forget) ────────────────
    incrementAnalytics(supabase, bot.id, workspaceId, {
      messagesIn: 1,
      messagesOut: reply ? 1 : 0,
      handovers: runStatus === "handover" ? 1 : 0,
    });

    const durationMs = Date.now() - startTime;
    console.log(`[AI-EMPLOYEE-EXECUTOR] Completed in ${durationMs}ms bot=${bot.id} status=${runStatus}`);

    const response: ExecutorResponse = {
      success: runStatus !== "error",
      botId: bot.id,
      botName: bot.name,
      botType: bot.type,
      reply,
      replies: replies.length > 1 ? replies : undefined,
      actions,
      runId,
      sessionState,
      collectedVariables,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[AI-EMPLOYEE-EXECUTOR] Fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
