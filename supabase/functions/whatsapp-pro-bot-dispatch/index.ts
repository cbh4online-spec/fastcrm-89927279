// FastCRM WhatsApp Pro — Bot rules dispatcher (keyword auto-replies)
// Runs every minute via pg_cron. Scans recent unprocessed inbound messages
// on whatsapp channels and applies bot rules (priority order, first-match wins).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BotRule {
  id: string;
  workspace_id: string;
  name: string;
  priority: number;
  match_type: "exact" | "contains" | "starts_with" | "regex";
  case_sensitive: boolean;
  keywords: string[];
  reply_text: string | null;
  reply_media_url: string | null;
  reply_media_mime_type: string | null;
  attach_product_id: string | null;
  send_once_per_conversation: boolean;
  cooldown_minutes: number;
  handoff_to_human: boolean;
  handoff_assign_to_user_id: string | null;
  respect_working_hours: boolean;
  working_hours_start: string | null;
  working_hours_end: string | null;
  working_days: number[];
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function inWorkingHours(rule: BotRule, now = new Date()): boolean {
  if (!rule.respect_working_hours) return true;
  // Use Lisbon-ish local hours (no per-workspace tz here for simplicity)
  const dow = ((now.getUTCDay() + 6) % 7) + 1; // 1=Mon..7=Sun in Postgres convention
  if (!rule.working_days?.includes(dow)) return false;
  if (!rule.working_hours_start || !rule.working_hours_end) return true;
  const [sh, sm] = rule.working_hours_start.split(":").map(Number);
  const [eh, em] = rule.working_hours_end.split(":").map(Number);
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}

