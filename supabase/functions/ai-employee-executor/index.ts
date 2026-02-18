// ============================================================
// FastCRM | AI Employee Executor  v2
// POST /functions/v1/ai-employee-executor
//
// Input contract (v2):
// {
//   conversation: { conversation_id, external_thread_id, contact_id }
//   message:      { message_id, direction, text, attachments[], timestamp }
//   context:      { workspace_id, channel_type, channel_identifier,
//                   page_url, utm, locale, timezone }
//   options:      { dry_run, force_bot_id, debug }
// }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-channel-type, x-channel-identifier",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── INPUT SCHEMA ────────────────────────────────────────────

interface Attachment {
  type: "image" | "pdf" | "audio" | "other";
  url: string;
  name?: string | null;
}

interface IncomingMessage {
  message_id?: string | null;
  direction: "in";
  text: string;
  attachments?: Attachment[];
  timestamp: string;
}

interface ConversationRef {
  conversation_id?: string | null;
  external_thread_id?: string | null;
  contact_id?: string | null;
}

interface UTM {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}

interface RequestContext {
  workspace_id: string;
  channel_type: "website_widget" | "whatsapp" | "instagram" | "inbox" | "landing";
  channel_identifier?: string | null;
  page_url?: string | null;
  utm?: UTM;
  locale?: string;
  timezone?: string;
}

interface RequestOptions {
  dry_run?: boolean;
  force_bot_id?: string | null;
  debug?: boolean;
}

interface ExecutorRequest {
  conversation: ConversationRef;
  message: IncomingMessage;
  context: RequestContext;
  options?: RequestOptions;
}

// ─── OUTPUT TYPES ────────────────────────────────────────────

export type ExecutorStatus = "ok" | "handover" | "blocked" | "error";

export type ActionType =
  | "create_lead"
  | "update_contact"
  | "create_opportunity"
  | "book_meeting"
  | "trigger_automation"
  | "human_handover";

export interface OutputAction {
  type: ActionType;
  payload: Record<string, unknown>;
}

export interface ExecutorResponse {
  status: ExecutorStatus;
  bot: {
    bot_id: string;
    type: "guided" | "prompt" | "flow";
    status: "active" | "paused" | "draft" | "archived";
  };
  reply: {
    text: string;
    attachments: unknown[];
  };
  actions: OutputAction[];
  state: {
    conversation_id: string;
    contact_id: string | null;
    memory_updated: boolean;
  };
  meta: {
    latency_ms: number;
    tokens_used: number;
    rate_limited: boolean;
  };
  debug?: Record<string, unknown>;
}

// ─── INTERNAL TYPES ──────────────────────────────────────────

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

interface SideEffect {
  type: "create_lead" | "update_lead" | "handover" | "booking" | "tag" | "automation";
  payload: Record<string, unknown>;
}

// ─── BOT RESOLUTION ──────────────────────────────────────────

async function resolveBot(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  channelType: string,
  channelIdentifier: string | null | undefined,
  forceBotId?: string | null
): Promise<BotRow | null> {
  // Direct override
  if (forceBotId) {
    const { data } = await supabase
      .from("bots")
      .select("*")
      .eq("id", forceBotId)
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .single();
    return (data as BotRow) || null;
  }

  // Exact channel match (channel_type + channel_identifier)
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

  // Fallback: any active bot for this channel_type
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

// ─── CONVERSATION RESOLUTION ─────────────────────────────────

/**
 * Resolve or create a conversation record.
 * Priority: conversation_id → external_thread_id → create new.
 */
async function resolveConversation(
  supabase: ReturnType<typeof createClient>,
  convRef: ConversationRef,
  workspaceId: string,
  channelType: string,
  channelIdentifier: string | null | undefined,
  utm?: UTM,
  pageUrl?: string | null
): Promise<string | null> {
  // Already have an id
  if (convRef.conversation_id) return convRef.conversation_id;

  // Try external_thread_id lookup
  if (convRef.external_thread_id) {
    const { data: found } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("external_thread_id", convRef.external_thread_id)
      .single();
    if (found?.id) return found.id;
  }

  // Create a new conversation shell
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      channel: channelType,
      external_thread_id: convRef.external_thread_id || null,
      contact_id: convRef.contact_id || null,
      status: "open",
      source: channelType,
      metadata: {
        utm: utm || null,
        page_url: pageUrl || null,
        channel_identifier: channelIdentifier || null,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AI-EMPLOYEE-EXECUTOR] Failed to create conversation:", error.message);
    return null;
  }

  return created?.id || null;
}

// ─── HELPERS ─────────────────────────────────────────────────

