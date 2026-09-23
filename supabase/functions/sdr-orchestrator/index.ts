/**
 * sdr-orchestrator — acções manuais/UI do SDR (Fase 1).
 * - Autenticação de utilizador + pertença ao workspace mantidas.
 * - Todas as operações por ID filtram workspace_id (B10).
 * - Inscrição manual e automática unificadas em createEnrollment → scheduleEnrollment (B02).
 * - auto_enroll_scan usa as fontes reais (professional_prospecting_profiles, leads),
 *   target_filters, exclusões e paginação (B01), e fica desligado por defeito
 *   (SDR_AUTO_ENROLL_ENABLED !== "true" ou esquema da Fase 1 ausente).
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@supabase/supabase-js/cors";
import { identityKey, normalizeEmail, normalizePhone } from "../_shared/sdr-engine/identity.ts";
import { candidateFromLead, candidateFromProfile, evaluateCandidate, parseTargetFilters, type Candidate } from "../_shared/sdr-engine/eligibility.ts";
import { firstSendAt } from "../_shared/sdr-engine/executor.ts";
import { detectPhase1Schema } from "../_shared/sdr-engine/supabasePorts.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MANUAL_STATUSES = new Set(["meeting_set", "converted", "opted_out", "positive_reply", "replied"]);
const PAGE = 500;
const MAX_ROWS_PER_SOURCE = 2000;

type Action = "enroll_prospect" | "enroll_in_sequence" | "process_reply" | "check_campaign" | "auto_enroll_scan" | "update_status" | "pause_sequence" | "resume_sequence";

interface SDRRequest {
  action: Action;
  workspace_id: string;
  campaign_id?: string;
  prospect_data?: { prospect_id?: string; lead_id?: string; contact_id?: string; name?: string; email?: string; phone?: string; channel?: string };
  enrollment_id?: string;
  new_status?: string;
  reply_data?: { enrollment_id: string; is_positive?: boolean; message_text?: string };
}

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

let schemaCache: boolean | null = null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body: SDRRequest = await req.json();
    const { action, workspace_id } = body;
    if (!workspace_id || !action || !UUID_RE.test(workspace_id)) return json({ error: "workspace_id and action required" }, 400);
    for (const k of ["campaign_id", "enrollment_id"] as const) {
      if (body[k] && !UUID_RE.test(body[k]!)) return json({ error: `${k} inválido` }, 400);
    }

    const { data: membership } = await supabase.from("workspace_members").select("id, role")
      .eq("workspace_id", workspace_id).eq("user_id", user.id).maybeSingle();
    if (!membership) return json({ error: "Not a member of this workspace" }, 403);
    if (membership.role === "viewer" && action !== "check_campaign") return json({ error: "Sem permissão" }, 403);

    if (schemaCache === null) schemaCache = await detectPhase1Schema(supabase);
    const ctx = { supabase, ws: workspace_id, userId: user.id, schemaReady: schemaCache };

    let result: unknown;
    switch (action) {
      case "enroll_prospect": result = await enrollProspect(ctx, body); break;
      case "process_reply": result = await processReply(ctx, body); break;
      case "check_campaign": result = await checkCampaign(ctx, body); break;
      case "auto_enroll_scan": result = await autoEnrollScan(ctx); break;
      case "update_status": result = await updateEnrollmentStatus(ctx, body); break;
      case "enroll_in_sequence": result = await enrollInSequence(ctx, body); break;
      case "pause_sequence": result = await pauseResume(ctx, body, "paused"); break;
      case "resume_sequence": result = await pauseResume(ctx, body, "sequenced"); break;
      default: return json({ error: `Unknown action: ${action}` }, 400);
    }
    return json({ success: true, data: result });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error("[sdr-orchestrator] Error:", err instanceof Error ? err.message : err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

interface Ctx { supabase: any; ws: string; userId: string; schemaReady: boolean }

async function getCampaign(ctx: Ctx, id: string | undefined) {
  if (!id) throw new HttpError(400, "campaign_id required");
  const { data, error } = await ctx.supabase.from("sdr_campaigns").select("*").eq("id", id).eq("workspace_id", ctx.ws).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Campaign not found");
  return data;
}

async function getEnrollment(ctx: Ctx, id: string | undefined) {
  if (!id) throw new HttpError(400, "enrollment_id required");
  const { data, error } = await ctx.supabase.from("sdr_enrollments").select("*").eq("id", id).eq("workspace_id", ctx.ws).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Enrollment not found");
  return data;
}

async function assertInWorkspace(ctx: Ctx, table: string, id: string | null | undefined) {
  if (!id) return;
  if (!UUID_RE.test(id)) throw new HttpError(400, `${table} id inválido`);
  const { data } = await ctx.supabase.from(table).select("id").eq("id", id).eq("workspace_id", ctx.ws).maybeSingle();
  if (!data) throw new HttpError(403, `${table} não pertence a este workspace`);
}

async function activeSteps(ctx: Ctx, sequenceId: string) {
  const { data: seq } = await ctx.supabase.from("multichannel_sequences").select("id").eq("id", sequenceId).eq("workspace_id", ctx.ws).maybeSingle();
  if (!seq) throw new HttpError(403, "Sequência não pertence a este workspace");
  const { data, error } = await ctx.supabase.from("multichannel_sequence_steps").select("*")
    .eq("sequence_id", sequenceId).eq("is_active", true).order("step_order");
  if (error) throw error;
  return data ?? [];
}

// ─── INSCRIÇÃO UNIFICADA ─────────────────────────────────────
interface EnrollInput { prospect_id?: string | null; lead_id?: string | null; contact_id?: string | null; name?: string | null; email?: string | null; phone?: string | null; channel?: string | null }

async function createEnrollment(ctx: Ctx, campaign: any, input: EnrollInput) {
  await assertInWorkspace(ctx, "leads", input.lead_id);
  await assertInWorkspace(ctx, "contacts", input.contact_id);
  await assertInWorkspace(ctx, "professional_prospecting_profiles", input.prospect_id);

  const key = identityKey({ email: input.email, phone: input.phone, contactId: input.contact_id, leadId: input.lead_id, prospectId: input.prospect_id });
  if (!key) throw new HttpError(400, "Prospect sem email, telefone ou registo associado");

  // Deduplicação por campanha + identidade estável.
  if (ctx.schemaReady) {
    const { data: ex } = await ctx.supabase.from("sdr_enrollments").select("id").eq("campaign_id", campaign.id).eq("workspace_id", ctx.ws).eq("identity_key", key).maybeSingle();
    if (ex) return { already_enrolled: true, enrollment_id: ex.id };
  } else {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const ors = [email && `prospect_email.ilike.${email}`, phone && `prospect_phone.ilike.%${phone.slice(-9)}`, input.lead_id && `lead_id.eq.${input.lead_id}`, input.contact_id && `contact_id.eq.${input.contact_id}`].filter(Boolean);
    if (ors.length) {
      const { data: ex } = await ctx.supabase.from("sdr_enrollments").select("id").eq("campaign_id", campaign.id).eq("workspace_id", ctx.ws).or(ors.join(",")).limit(1);
      if (ex?.length) return { already_enrolled: true, enrollment_id: ex[0].id };
    }
  }

  const row: Record<string, unknown> = {
    campaign_id: campaign.id, workspace_id: ctx.ws,
    prospect_id: input.prospect_id ?? null, lead_id: input.lead_id ?? null, contact_id: input.contact_id ?? null,
    prospect_name: input.name ?? null, prospect_email: normalizeEmail(input.email), prospect_phone: input.phone ?? null,
    channel: input.channel === "whatsapp" ? "whatsapp" : "email", status: "enrolled",
  };
  if (ctx.schemaReady) row.identity_key = key;

  const { data: enrollment, error } = await ctx.supabase.from("sdr_enrollments").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { already_enrolled: true };
    throw error;
  }

  const { count } = await ctx.supabase.from("sdr_enrollments").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("workspace_id", ctx.ws);
  await ctx.supabase.from("sdr_campaigns").update({ total_enrolled: count ?? 0 }).eq("id", campaign.id).eq("workspace_id", ctx.ws);

  const scheduled = campaign.sequence_id ? await scheduleEnrollment(ctx, campaign, enrollment.id) : null;
  return { enrolled: true, enrollment_id: enrollment.id, next_send_at: scheduled?.next_send_at ?? null };
}

async function scheduleEnrollment(ctx: Ctx, campaign: any, enrollmentId: string) {
  if (!campaign.sequence_id) throw new HttpError(400, "Campaign has no sequence");
  const steps = await activeSteps(ctx, campaign.sequence_id);
  const at = firstSendAt(steps, new Date(), campaign.settings?.send_window);
  if (!at) {
    await ctx.supabase.from("sdr_enrollments").update({ failure_reason: "sequence_without_active_steps" })
      .eq("id", enrollmentId).eq("workspace_id", ctx.ws);
    return { sequenced: false, enrollment_id: enrollmentId, next_send_at: null };
  }
  const { data, error } = await ctx.supabase.from("sdr_enrollments")
    .update({ status: "sequenced", current_step: 0, next_send_at: at.toISOString() })
    .eq("id", enrollmentId).eq("workspace_id", ctx.ws).in("status", ["enrolled", "enriching"]).select("id");
  if (error) throw error;
  return { sequenced: !!data?.length, enrollment_id: enrollmentId, next_send_at: at.toISOString() };
}

async function enrollProspect(ctx: Ctx, body: SDRRequest) {
  const campaign = await getCampaign(ctx, body.campaign_id);
  if (!body.prospect_data) throw new HttpError(400, "prospect_data required");
  if (campaign.status !== "active" && campaign.status !== "draft") throw new HttpError(409, "Campaign is not active");
  return createEnrollment(ctx, campaign, body.prospect_data);
}

async function enrollInSequence(ctx: Ctx, body: SDRRequest) {
  const enrollment = await getEnrollment(ctx, body.enrollment_id);
  const campaign = await getCampaign(ctx, enrollment.campaign_id);
  return scheduleEnrollment(ctx, campaign, enrollment.id);
}

// ─── RESPOSTA (manual) ───────────────────────────────────────
async function processReply(ctx: Ctx, body: SDRRequest) {
  const enrollment = await getEnrollment(ctx, body.reply_data?.enrollment_id);
  const newStatus = body.reply_data?.is_positive ? "positive_reply" : "replied";
  const { error } = await ctx.supabase.from("sdr_enrollments")
    .update({ status: newStatus, reply_detected_at: new Date().toISOString(), next_send_at: null })
    .eq("id", enrollment.id).eq("workspace_id", ctx.ws);
  if (error) throw error;
  if (ctx.schemaReady) {
    await ctx.supabase.from("sdr_step_attempts").update({ status: "cancelled", last_error: "reply_detected" })
      .eq("enrollment_id", enrollment.id).eq("workspace_id", ctx.ws).in("status", ["reserved", "failed_retryable"]);
  }
  await recount(ctx, enrollment.campaign_id);
  return { processed: true, status: newStatus };
}

async function recount(ctx: Ctx, campaignId: string) {
  const { data: rows } = await ctx.supabase.from("sdr_enrollments").select("status").eq("campaign_id", campaignId).eq("workspace_id", ctx.ws);
  const counts: Record<string, number> = {};
  (rows ?? []).forEach((e: any) => { counts[e.status] = (counts[e.status] || 0) + 1; });
  await ctx.supabase.from("sdr_campaigns").update({
    total_enrolled: rows?.length || 0,
    total_replied: (counts.replied || 0) + (counts.positive_reply || 0),
    total_meetings: counts.meeting_set || 0,
    total_converted: counts.converted || 0,
  }).eq("id", campaignId).eq("workspace_id", ctx.ws);
  return { counts, total: rows?.length || 0 };
}

async function checkCampaign(ctx: Ctx, body: SDRRequest) {
  const campaign = await getCampaign(ctx, body.campaign_id);
  const r = await recount(ctx, campaign.id);
  return { campaign_id: campaign.id, ...r };
}

// ─── AUTO ENROLL SCAN (B01) ──────────────────────────────────
async function fetchPaged(q: () => any, source: string) {
  const out: any[] = [];
  for (let from = 0; from < MAX_ROWS_PER_SOURCE; from += PAGE) {
    const { data, error } = await q().range(from, from + PAGE - 1);
    if (error) throw new Error(`auto_enroll_scan: falha a ler ${source}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function autoEnrollScan(ctx: Ctx) {
  if (Deno.env.get("SDR_AUTO_ENROLL_ENABLED") !== "true") return { disabled: true, reason: "auto_enroll_disabled", scanned: 0, enrolled: 0 };
  if (!ctx.schemaReady) return { disabled: true, reason: "schema_not_ready", scanned: 0, enrolled: 0 };

  const { data: campaigns, error } = await ctx.supabase.from("sdr_campaigns").select("*")
    .eq("workspace_id", ctx.ws).eq("status", "active").eq("auto_enroll_enabled", true);
  if (error) throw error;
  if (!campaigns?.length) return { scanned: 0, enrolled: 0 };

  // Exclusões do workspace (email e WhatsApp).
  const supRows = await fetchPaged(() => ctx.supabase.from("sdr_suppressions").select("email").eq("workspace_id", ctx.ws).order("id"), "sdr_suppressions");
  const optRows = await fetchPaged(() => ctx.supabase.from("whatsapp_optouts").select("phone").eq("workspace_id", ctx.ws).order("id"), "whatsapp_optouts");
  const suppressed = {
    emails: new Set(supRows.map((r: any) => normalizeEmail(r.email)).filter(Boolean) as string[]),
    phones: new Set(optRows.map((r: any) => normalizePhone(r.phone)).filter(Boolean) as string[]),
  };

  const perCampaign: Record<string, { eligible: number; enrolled: number; skipped: Record<string, number> }> = {};
  let totalEnrolled = 0;

  for (const campaign of campaigns) {
    if (!campaign.sequence_id) continue;
    const steps = await activeSteps(ctx, campaign.sequence_id);
    const channel = (steps[0]?.channel === "whatsapp" ? "whatsapp" : "email") as "email" | "whatsapp";
    const filters = parseTargetFilters(campaign.target_filters, campaign.auto_enroll_min_score);
    const maxPerScan = Math.max(1, Math.min(100, Number(campaign.settings?.auto_enroll_max_per_scan) || 25));

    const candidates: Candidate[] = [];
    if (filters.sources.includes("professional_profiles")) {
      const rows = await fetchPaged(() => ctx.supabase.from("professional_prospecting_profiles")
        .select("id, workspace_id, profile_name, extracted_email, extracted_phone, lead_score, inferred_location, inferred_profession, inferred_type, status, platform, converted_lead_id")
        .eq("workspace_id", ctx.ws).gte("lead_score", filters.min_score).order("lead_score", { ascending: false }).order("id"), "professional_prospecting_profiles");
      candidates.push(...rows.map(candidateFromProfile));
    }
    if (filters.sources.includes("leads")) {
      const rows = await fetchPaged(() => ctx.supabase.from("leads")
        .select("id, workspace_id, name, company_name, email, phone, lead_score, icp_fit_score, city, county, region, inferred_profession, industry, business_category, status, source, is_blocked, archived_at, prospecting_profile_id")
        .eq("workspace_id", ctx.ws).order("created_at", { ascending: false }).order("id"), "leads");
      candidates.push(...rows.map(candidateFromLead));
    }

    // Exclusão global (suppressed_emails) para os emails candidatos.
    const emails = [...new Set(candidates.map((c) => normalizeEmail(c.email)).filter(Boolean) as string[])];
    for (let i = 0; i < emails.length; i += 200) {
      const { data, error: se } = await ctx.supabase.from("suppressed_emails").select("email").in("email", emails.slice(i, i + 200));
      if (se) throw new Error(`auto_enroll_scan: falha a ler suppressed_emails: ${se.message}`);
      (data ?? []).forEach((r: any) => suppressed.emails.add(r.email.toLowerCase()));
    }

    const stats = { eligible: 0, enrolled: 0, skipped: {} as Record<string, number> };
    const seen = new Set<string>();
    for (const cand of candidates) {
      if (stats.enrolled >= maxPerScan) break;
      const ev = evaluateCandidate(cand, filters, channel, suppressed);
      if (!ev.eligible || !ev.identityKey) {
        for (const r of ev.reasons) stats.skipped[r] = (stats.skipped[r] ?? 0) + 1;
        continue;
      }
      if (seen.has(ev.identityKey)) continue; // mesmo destinatário em perfil + lead
      seen.add(ev.identityKey);
      stats.eligible++;
      const res: any = await createEnrollment(ctx, campaign, {
        prospect_id: cand.prospectId, lead_id: cand.leadId, name: cand.name, email: cand.email, phone: cand.phone, channel,
      });
      if (res.enrolled) { stats.enrolled++; totalEnrolled++; }
    }
    perCampaign[campaign.id] = stats;
  }
  return { scanned: campaigns.length, enrolled: totalEnrolled, per_campaign: perCampaign };
}

// ─── ESTADO MANUAL ───────────────────────────────────────────
async function updateEnrollmentStatus(ctx: Ctx, body: SDRRequest) {
  const enrollment = await getEnrollment(ctx, body.enrollment_id);
  const newStatus = body.new_status ?? "";
  if (!ALLOWED_MANUAL_STATUSES.has(newStatus)) throw new HttpError(400, "new_status inválido");
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { status: newStatus, next_send_at: null };
  if (newStatus === "meeting_set") updateData.meeting_set_at = now;
  if (newStatus === "converted") updateData.converted_at = now;
  if (newStatus === "opted_out") updateData.opted_out_at = now;
  if (newStatus === "replied" || newStatus === "positive_reply") updateData.reply_detected_at = now;

  const { data, error } = await ctx.supabase.from("sdr_enrollments").update(updateData)
    .eq("id", enrollment.id).eq("workspace_id", ctx.ws).select().single();
  if (error) throw error;

  if (ctx.schemaReady) {
    await ctx.supabase.from("sdr_step_attempts").update({ status: "cancelled", last_error: `manual_${newStatus}` })
      .eq("enrollment_id", enrollment.id).eq("workspace_id", ctx.ws).in("status", ["reserved", "failed_retryable"]);
  }
  if (newStatus === "opted_out" && data?.prospect_email) {
    const { error: supErr } = await ctx.supabase.from("sdr_suppressions").insert({
      workspace_id: ctx.ws, email: data.prospect_email.toLowerCase(), reason: "manual_optout", source_enrollment_id: enrollment.id, created_by: ctx.userId,
    });
    if (supErr && supErr.code !== "23505") throw supErr;
  }
  return data;
}

async function pauseResume(ctx: Ctx, body: SDRRequest, target: "paused" | "sequenced") {
  const enrollment = await getEnrollment(ctx, body.enrollment_id);
  const from = target === "paused" ? "sequenced" : "paused";
  const patch: Record<string, unknown> = { status: target };
  if (target === "sequenced") {
    // Retoma: se a data já passou, reagenda para agora (dentro da janela o executor ajusta).
    if (!enrollment.next_send_at || new Date(enrollment.next_send_at) < new Date()) patch.next_send_at = new Date().toISOString();
  }
  const { data, error } = await ctx.supabase.from("sdr_enrollments").update(patch)
    .eq("id", enrollment.id).eq("workspace_id", ctx.ws).eq("status", from).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(409, `Inscrição não está em '${from}'`);
  return data;
}
