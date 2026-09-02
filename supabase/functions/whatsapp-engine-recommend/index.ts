/**
 * whatsapp-engine-recommend
 *
 * Calcula a Next Best Action comercial (motor determinístico, sem IA)
 * para leads de um workspace e persiste o resultado em `next_best_actions`.
 *
 * Nunca envia mensagens — apenas recomenda.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { decideNextBestAction, type EngineLeadContext } from "../_shared/wa-engine/decide.ts";
import { NEXT_BEST_ACTION_LABELS } from "../_shared/wa-engine/families.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const payload = await req.json().catch(() => ({}));
    const workspaceId = String(payload?.workspace_id ?? "");
    if (!UUID.test(workspaceId)) return json({ error: "workspace_id inválido" }, 400);

    const leadIds: string[] = Array.isArray(payload?.lead_ids)
      ? payload.lead_ids.filter((id: unknown) => typeof id === "string" && UUID.test(id)).slice(0, 200)
      : [];
    const limit = Math.min(Math.max(Number(payload?.limit ?? 50), 1), 200);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Autorização: o utilizador tem de pertencer ao workspace.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { data: member } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "forbidden" }, 403);

    // 2. Leads alvo.
    let leadQuery = admin
      .from("leads")
      .select("id, name, phone, status, created_at, archived_at, is_blocked, automation_active")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (leadIds.length) leadQuery = leadQuery.in("id", leadIds);
    const { data: leads, error: leadsErr } = await leadQuery;
    if (leadsErr) throw leadsErr;
    if (!leads?.length) return json({ processed: 0, recommendations: [] });

    const ids = leads.map((l: any) => l.id);

    // 3. Contexto agregado (perfil comercial, reuniões, conversas).
    const [{ data: profiles }, { data: meetings }, { data: convs }] = await Promise.all([
      admin.from("lead_commercial_profile").select("*").in("lead_id", ids),
      admin
        .from("meetings")
        .select("lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", ids)
        .gt("start_time", new Date().toISOString())
        .not("status", "in", '("cancelled","canceled","no_show")'),
      admin
        .from("conversations")
        .select("id, lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", ids),
    ]);

    const profileByLead = new Map((profiles ?? []).map((p: any) => [p.lead_id, p]));
    const meetingLeads = new Set((meetings ?? []).map((m: any) => m.lead_id));
    const convByLead = new Map((convs ?? []).map((c: any) => [c.lead_id, c.id]));

    // Contagem de outbound por conversa.
    const outboundByLead = new Map<string, number>();
    const convIds = Array.from(convByLead.values());
    if (convIds.length) {
      const { data: msgs } = await admin
        .from("messages")
        .select("conversation_id, direction")
        .in("conversation_id", convIds)
        .eq("direction", "outbound")
        .limit(5000);
      const byConv = new Map<string, number>();
      for (const m of msgs ?? []) byConv.set(m.conversation_id, (byConv.get(m.conversation_id) ?? 0) + 1);
      for (const [leadId, convId] of convByLead) outboundByLead.set(leadId, byConv.get(convId) ?? 0);
    }

    // Opt-outs por telefone.
    const phones = leads.map((l: any) => l.phone).filter(Boolean);
    const optedPhones = new Set<string>();
    if (phones.length) {
      const { data: outs } = await admin
        .from("whatsapp_optouts")
        .select("phone")
        .eq("workspace_id", workspaceId)
        .in("phone", phones);
      for (const o of outs ?? []) optedPhones.add(o.phone);
    }

    // 4. Decidir e persistir.
    const recommendations: Array<Record<string, unknown>> = [];
    for (const lead of leads as any[]) {
      const p: any = profileByLead.get(lead.id) ?? {};
      const proposal: any = proposalByLead.get(lead.id);

      const ctx: EngineLeadContext = {
        leadId: lead.id,
        workspaceId,
        createdAt: lead.created_at,
        lastOutboundAt: p.last_outbound_at ?? null,
        lastInboundAt: p.last_inbound_at ?? null,
        outboundCount: outboundByLead.get(lead.id) ?? 0,
        hasReplied: Boolean(p.first_reply_at ?? p.last_inbound_at),
        hasPhone: Boolean(lead.phone),
        optedOut: optedPhones.has(lead.phone),
        stopContact: Boolean(p.stop_contact),
        automationActive: lead.automation_active !== false,
        snoozeUntil: p.snooze_until ?? null,
        hasMeeting: meetingLeads.has(lead.id),
        hasProposal: Boolean(proposal) && !proposal?.accepted_at,
        proposalViewed: Boolean(proposal?.viewed_at),
        proposalAcceptedAt: proposal?.accepted_at ?? null,
        isLost: typeof lead.status === "string" && /lost|perdid/i.test(lead.status),
        intent: p.objecao_principal ? "objection" : null,
        objetivoCliente: p.objetivo_cliente ?? null,
        problemaPrincipal: p.problema_principal ?? null,
        consequencia: p.consequencia ?? null,
        timing: p.timing ?? null,
      };

      const decision = decideNextBestAction(ctx);
      recommendations.push({ lead_id: lead.id, ...decision });

      // Fecha recomendações pendentes anteriores desta lead.
      await admin
        .from("next_best_actions")
        .update({ status: "superseded", updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "lead")
        .eq("entity_id", lead.id)
        .eq("status", "pending");

      if (decision.action === "WAIT" || decision.action === "STOP_CONTACT") continue;

      await admin.from("next_best_actions").insert({
        workspace_id: workspaceId,
        entity_type: "lead",
        entity_id: lead.id,
        action_type: decision.action,
        title: NEXT_BEST_ACTION_LABELS[decision.action] ?? decision.action,
        description: lead.name ? `Lead: ${lead.name}` : null,
        rationale: decision.reason,
        priority_score: decision.priority,
        urgency: decision.urgency,
        confidence: decision.confidence,
        due_at: decision.dueAt,
        status: "pending",
        suggested_payload_json: {
          template_code: decision.templateCode,
          phone: lead.phone ?? null,
        },
        source_signals_json: {
          outbound_count: ctx.outboundCount,
          has_replied: ctx.hasReplied,
          has_meeting: ctx.hasMeeting,
          has_proposal: ctx.hasProposal,
        },
      });
    }

    return json({ processed: leads.length, recommendations });
  } catch (e) {
    console.error("[whatsapp-engine-recommend] error", e);
    return json({ fallback: true, internal_error: String((e as Error)?.message ?? e) }, 200);
  }
});
