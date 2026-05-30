// FastCRM WhatsApp Pro — Campaign Dispatcher
// Cron-driven dispatcher that processes pending recipients per campaign,
// honoring throttle (msgs/min), send window and opt-outs.
//
// Invoked by pg_cron every 1 minute. No JWT required (verify_jwt=false in config),
// validates an internal secret to allow manual triggers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "../_shared/cors.ts";
import { zapiCall, safeJson, type ZapiCredentials } from "../_shared/zapi.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Campaign {
  id: string;
  workspace_id: string;
  message_type: string;
  message_text: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  cta_url: string | null;
  cta_label: string | null;
  throttle_per_minute: number;
  send_window_start: string;
  send_window_end: string;
  timezone: string;
  status: string;
  scheduled_at: string | null;
  append_optout_footer: boolean;
  last_dispatched_at: string | null;
}

interface Recipient {
  id: string;
  campaign_id: string;
  workspace_id: string;
  phone: string;
  contact_name: string | null;
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isInWindow(start: string, end: string, tz: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz || "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const now = fmt.format(new Date()); // "HH:mm"
    return now >= start.slice(0, 5) && now <= end.slice(0, 5);
  } catch {
    return true;
  }
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

function renderText(template: string, recipient: Recipient): string {
  return template
    .replaceAll("{{name}}", recipient.contact_name || "")
    .replaceAll("{{phone}}", recipient.phone || "");
}

async function getZapiCreds(supabase: any, workspaceId: string): Promise<ZapiCredentials | null> {
  const { data } = await supabase
    .from("whatsapp_zapi_connections")
    .select("instance_id, instance_token, client_token, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    instanceId: data.instance_id,
    instanceToken: data.instance_token,
    clientToken: data.client_token,
  };
}

async function sendOne(creds: ZapiCredentials, c: Campaign, r: Recipient): Promise<{ ok: boolean; id?: string; err?: string }> {
  const phone = normalizePhone(r.phone);
  let text = c.message_text ? renderText(c.message_text, r) : "";
  if (c.append_optout_footer && c.message_type === "text") {
    text += "\n\n_Para deixar de receber, responde STOP._";
  }

  try {
    if (c.message_type === "image" && c.media_url) {
      const res = await zapiCall(creds, "/send-image", {
        method: "POST",
        body: JSON.stringify({ phone, image: c.media_url, caption: text }),
      });
      const j = await safeJson(res);
      if (!res.ok) return { ok: false, err: j?.message || `HTTP ${res.status}` };
      return { ok: true, id: j?.messageId || j?.id };
    }
    if (c.message_type === "document" && c.media_url) {
      const res = await zapiCall(creds, "/send-document", {
        method: "POST",
        body: JSON.stringify({ phone, document: c.media_url, fileName: "documento.pdf", caption: text }),
      });
      const j = await safeJson(res);
      if (!res.ok) return { ok: false, err: j?.message || `HTTP ${res.status}` };
      return { ok: true, id: j?.messageId || j?.id };
    }
    // Default: text (with optional CTA button)
    if (c.cta_url && c.cta_label) {
      const res = await zapiCall(creds, "/send-button-actions", {
        method: "POST",
        body: JSON.stringify({
          phone,
          message: text,
          buttonActions: [{ id: "1", type: "URL", url: c.cta_url, label: c.cta_label }],
        }),
      });
      const j = await safeJson(res);
      if (!res.ok) return { ok: false, err: j?.message || `HTTP ${res.status}` };
      return { ok: true, id: j?.messageId || j?.id };
    }
    const res = await zapiCall(creds, "/send-text", {
      method: "POST",
      body: JSON.stringify({ phone, message: text }),
    });
    const j = await safeJson(res);
    if (!res.ok) return { ok: false, err: j?.message || `HTTP ${res.status}` };
    return { ok: true, id: j?.messageId || j?.id };
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message : String(e) };
  }
}

