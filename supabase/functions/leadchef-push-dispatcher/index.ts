// LeadChef Push Dispatcher — sends Web Push notifications via VAPID.
// Modes:
//   - { mode: "test", workspace_id } → sends a test notification to the caller's own subscriptions
//   - { mode: "send", subscription_ids?: [], workspace_id, title, body, url? } → admin/server send
//   - default (no body / cron) → drains leadchef_push_queue (status=pending, scheduled_at <= now)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("LEADCHEF_VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("LEADCHEF_VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("LEADCHEF_VAPID_SUBJECT") ?? "mailto:noreply@fastcrm.lovable.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); }
  catch (e) { console.error("VAPID setup error", e); }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface PushPayload { title: string; body: string; url?: string; tag?: string; payload?: any; }

async function sendOne(sub: any, payload: PushPayload): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12 }
    );
    return { ok: true };
  } catch (e: any) {
    const code = e?.statusCode;
    if (code === 404 || code === 410) return { ok: false, gone: true, error: `gone:${code}` };
    return { ok: false, error: e?.message ?? "send_error" };
  }
}

async function dispatchToUser(workspaceId: string, userId: string, payload: PushPayload) {
  const { data: subs } = await admin
    .from("leadchef_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("workspace_id", workspaceId).eq("user_id", userId).eq("enabled", true);
  let sent = 0, failed = 0;
  for (const s of subs ?? []) {
    const r = await sendOne(s, payload);
    if (r.ok) {
      sent++;
      await admin.from("leadchef_push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } else {
      failed++;
      if (r.gone) await admin.from("leadchef_push_subscriptions").update({ enabled: false }).eq("id", s.id);
    }
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ fallback: true, error: "VAPID keys not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const mode = body.mode ?? "queue";

    // Test mode → caller-only
    if (mode === "test") {
      const auth = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u.user) {
        return new Response(JSON.stringify({ fallback: true, error: "unauthorized" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const result = await dispatchToUser(body.workspace_id, u.user.id, {
        title: "FastCRM · LeadChef",
        body: "Notificações ativas neste dispositivo ✓",
        url: "/dashboard/leadchef/today",
        tag: "leadchef-test",
      });
      return new Response(JSON.stringify({ ok: true, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Direct send (server/admin context)
    if (mode === "send") {
      const { workspace_id, user_id, title, body: msg, url, tag, payload } = body;
      if (!workspace_id || !user_id || !title || !msg) {
        return new Response(JSON.stringify({ fallback: true, error: "missing_fields" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const r = await dispatchToUser(workspace_id, user_id, { title, body: msg, url, tag, payload });
      return new Response(JSON.stringify({ ok: true, ...r }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: drain queue
    const { data: jobs } = await admin
      .from("leadchef_push_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(50);

    let processed = 0, sent = 0, failed = 0;
    for (const j of jobs ?? []) {
      processed++;
      const r = await dispatchToUser(j.workspace_id, j.user_id, {
        title: j.title, body: j.body, url: j.url ?? undefined, payload: j.payload ?? undefined,
      });
      sent += r.sent; failed += r.failed;
      await admin.from("leadchef_push_queue").update({
        status: r.sent > 0 ? "sent" : "failed",
        sent_at: r.sent > 0 ? new Date().toISOString() : null,
        attempts: (j.attempts ?? 0) + 1,
        last_error: r.sent > 0 ? null : `sent=${r.sent} failed=${r.failed}`,
      }).eq("id", j.id);
    }
    return new Response(JSON.stringify({ ok: true, processed, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("dispatcher error", e);
    return new Response(JSON.stringify({ fallback: true, error: e?.message ?? "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