function shouldHandover(text: string, settings: BotSettingsRow | null): boolean {
  if (!settings?.handover_enabled) return false;
  const keywords = settings.trigger_keywords || [];
  if (!keywords.length) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function extractLeadData(
  text: string,
  settings: BotSettingsRow | null,
  locale?: string
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!settings) return result;

  if (settings.capture_email) {
    const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (m) result.email = m[0];
  }
  if (settings.capture_phone) {
    const m = text.match(/(\+?[0-9]{9,15})/);
    if (m) result.phone = m[0];
  }
  return result;
}

/** Build locale-aware fallback reply */
function localeFallback(settings: BotSettingsRow | null, locale?: string): string {
  if (settings?.fallback_message) return settings.fallback_message;
  const lang = (locale || "pt-PT").slice(0, 2).toLowerCase();
  if (lang === "en") return "Thank you for your message! Our team will reply shortly.";
  if (lang === "es") return "¡Gracias por tu mensaje! Nuestro equipo te responderá en breve.";
  return "Obrigado pela sua mensagem! A nossa equipa irá responder em breve.";
}

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
): Promise<void> {
  const { error } = await supabase.rpc("increment_bot_analytics", {
    p_bot_id: botId,
    p_workspace_id: workspaceId,
    p_conversations: delta.conversations || 0,
    p_messages_in: delta.messagesIn || 0,
    p_messages_out: delta.messagesOut || 0,
    p_leads: delta.leads || 0,
    p_handovers: delta.handovers || 0,
  });
  if (error) {
    console.warn("[AI-EMPLOYEE-EXECUTOR] Analytics RPC failed (non-fatal):", error.message);
  }
}

// ─── MODE EXECUTORS ──────────────────────────────────────────

/** GUIDED — rule-based, no LLM */
async function runGuided(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  text: string,
  conversationId: string,
  locale?: string
): Promise<{ reply: string; actions: SideEffect[] }> {
  const actions: SideEffect[] = [];

  if (shouldHandover(text, settings)) {
    actions.push({
      type: "handover",
      payload: { conversationId, reason: "contact_request", assignToUserId: settings?.handover_user_id, botId: bot.id },
    });
    return { reply: localeFallback(settings, locale), actions };
  }

  const extracted = extractLeadData(text, settings, locale);
  if (Object.keys(extracted).length > 0) {
    actions.push({ type: "update_lead", payload: extracted });
  }

  const isGreeting = /^(ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|hi|hello|oi|hey)\b/i.test(text.trim());
  if (isGreeting && settings?.greeting_message) {
    return { reply: settings.greeting_message, actions };
  }

  return { reply: localeFallback(settings, locale), actions };
}

