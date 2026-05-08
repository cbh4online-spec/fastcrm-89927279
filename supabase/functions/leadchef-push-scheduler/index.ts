// LeadChef Push Scheduler — enqueues reminders for upcoming next-actions
// and cold-lead alerts based on each user's preferences.
//
// Triggered every ~5 minutes by pg_cron. Writes to leadchef_push_queue
// (with dedupe_key to avoid duplicates). The dispatcher cron then sends.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Pref {
  workspace_id: string;
  user_id: string;
  remind_next_actions: boolean;
  remind_window_minutes: number;
  alert_cold_leads: boolean;
  cold_lead_inactive_days: number;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

function isQuietHour(p: Pref, now: Date): boolean {
  if (p.quiet_hours_start == null || p.quiet_hours_end == null) return false;
  const h = now.getUTCHours();
  const s = p.quiet_hours_start, e = p.quiet_hours_end;
  if (s === e) return false;
  return s < e ? (h >= s && h < e) : (h >= s || h < e);
}

async function enqueue(dedupeKey: string, row: Record<string, unknown>) {
  // Insert; ignore unique violation on dedupe_key
  const { error } = await admin
    .from("leadchef_push_queue")
    .insert({ ...row, dedupe_key: dedupeKey });
  if (error && !/duplicate key|unique constraint/i.test(error.message)) {
    console.error("enqueue error", error.message);
  }
}

async function processNextActions(p: Pref, now: Date) {
  const upper = new Date(now.getTime() + p.remind_window_minutes * 60_000);

  // Need lead_id, name; assigned to this user (lead.assigned_to = user_id)
  const { data: profiles } = await admin
    .from("leadchef_lead_profiles")
    .select("lead_id, next_action_at, next_action_type, next_action_note, leads!inner(id, name, assigned_to)")
    .eq("workspace_id", p.workspace_id)
    .gte("next_action_at", now.toISOString())
    .lte("next_action_at", upper.toISOString())
    .limit(100);

  for (const row of (profiles ?? []) as any[]) {
    const lead = row.leads;
    if (!lead || lead.assigned_to !== p.user_id) continue;
    const dedupe = `next:${p.user_id}:${row.lead_id}:${row.next_action_at}`;
    await enqueue(dedupe, {
      workspace_id: p.workspace_id,
      user_id: p.user_id,
      title: `⏰ Próxima ação: ${lead.name ?? "Lead"}`,
      body: row.next_action_type
        ? `${row.next_action_type}${row.next_action_note ? " · " + row.next_action_note : ""}`
        : "Tens uma ação agendada agora.",
      url: `/dashboard/leadchef/leads/${row.lead_id}`,
      payload: { kind: "next_action", lead_id: row.lead_id },
      status: "pending",
      scheduled_at: now.toISOString(),
    });
  }
}

async function processColdLeads(p: Pref, now: Date) {
  const cutoff = new Date(now.getTime() - p.cold_lead_inactive_days * 24 * 60 * 60_000);
  const { data: profiles } = await admin
    .from("leadchef_lead_profiles")
    .select("lead_id, updated_at, stage, leads!inner(id, name, assigned_to)")
    .eq("workspace_id", p.workspace_id)
    .lt("updated_at", cutoff.toISOString())
    .not("stage", "in", "(won,lost)")
    .limit(50);

  // Dedupe per lead per day
  const day = now.toISOString().slice(0, 10);
  for (const row of (profiles ?? []) as any[]) {
    const lead = row.leads;
    if (!lead || lead.assigned_to !== p.user_id) continue;
    const dedupe = `cold:${p.user_id}:${row.lead_id}:${day}`;
    await enqueue(dedupe, {
      workspace_id: p.workspace_id,
      user_id: p.user_id,
      title: `🥶 Lead frio: ${lead.name ?? "Lead"}`,
      body: `Sem interação há ${p.cold_lead_inactive_days}+ dias. Reativa o contacto.`,
      url: `/dashboard/leadchef/leads/${row.lead_id}`,
      payload: { kind: "cold_lead", lead_id: row.lead_id },
      status: "pending",
      scheduled_at: now.toISOString(),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const now = new Date();
    const { data: prefs } = await admin
      .from("leadchef_notification_prefs")
      .select("*")
      .or("remind_next_actions.eq.true,alert_cold_leads.eq.true");

    let processed = 0;
    for (const p of (prefs ?? []) as Pref[]) {
      if (isQuietHour(p, now)) continue;
      if (p.remind_next_actions) await processNextActions(p, now);
      if (p.alert_cold_leads) await processColdLeads(p, now);
      processed++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed, ts: now.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("scheduler error", e);
    return new Response(
      JSON.stringify({ fallback: true, error: e?.message ?? "internal_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