async function processCampaign(supabase: any, c: Campaign): Promise<{ sent: number; failed: number; skipped: number }> {
  // 1) Skip opt-outs
  await supabase.rpc("skip_optout_recipients", { p_campaign_id: c.id });

  // 2) Window check
  if (!isInWindow(c.send_window_start, c.send_window_end, c.timezone)) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // 3) Throttle: how many can we send this run (we run every minute)
  const limit = Math.max(1, Math.min(c.throttle_per_minute || 20, 60));

  // 4) Mark campaign as sending if scheduled
  if (c.status === "scheduled") {
    await supabase
      .from("whatsapp_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", c.id);
  }

  // 5) Fetch credentials
  const creds = await getZapiCreds(supabase, c.workspace_id);
  if (!creds) {
    await supabase
      .from("whatsapp_campaigns")
      .update({ status: "failed", error_message: "Sem instância WhatsApp ligada", completed_at: new Date().toISOString() })
      .eq("id", c.id);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // 6) Fetch pending batch
  const { data: recipients } = await supabase
    .from("whatsapp_campaign_recipients")
    .select("id, campaign_id, workspace_id, phone, contact_name")
    .eq("campaign_id", c.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!recipients || recipients.length === 0) {
    // Mark complete if nothing left
    const { count } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .in("status", ["pending", "sending"]);
    if ((count ?? 0) === 0) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", c.id);
    }
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  const intervalMs = Math.floor(60_000 / limit);

  for (const r of recipients as Recipient[]) {
    // Re-check opt-out (race condition)
    const { data: opt } = await supabase
      .from("whatsapp_optouts")
      .select("id")
      .eq("workspace_id", c.workspace_id)
      .eq("phone", r.phone)
      .maybeSingle();
    if (opt) {
      await supabase
        .from("whatsapp_campaign_recipients")
        .update({ status: "skipped_optout" })
        .eq("id", r.id);
      continue;
    }

    const result = await sendOne(creds, c, r);
    if (result.ok) {
      sent++;
      await supabase
        .from("whatsapp_campaign_recipients")
        .update({
          status: "sent",
          provider_message_id: result.id ?? null,
          sent_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq("id", r.id);
    } else {
      failed++;
      await supabase
        .from("whatsapp_campaign_recipients")
        .update({
          status: "failed",
          error_message: result.err || "unknown",
          failed_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq("id", r.id);
    }

    // Throttle pause between sends
    if (intervalMs > 50) await new Promise((r) => setTimeout(r, intervalMs));
  }

  // 7) Update aggregate counters
  await supabase.rpc("noop_compat", {}).catch(() => null);
  const { data: countsData } = await supabase
    .from("whatsapp_campaign_recipients")
    .select("status")
    .eq("campaign_id", c.id);
  const counts = (countsData || []).reduce(
    (acc: Record<string, number>, x: { status: string }) => {
      acc[x.status] = (acc[x.status] || 0) + 1;
      return acc;
    },
    {},
  );
  const remaining = (counts["pending"] || 0) + (counts["sending"] || 0);
  await supabase
    .from("whatsapp_campaigns")
    .update({
      sent_count: counts["sent"] || 0,
      failed_count: counts["failed"] || 0,
      skipped_count: counts["skipped_optout"] || 0,
      last_dispatched_at: new Date().toISOString(),
      ...(remaining === 0
        ? { status: "completed", completed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", c.id);

  return { sent, failed, skipped: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: require shared CRON_SECRET for manual/cron invocations
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret =
    req.headers.get("x-cron-secret") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!cronSecret || providedSecret !== cronSecret) {
    return jsonRes({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);



    // Find campaigns ready to dispatch
    const nowIso = new Date().toISOString();
    const { data: campaigns, error } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .in("status", ["sending", "scheduled"])
      .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`)
      .limit(20);

    if (error) {
      console.error("[campaign-dispatch] fetch error", error);
      return jsonRes({ ok: false, error: error.message });
    }

    const results: any[] = [];
    for (const c of (campaigns || []) as Campaign[]) {
      try {
        const r = await processCampaign(supabase, c);
        results.push({ id: c.id, ...r });
      } catch (e) {
        console.error("[campaign-dispatch] error", c.id, e);
        results.push({ id: c.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return jsonRes({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("[campaign-dispatch] fatal", e);
    return jsonRes({ ok: false, fallback: true, error: e instanceof Error ? e.message : String(e) });
  }
});