/** PROMPT — LLM-powered with persona + KB context */
async function runPrompt(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  text: string,
  attachments: Attachment[],
  conversationId: string,
  workspaceId: string,
  locale?: string,
  debug?: boolean
): Promise<{ reply: string; actions: SideEffect[]; tokensUsed: number; debugInfo?: Record<string, unknown> }> {
  const actions: SideEffect[] = [];
  const debugInfo: Record<string, unknown> = {};

  if (shouldHandover(text, settings)) {
    actions.push({
      type: "handover",
      payload: { conversationId, reason: "contact_request", assignToUserId: settings?.handover_user_id, botId: bot.id },
    });
    return { reply: localeFallback(settings, locale), actions };
  }

  // Fetch last 12 messages for context
  const { data: history } = await supabase
    .from("messages")
    .select("content, direction, sender_type, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  const conversationHistory = (history || [])
    .reverse()
    .map((m: any) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content as string,
    }));

  if (debug) debugInfo.historyCount = conversationHistory.length;

  // Persona
  let personaBlock = "";
  if (bot.ai_profile_id) {
    const { data: persona } = await supabase
      .from("ai_personas")
      .select("name, tone_of_voice, system_prompt, technical_depth, language_style, limitations")
      .eq("id", bot.ai_profile_id)
      .single();

    if (persona) {
      personaBlock = [
        `## Persona: ${(persona as any).name}`,
        `- Tom: ${(persona as any).tone_of_voice || "profissional"}`,
        `- Estilo: ${(persona as any).language_style || "conversacional"}`,
        (persona as any).system_prompt ? `\nInstruções:\n${(persona as any).system_prompt}` : "",
        (persona as any).limitations?.length
          ? `\nLimitações:\n${((persona as any).limitations as string[]).map((l) => `- ${l}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (debug) debugInfo.personaId = bot.ai_profile_id;
    }
  }

  // Knowledge base
  let kbBlock = "";
  if (bot.knowledge_base_id) {
    const keywords = text
      .toLowerCase()
      .replace(/[?!.,;:()]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6);

    if (keywords.length > 0) {
      const orClauses = keywords.map((kw) => `title.ilike.%${kw}%,content.ilike.%${kw}%`).join(",");
      const { data: entries } = await supabase
        .from("knowledge_entries")
        .select("title, content")
        .eq("workspace_id", workspaceId)
        .eq("knowledge_base_id", bot.knowledge_base_id)
        .eq("status", "validated")
        .or(orClauses)
        .limit(4);

      if (entries?.length) {
        kbBlock = `\n## Base de Conhecimento:\n${(entries as any[])
          .map((e, i) => `### ${i + 1}. ${e.title}\n${e.content}`)
          .join("\n\n")}`;
        if (debug) debugInfo.kbEntriesCount = entries.length;
      }
    }
  }

  // Attachments hint
  const attachmentHint =
    attachments?.length
      ? `\n\nO utilizador enviou ${attachments.length} anexo(s): ${attachments.map((a) => `${a.type}${a.name ? ` (${a.name})` : ""}`).join(", ")}.`
      : "";

  const langHint = locale?.startsWith("en")
    ? "Always reply in English."
    : locale?.startsWith("es")
    ? "Responde siempre en español."
    : "Responde sempre em Português de Portugal.";

  const systemPrompt = [
    `És o assistente virtual "${bot.name}".`,
    personaBlock,
    kbBlock,
    `\nREGRAS:\n- ${langHint}\n- Sê conciso e útil.\n- Não inventes informação.\n- Se não souberes, encaminha para a equipa.`,
    attachmentHint,
  ]
    .filter(Boolean)
    .join("\n");

  if (debug) debugInfo.systemPromptLength = systemPrompt.length;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[AI-EMPLOYEE-EXECUTOR] LOVABLE_API_KEY not set – fallback reply");
    return { reply: localeFallback(settings, locale), actions, debugInfo };
  }

  const llmResp = await fetch("https://api.lovable.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: text },
      ],
      max_tokens: 600,
      temperature: 0.65,
    }),
  });

  if (!llmResp.ok) {
    const errText = await llmResp.text();
    throw new Error(`LLM call failed ${llmResp.status}: ${errText}`);
  }

  const llmData = await llmResp.json();
  const reply =
    llmData.choices?.[0]?.message?.content?.trim() || localeFallback(settings, locale);
  const tokensUsed: number =
    llmData.usage?.total_tokens ?? llmData.usage?.prompt_tokens ?? 0;

  const extracted = extractLeadData(text, settings, locale);
  if (Object.keys(extracted).length > 0) {
    actions.push({ type: "update_lead", payload: extracted });
  }

  if (debug) debugInfo.model = "google/gemini-2.5-flash";

  return { reply, actions, tokensUsed, debugInfo };
}

/** FLOW — delegates to existing flow-engine function */
async function runFlow(
  supabase: ReturnType<typeof createClient>,
  bot: BotRow,
  settings: BotSettingsRow | null,
  text: string,
  conversationId: string,
  workspaceId: string,
  leadId: string | undefined,
  locale?: string
): Promise<{
  reply: string;
  replies: string[];
  actions: SideEffect[];
  sessionState: string;
  collectedVariables: Record<string, unknown>;
}> {
  const actions: SideEffect[] = [];

  if (shouldHandover(text, settings)) {
    actions.push({
      type: "handover",
      payload: { conversationId, reason: "contact_request", assignToUserId: settings?.handover_user_id, botId: bot.id },
    });
    return {
      reply: localeFallback(settings, locale),
      replies: [],
      actions,
      sessionState: "handed_off",
      collectedVariables: {},
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const flowResp = await fetch(`${supabaseUrl}/functions/v1/flow-engine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ action: "continue", workspaceId, conversationId, leadId, userMessage: text }),
  });

  if (!flowResp.ok) {
    const errText = await flowResp.text();
    throw new Error(`flow-engine failed ${flowResp.status}: ${errText}`);
  }

  const flowData = await flowResp.json();

  if (flowData.sessionState === "handed_off") {
    actions.push({
      type: "handover",
      payload: { conversationId, reason: "contact_request", botId: bot.id, assignToUserId: settings?.handover_user_id },
    });
  }

  const vars: Record<string, unknown> = flowData.collectedVariables || {};
  const leadPayload: Record<string, string> = {};
  if (vars.email) leadPayload.email = String(vars.email);
  if (vars.phone) leadPayload.phone = String(vars.phone);
  if (vars.name) leadPayload.name = String(vars.name);
  if (Object.keys(leadPayload).length > 0) {
    actions.push({ type: "update_lead", payload: leadPayload });
  }

  const replies: string[] = flowData.responses || [];
  return {
    reply: replies[0] || localeFallback(settings, locale),
    replies,
    actions,
    sessionState: flowData.sessionState || "active",
    collectedVariables: vars,
  };
}