function matchRule(rule: BotRule, text: string): string | null {
  if (!text) return null;
  const haystack = rule.case_sensitive ? text : text.toLowerCase();
  for (const kw of rule.keywords ?? []) {
    if (!kw) continue;
    const needle = rule.case_sensitive ? kw : kw.toLowerCase();
    if (rule.match_type === "exact" && haystack.trim() === needle) return kw;
    if (rule.match_type === "contains" && haystack.includes(needle)) return kw;
    if (rule.match_type === "starts_with" && haystack.startsWith(needle)) return kw;
    if (rule.match_type === "regex") {
      try {
        const re = new RegExp(kw, rule.case_sensitive ? "" : "i");
        if (re.test(text)) return kw;
      } catch { /* invalid regex — skip */ }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const lookbackMin = 5;
    const since = new Date(Date.now() - lookbackMin * 60 * 1000).toISOString();

    // 1. Find recent inbound text messages on whatsapp channel that don't already have a bot log
    const { data: messages, error } = await admin
      .from("messages")
      .select("id, conversation_id, workspace_id, content, sent_at, message_type, metadata, conversations:conversation_id(id, channel, contact_id, assigned_to)")
      .eq("direction", "inbound")
      .eq("message_type", "text")
      .gte("sent_at", since)
      .order("sent_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("[wa-bot] query messages error", error);
      return ok({ ok: false, internal_error: error.message, processed: 0 });
    }

    let processed = 0;
    let matched = 0;

    for (const msg of messages ?? []) {
      const conv = (msg as any).conversations;
      if (!conv || conv.channel !== "whatsapp") continue;

      // Skip if already processed by bot for this message
      const { data: existing } = await admin
        .from("whatsapp_bot_rule_logs")
        .select("id")
        .eq("message_id", msg.id)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      processed++;

      // Load active rules for workspace ordered by priority
      const { data: rules } = await admin
        .from("whatsapp_bot_rules")
        .select("*")
        .eq("workspace_id", msg.workspace_id)
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (!rules || rules.length === 0) continue;

      let firedRuleId: string | null = null;

      for (const rule of rules as BotRule[]) {
        if (!inWorkingHours(rule)) continue;
        const matchedKw = matchRule(rule, String(msg.content ?? ""));
        if (!matchedKw) continue;

        // send_once_per_conversation check
        if (rule.send_once_per_conversation) {
          const { data: prev } = await admin
            .from("whatsapp_bot_rule_logs")
            .select("id")
            .eq("rule_id", rule.id)
            .eq("conversation_id", msg.conversation_id)
            .eq("reply_sent", true)
            .limit(1)
            .maybeSingle();
          if (prev) continue;
        }

        // cooldown
        if (rule.cooldown_minutes > 0) {
          const cutoff = new Date(Date.now() - rule.cooldown_minutes * 60 * 1000).toISOString();
          const { data: recent } = await admin
            .from("whatsapp_bot_rule_logs")
            .select("id")
            .eq("rule_id", rule.id)
            .eq("conversation_id", msg.conversation_id)
            .gte("created_at", cutoff)
            .limit(1)
            .maybeSingle();
          if (recent) continue;
        }

        firedRuleId = rule.id;
        matched++;

        // Send reply via whatsapp-pro-send
        let replySent = false;
        let errMsg: string | null = null;
        try {
          if (rule.reply_text || rule.reply_media_url || rule.attach_product_id) {
            const sendBody: Record<string, unknown> = {
              workspaceId: msg.workspace_id,
              conversationId: msg.conversation_id,
              contactId: conv.contact_id ?? null,
              messageType: rule.attach_product_id ? "product" : (rule.reply_media_url ? "image" : "text"),
              text: rule.reply_text ?? "",
              mediaUrl: rule.reply_media_url ?? undefined,
              mediaMimeType: rule.reply_media_mime_type ?? undefined,
              productId: rule.attach_product_id ?? undefined,
              metadata: { source: "bot_rule", rule_id: rule.id, matched_keyword: matchedKw },
            };
            const resp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-pro-send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify(sendBody),
            });
            const json = await resp.json().catch(() => ({}));
            replySent = resp.ok && json?.success !== false;
            if (!replySent) errMsg = `send_failed:${resp.status}:${JSON.stringify(json).slice(0, 200)}`;
          }
        } catch (e) {
          errMsg = e instanceof Error ? e.message : String(e);
        }

        // Handoff
        let handoffTriggered = false;
        if (rule.handoff_to_human) {
          try {
            const updates: Record<string, unknown> = {};
            if (rule.handoff_assign_to_user_id) updates.assigned_to = rule.handoff_assign_to_user_id;
            updates.metadata = { ...(conv.metadata ?? {}), bot_handoff_at: new Date().toISOString(), bot_handoff_rule_id: rule.id };
            await admin.from("conversations").update(updates).eq("id", msg.conversation_id);
            handoffTriggered = true;
          } catch (e) {
            errMsg = (errMsg ? errMsg + ";" : "") + "handoff_failed:" + (e instanceof Error ? e.message : String(e));
          }
        }

        // Log
        await admin.from("whatsapp_bot_rule_logs").insert({
          workspace_id: msg.workspace_id,
          rule_id: rule.id,
          conversation_id: msg.conversation_id,
          message_id: msg.id,
          matched_keyword: matchedKw,
          message_excerpt: String(msg.content ?? "").slice(0, 280),
          reply_sent: replySent,
          handoff_triggered: handoffTriggered,
          error: errMsg,
        });

        // Update rule stats
        await admin
          .from("whatsapp_bot_rules")
          .update({
            match_count: ((rule as any).match_count ?? 0) + 1,
            last_matched_at: new Date().toISOString(),
          })
          .eq("id", rule.id);

        break; // first-match wins
      }

      // If no rule fired, still record a "no-match" placeholder? skip — keeps logs clean.
      void firedRuleId;
    }

    return ok({ ok: true, processed, matched });
  } catch (e) {
    console.error("[wa-bot] fatal", e);
    return ok({ ok: false, internal_error: e instanceof Error ? e.message : String(e), processed: 0 });
  }
});
