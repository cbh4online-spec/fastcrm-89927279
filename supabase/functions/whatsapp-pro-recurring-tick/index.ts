// WhatsApp Recurring Campaigns — tick (cron-driven dispatcher).
// Corre periodicamente, encontra campanhas com next_run_at <= now() e:
//  1) expande contactos do alvo (segment / tags / all)
//  2) cria entradas em whatsapp_scheduled_messages com jitter
//  3) atualiza next_run_at, run_count, last_run_at, status
//
// Resilient pattern: erros respondidos como 200 OK + fallback para evitar crash.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Campaign {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  body: string;
  media_url: string | null;
  media_mime_type: string | null;
  cta_url: string | null;
  target_type: "segment" | "tags" | "all";
  segment_id: string | null;
  target_tags: string[] | null;
  frequency: "daily" | "weekly" | "monthly";
  weekly_days: number[] | null;
  monthly_day: number | null;
  run_time: string;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  max_runs: number | null;
  run_count: number;
  jitter_minutes: number;
  next_run_at: string | null;
  status: string;
}

function parseRunTime(t: string): { h: number; m: number } {
  const [h, m] = (t || "09:00").split(":").map((s) => parseInt(s, 10));
  return { h: isFinite(h) ? h : 9, m: isFinite(m) ? m : 0 };
}

/** Calcula próximo next_run_at em UTC, partindo de uma "data base" no fuso da campanha. */
function computeNextRunAt(c: Campaign, fromIso: string): string | null {
  const { h, m } = parseRunTime(c.run_time);
  const base = new Date(fromIso);

  // Avança candidato por candidato (até 366 iterações é suficiente).
  for (let i = 1; i <= 366; i++) {
    const candidate = new Date(base.getTime());
    candidate.setUTCDate(candidate.getUTCDate() + i);
    candidate.setUTCHours(h, m, 0, 0);

    if (c.frequency === "daily") return candidate.toISOString();

    if (c.frequency === "weekly") {
      const dow = candidate.getUTCDay(); // 0..6
      const wanted = (c.weekly_days || []).map(Number);
      if (wanted.length === 0 || wanted.includes(dow)) {
        return candidate.toISOString();
      }
    }

    if (c.frequency === "monthly") {
      const day = c.monthly_day ?? 1;
      if (candidate.getUTCDate() === day) return candidate.toISOString();
    }
  }
  return null;
}

async function expandContacts(
  sb: ReturnType<typeof createClient>,
  c: Campaign,
): Promise<Array<{ phone: string; contact_id: string | null }>> {
  if (c.target_type === "all") {
    const { data } = await sb
      .from("contacts")
      .select("id, phone")
      .eq("workspace_id", c.workspace_id)
      .not("phone", "is", null)
      .limit(2000);
    return (data || [])
      .filter((r: { phone: string | null }) => !!r.phone)
      .map((r: { id: string; phone: string }) => ({ phone: r.phone, contact_id: r.id }));
  }

  if (c.target_type === "tags" && c.target_tags && c.target_tags.length > 0) {
    const { data } = await sb
      .from("contacts")
      .select("id, phone, tags")
      .eq("workspace_id", c.workspace_id)
      .overlaps("tags", c.target_tags)
      .not("phone", "is", null)
      .limit(2000);
    return (data || [])
      .filter((r: { phone: string | null }) => !!r.phone)
      .map((r: { id: string; phone: string }) => ({ phone: r.phone, contact_id: r.id }));
  }

  if (c.target_type === "segment" && c.segment_id) {
    // segment.filters é JSON; aqui só carregamos por tags simples.
    const { data: seg } = await sb
      .from("whatsapp_segments")
      .select("filters")
      .eq("id", c.segment_id)
      .maybeSingle();
    const tags: string[] = (seg as { filters?: { tags?: { any?: string[] } } } | null)?.filters?.tags?.any ?? [];
    if (tags.length === 0) return [];
    const { data } = await sb
      .from("contacts")
      .select("id, phone")
      .eq("workspace_id", c.workspace_id)
      .overlaps("tags", tags)
      .not("phone", "is", null)
      .limit(2000);
    return (data || [])
      .filter((r: { phone: string | null }) => !!r.phone)
      .map((r: { id: string; phone: string }) => ({ phone: r.phone, contact_id: r.id }));
  }

  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const { data: due, error } = await sb
      .from("whatsapp_recurring_campaigns")
      .select("*")
      .eq("status", "active")
      .lte("next_run_at", nowIso)
      .limit(50);

    if (error) {
      return new Response(
        JSON.stringify({ ok: true, fallback: true, reason: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary: Array<{ id: string; name: string; dispatched: number; status: string }> = [];

    for (const raw of (due || []) as Campaign[]) {
      try {
        // Verificar se ultrapassou ends_at ou max_runs
        if (raw.ends_at && new Date(raw.ends_at) < new Date(nowIso)) {
          await sb
            .from("whatsapp_recurring_campaigns")
            .update({ status: "completed", next_run_at: null, last_run_at: nowIso })
            .eq("id", raw.id);
          summary.push({ id: raw.id, name: raw.name, dispatched: 0, status: "completed_ends_at" });
          continue;
        }
        if (raw.max_runs != null && raw.run_count >= raw.max_runs) {
          await sb
            .from("whatsapp_recurring_campaigns")
            .update({ status: "completed", next_run_at: null, last_run_at: nowIso })
            .eq("id", raw.id);
          summary.push({ id: raw.id, name: raw.name, dispatched: 0, status: "completed_max" });
          continue;
        }

        const contacts = await expandContacts(sb, raw);
        const baseTs = Date.now();
        const rows = contacts.map((ct, idx) => {
          const jitterMs = raw.jitter_minutes > 0
            ? Math.floor(Math.random() * raw.jitter_minutes * 60_000)
            : 0;
          const stagger = idx * 1500; // 1.5s entre envios para suavizar a fila
          return {
            workspace_id: raw.workspace_id,
            created_by: raw.created_by,
            contact_id: ct.contact_id,
            to_phone: ct.phone,
            body: raw.body,
            media_url: raw.media_url,
            media_mime_type: raw.media_mime_type,
            scheduled_at: new Date(baseTs + jitterMs + stagger).toISOString(),
            timezone: raw.timezone,
            metadata: { source: "recurring", recurring_id: raw.id, name: raw.name, cta_url: raw.cta_url },
          };
        });

        let dispatched = 0;
        if (rows.length) {
          const { error: insErr } = await sb.from("whatsapp_scheduled_messages").insert(rows);
          if (!insErr) dispatched = rows.length;
          else console.error("[recurring] insert failed", raw.id, insErr.message);
        }

        const next = computeNextRunAt(raw, nowIso);
        await sb
          .from("whatsapp_recurring_campaigns")
          .update({
            last_run_at: nowIso,
            last_dispatch_count: dispatched,
            run_count: raw.run_count + 1,
            next_run_at: next,
            last_error: dispatched === 0 ? "no_contacts" : null,
          })
          .eq("id", raw.id);

        summary.push({ id: raw.id, name: raw.name, dispatched, status: "ok" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await sb
          .from("whatsapp_recurring_campaigns")
          .update({ last_error: msg, last_run_at: nowIso })
          .eq("id", raw.id);
        summary.push({ id: raw.id, name: raw.name, dispatched: 0, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: summary.length, summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: true, fallback: true, error: e instanceof Error ? e.message : String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