// ─── SIDE EFFECTS ────────────────────────────────────────────

async function executeSideEffects(
  supabase: ReturnType<typeof createClient>,
  actions: SideEffect[],
  workspaceId: string,
  leadId: string | undefined,
  conversationId: string,
  botId: string
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await Promise.allSettled(
    actions.map(async (action) => {
      switch (action.type) {
        case "handover":
          await fetch(`${supabaseUrl}/functions/v1/human-handover`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              workspaceId,
              conversationId,
              reason: action.payload.reason || "contact_request",
              assignToUserId: action.payload.assignToUserId,
              botId,
            }),
          });
          break;

        case "update_lead":
          if (leadId) {
            await supabase.from("leads").update(action.payload).eq("id", leadId).eq("workspace_id", workspaceId);
          }
          break;

        case "create_lead":
          await supabase.from("leads").insert({ workspace_id: workspaceId, ...action.payload });
          break;

        case "tag":
          if (leadId) {
            const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).single();
            const current: string[] = (lead as any)?.tags || [];
            const tag = String(action.payload.tag);
            if (!current.includes(tag)) {
              await supabase.from("leads").update({ tags: [...current, tag] }).eq("id", leadId);
            }
          }
          break;

        default:
          console.log(`[AI-EMPLOYEE-EXECUTOR] Unhandled effect: ${action.type}`);
      }
    })
  );
}

// ─── MAIN HANDLER ────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── Parse & validate ────────────────────────────────────
    let body: ExecutorRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { conversation, message, context, options = {} } = body;

    if (!context?.workspace_id) {
      return new Response(
        JSON.stringify({ success: false, error: "context.workspace_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!message?.text) {
      return new Response(
        JSON.stringify({ success: false, error: "message.text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = context.workspace_id;
    const channelType = context.channel_type || "inbox";
    const channelIdentifier = context.channel_identifier;
    const locale = context.locale || "pt-PT";
    const isDryRun = options.dry_run === true;
    const isDebug = options.debug === true;

    // Service-role client (needed for cross-workspace ops)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1) Resolve bot ───────────────────────────────────────
    const bot = await resolveBot(
      supabase, workspaceId, channelType, channelIdentifier, options.force_bot_id
    );

    if (!bot) {
      console.log(`[AI-EMPLOYEE-EXECUTOR] No active bot | workspace=${workspaceId} channel=${channelType}`);
      return new Response(
        JSON.stringify({ success: false, error: "No active bot configured for this channel" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2) Resolve conversation id ───────────────────────────
    const conversationId = await resolveConversation(
      supabase, conversation, workspaceId, channelType, channelIdentifier, context.utm, context.page_url
    );

    if (!conversationId) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not resolve or create conversation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3) Resolve lead from contact ─────────────────────────
    let leadId: string | undefined;
    if (conversation.contact_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("contact_id", conversation.contact_id)
        .eq("workspace_id", workspaceId)
        .limit(1)
        .single();
      leadId = (lead as any)?.id;
    }

    // ── 4) Load bot settings ─────────────────────────────────
    const { data: settingsData } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("bot_id", bot.id)
      .single();
    const settings = settingsData as BotSettingsRow | null;

    // ── 5) Persist inbound message ───────────────────────────
    if (!isDryRun && message.message_id) {
      // Only persist if not already stored (external_message_id dedup)
      await supabase.from("messages").upsert(
        {
          workspace_id: workspaceId,
          conversation_id: conversationId,
          external_message_id: message.message_id,
          content: message.text,
          direction: "inbound",
          sender_type: "contact",
          status: "delivered",
          created_at: message.timestamp,
        },
        { onConflict: "workspace_id,external_message_id", ignoreDuplicates: true }
      );
    }

    // ── 6) Execute bot mode ──────────────────────────────────
    let replyText = "";
    let internalActions: SideEffect[] = [];
    let tokensUsed = 0;
    let debugPayload: Record<string, unknown> | undefined;
    let runStatus: "success" | "error" | "handover" | "skipped" = "success";
    let memoryUpdated = false;

    try {
      if (bot.type === "guided") {
        const r = await runGuided(supabase, bot, settings, message.text, conversationId, locale);
        replyText = r.reply;
        internalActions = r.actions;
      } else if (bot.type === "prompt") {
        const r = await runPrompt(
          supabase, bot, settings, message.text, message.attachments || [],
          conversationId, workspaceId, locale, isDebug
        );
        replyText = r.reply;
        internalActions = r.actions;
        tokensUsed = r.tokensUsed;
        memoryUpdated = true;
        if (isDebug) debugPayload = r.debugInfo;
      } else if (bot.type === "flow") {
        const r = await runFlow(
          supabase, bot, settings, message.text, conversationId, workspaceId, leadId, locale
        );
        replyText = r.reply;
        internalActions = r.actions;
        memoryUpdated = true;
      }

      if (internalActions.some((a) => a.type === "handover")) runStatus = "handover";
    } catch (execErr) {
      console.error("[AI-EMPLOYEE-EXECUTOR] Execution error:", execErr);
      runStatus = "error";
      replyText = localeFallback(settings, locale);
    }

    // ── 7) Persist outbound reply ────────────────────────────
    if (!isDryRun && replyText) {
      await supabase.from("messages").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        content: replyText,
        direction: "outbound",
        sender_type: "bot",
        sender_id: bot.id,
        status: "sent",
      });
    }

    // ── 8) Side effects (parallel) ───────────────────────────
    if (!isDryRun) {
      await executeSideEffects(supabase, internalActions, workspaceId, leadId, conversationId, bot.id);
    }

    // ── 9) Log run ───────────────────────────────────────────
    await logRun(supabase, {
      workspaceId,
      botId: bot.id,
      conversationId,
      status: runStatus,
      inputPayload: {
        message_id: message.message_id,
        text: message.text,
        attachments: message.attachments,
        channel: channelType,
        locale,
        dry_run: isDryRun,
        utm: context.utm,
      },
      outputPayload: { reply: replyText, internalActions, tokens_used: tokensUsed },
    });

    // ── 10) Analytics (fire-and-forget) ─────────────────────
    if (!isDryRun) {
      incrementAnalytics(supabase, bot.id, workspaceId, {
        messagesIn: 1,
        messagesOut: replyText ? 1 : 0,
        handovers: runStatus === "handover" ? 1 : 0,
      });
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[AI-EMPLOYEE-EXECUTOR] bot=${bot.id} type=${bot.type} status=${runStatus} dry=${isDryRun} ${durationMs}ms`
    );

    // ── 11) Map internal actions → output contract ───────────
    const outputActions: OutputAction[] = internalActions
      .filter((a) => a.type !== "update_lead") // internal-only, not surfaced
      .map((a): OutputAction | null => {
        if (a.type === "handover") {
          return {
            type: "human_handover",
            payload: {
              assignee_user_id: (a.payload.assignToUserId as string | null) ?? null,
              assignee_role: (a.payload.handover_role as string | null) ?? null,
            },
          };
        }
        if (a.type === "create_lead") {
          return { type: "create_lead", payload: { lead_id: a.payload.id ?? null } };
        }
        if (a.type === "automation") {
          return { type: "trigger_automation", payload: { rule_id: a.payload.rule_id ?? null } };
        }
        if (a.type === "booking") {
          return { type: "book_meeting", payload: { event_id: a.payload.event_id ?? null } };
        }
        return null;
      })
      .filter((a): a is OutputAction => a !== null);

    // ── 12) Derive top-level status ──────────────────────────
    const executorStatus: ExecutorStatus =
      runStatus === "error" ? "error" :
      runStatus === "handover" ? "handover" :
      "ok";

    const resp: ExecutorResponse = {
      status: executorStatus,
      bot: {
        bot_id: bot.id,
        type: bot.type,
        status: bot.status,
      },
      reply: {
        text: replyText,
        attachments: [],
      },
      actions: outputActions,
      state: {
        conversation_id: conversationId,
        contact_id: conversation.contact_id ?? null,
        memory_updated: memoryUpdated,
      },
      meta: {
        latency_ms: durationMs,
        tokens_used: tokensUsed,
        rate_limited: false,
      },
      debug: isDebug ? { ...debugPayload, run_status: runStatus } : undefined,
    };

    return new Response(JSON.stringify(resp), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[AI-EMPLOYEE-EXECUTOR] Fatal:", err);
    const durationMs = Date.now() - startTime;
    const errResp: ExecutorResponse = {
      status: "error",
      bot: { bot_id: "", type: "prompt", status: "draft" },
      reply: { text: "", attachments: [] },
      actions: [],
      state: { conversation_id: null as unknown as string, contact_id: null, memory_updated: false },
      meta: { latency_ms: durationMs, tokens_used: 0, rate_limited: false },
      debug: { error: err instanceof Error ? err.message : "Internal server error" },
    };
    return new Response(
      JSON.stringify(errResp),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

