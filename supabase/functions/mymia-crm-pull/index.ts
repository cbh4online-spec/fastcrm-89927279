// FastCRM — Conector direto ao CRM do mymia.world (modo "pull").
// Lê crm_leads + crm_atividades + whatsapp_conversations/messages do projeto de origem
// e importa para o workspace atual do FastCRM de forma idempotente.
//
// Segurança:
// - Autentica o JWT do utilizador ANTES de criar qualquer cliente service_role.
// - Exige que o utilizador seja owner/admin do workspace (ou super admin).
// - A chave de acesso ao mymia.world vive apenas em segredo (MYMIA_SOURCE_SERVICE_KEY).
// - Nunca devolve a chave nem a escreve em logs.
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_LEADS = 1000;
const MAX_MESSAGES_PER_CONV = 300;

const STATUS_MAP: Record<string, string> = {
  novo: "new",
  contactado: "contacted",
  reuniao_agendada: "meeting_scheduled",
  proposta_enviada: "proposal_sent",
  negociacao: "negotiation",
  ganho: "won",
  perdido: "lost",
};

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  mode: z.enum(["apply", "preview"]).default("preview"),
  limit: z.number().int().min(1).max(MAX_LEADS).default(200),
  include_conversations: z.boolean().default(true),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    const only = digits.replace(/\D/g, "");
    if (only.length === 9) digits = `+351${only}`;
    else if (only.length > 9) digits = `+${only}`;
    else return null;
  }
  const only = digits.replace(/\D/g, "");
  if (only.length < 9 || only.length > 15) return null;
  return `+${only}`;
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  return v.length > 0 && v.includes("@") ? v : null;
}

/** Lê uma tabela do projeto de origem pela Data API, com chave de serviço. */
async function sourceSelect(
  baseUrl: string,
  key: string,
  table: string,
  query: string,
): Promise<{ ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/rest/v1/${table}?${query}`;
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `origem_${res.status}: ${text.slice(0, 200)}` };
    }
    const rows = await res.json();
    return { ok: true, rows: Array.isArray(rows) ? rows : [] };
  } catch (e) {
    return { ok: false, error: `origem_inacessivel: ${(e as Error).message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Autenticação do chamador antes de qualquer acesso privilegiado.
  //    Duas vias: JWT de utilizador (owner/admin) ou chamada interna com service role
  //    (tarefa automática / cron). Fail-closed em qualquer outro caso.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "unauthorized", reason: "missing_authorization" }, 401);
  }
  const bearer = authHeader.slice(7).trim();
  const isInternal = Boolean(serviceKey) && bearer === serviceKey;

  let userId: string | null = null;
  if (!isInternal) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized", reason: "invalid_token" }, 401);
    }
    userId = userData.user.id;
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { workspace_id, mode, limit, include_conversations } = parsed.data;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 2) Autorização: owner/admin do workspace, super admin, ou chamada interna.
  if (!isInternal) {
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId!)
      .maybeSingle();
    let allowed = membership?.role === "owner" || membership?.role === "admin";
    if (!allowed) {
      const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userId });
      allowed = isSuper === true;
    }
    if (!allowed) return json({ error: "forbidden", reason: "not_workspace_admin" }, 403);
  }

  try {
    // 3) Configuração da ponte.
    const { data: settings } = await admin
      .from("mymia_crm_sync_settings")
      .select("source_url, pull_enabled, pull_conversations, default_source, default_tags")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const sourceUrl = (settings?.source_url ?? "").trim();
    if (!sourceUrl || !/^https:\/\/[^\s]+$/.test(sourceUrl)) {
      return json({ error: "config_incompleta", reason: "source_url_invalido" }, 400);
    }
    if (mode === "apply" && settings?.pull_enabled !== true) {
      return json({ error: "config_incompleta", reason: "pull_desligado" }, 400);
    }

    const sourceKey = Deno.env.get("MYMIA_SOURCE_SERVICE_KEY");
    if (!sourceKey) {
      return json({ error: "config_incompleta", reason: "chave_origem_ausente" }, 400);
    }

    const defaultSource = settings?.default_source ?? "mymia_crm";
    const defaultTags: string[] = settings?.default_tags ?? ["mymia", "crm"];
    const wantConversations = include_conversations && settings?.pull_conversations !== false;

    // 4) Ler contactos da origem.
    const leadsRes = await sourceSelect(
      sourceUrl,
      sourceKey,
      "crm_leads",
      new URLSearchParams({
        select:
          "id,nome,email,telefone,estado,origem,empresa,nif,cargo,cidade,distrito,codigo_postal,morada,notas,tags,score,linkedin,instagram,facebook,ultima_atividade_em,created_at,updated_at",
        order: "updated_at.desc",
        limit: String(limit),
      }).toString(),
    );
    if (!leadsRes.ok) {
      const invalidKey = /origem_40[13]/.test(leadsRes.error ?? "");
      return json({
        ok: false,
        error: "origem_falhou",
        reason: invalidKey ? "chave_origem_invalida" : "origem_inacessivel",
        detail: (leadsRes.error ?? "").slice(0, 200),
      });
    }

    const sourceLeads = leadsRes.rows;
    const summary = {
      received: sourceLeads.length,
      created: 0,
      updated: 0,
      skipped: 0,
      activities: 0,
      conversations: 0,
      messages: 0,
    };

    if (mode === "preview") {
      return json({
        ok: true,
        mode,
        received: sourceLeads.length,
        sample: sourceLeads.slice(0, 5).map((l) => ({
          nome: l.nome,
          email: l.email,
          telefone: l.telefone,
          estado: l.estado,
        })),
      });
    }

    for (const raw of sourceLeads) {
      const externalId = String(raw.id ?? "");
      if (!externalId) {
        summary.skipped++;
        continue;
      }
      const email = normalizeEmail(raw.email as string);
      const phone = normalizePhone(raw.telefone as string);
      if (!email && !phone) {
        summary.skipped++;
        continue;
      }

      const status = STATUS_MAP[String(raw.estado ?? "novo").toLowerCase()] ?? "new";

      const { data: link } = await admin
        .from("mymia_crm_lead_links")
        .select("id, lead_id, attempt_count")
        .eq("workspace_id", workspace_id)
        .eq("external_lead_id", externalId)
        .maybeSingle();

      let leadId: string | null = link?.lead_id ?? null;

      if (!leadId && email) {
        const { data: existing } = await admin
          .from("leads")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("email", email)
          .maybeSingle();
        if (existing) leadId = existing.id;
      }

      const common: Record<string, unknown> = {
        name: String(raw.nome ?? "").trim() || "(sem nome)",
        email,
        phone,
        status,
        company_name: (raw.empresa as string)?.trim() || null,
        city: (raw.cidade as string)?.trim() || null,
        postal_code: (raw.codigo_postal as string)?.trim() || null,
        address: (raw.morada as string)?.trim() || null,
        notes: (raw.notas as string)?.trim() || null,
        contact_person_role: (raw.cargo as string)?.trim() || null,
        linkedin_url: (raw.linkedin as string)?.trim() || null,
        instagram_url: (raw.instagram as string)?.trim() || null,
        facebook_url: (raw.facebook as string)?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      for (const k of Object.keys(common)) if (common[k] === null) delete common[k];

      /** Guarda a falha na ligação para ficar visível e ser repetida depois. */
      const markLinkError = async (message: string) => {
        if (!link?.id) return;
        await admin
          .from("mymia_crm_lead_links")
          .update({
            last_error: message.slice(0, 500),
            last_error_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
            attempt_count: (link as { attempt_count?: number }).attempt_count
              ? ((link as { attempt_count?: number }).attempt_count ?? 0) + 1
              : 1,
          })
          .eq("id", link.id);
      };

      if (leadId) {
        const { error: upErr } = await admin.from("leads").update(common).eq("id", leadId);
        if (upErr) {
          await admin.from("mymia_crm_sync_logs").insert({
            workspace_id,
            direction: "inbound",
            action: "pull_update_lead",
            status: "error",
            external_lead_id: externalId,
            lead_id: leadId,
            error: upErr.message,
            details: {},
          });
          await markLinkError(upErr.message);
          summary.skipped++;
          continue;
        }
        summary.updated++;
      } else {
        const { data: created, error: insErr } = await admin
          .from("leads")
          .insert({
            workspace_id,
            ...common,
            name: common.name ?? "(sem nome)",
            source: (raw.origem as string)?.trim() || defaultSource,
            tags: Array.from(
              new Set([...(Array.isArray(raw.tags) ? (raw.tags as string[]) : []), ...defaultTags]),
            ),
          })
          .select("id")
          .maybeSingle();
        if (insErr || !created) {
          await admin.from("mymia_crm_sync_logs").insert({
            workspace_id,
            direction: "inbound",
            action: "pull_create_lead",
            status: "error",
            external_lead_id: externalId,
            error: insErr?.message ?? "insert_failed",
            details: {},
          });
          await markLinkError(insErr?.message ?? "insert_failed");
          summary.skipped++;
          continue;
        }
        leadId = created.id;
        summary.created++;
      }

      await admin.from("mymia_crm_lead_links").upsert(
        {
          workspace_id,
          external_lead_id: externalId,
          lead_id: leadId,
          external_status: (raw.estado as string) ?? null,
          external_updated_at: (raw.updated_at as string) ?? null,
          last_inbound_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
          attempt_count: 0,
        },
        { onConflict: "workspace_id,external_lead_id" },
      );

      // 5) Atividades / histórico de notas do contacto.
      const actsRes = await sourceSelect(
        sourceUrl,
        sourceKey,
        "crm_atividades",
        new URLSearchParams({
          select: "id,lead_id,tipo,descricao,estado_anterior,estado_novo,ocorreu_em",
          lead_id: `eq.${externalId}`,
          order: "ocorreu_em.desc",
          limit: "100",
        }).toString(),
      );
      if (actsRes.ok) {
        for (const act of actsRes.rows) {
          const actId = String(act.id ?? "");
          if (!actId) continue;
          const { data: existingAct } = await admin
            .from("crm_activities")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("entity_type", "lead")
            .eq("entity_id", leadId!)
            .contains("metadata", { mymia_activity_id: actId })
            .maybeSingle();
          if (existingAct) continue;
          const { error: actErr } = await admin.from("crm_activities").insert({
            workspace_id,
            entity_type: "lead",
            entity_id: leadId!,
            lead_id: leadId,
            activity_type: String(act.tipo ?? "note"),
            title: `mymia.world — ${String(act.tipo ?? "nota")}`,
            description: (act.descricao as string) ?? null,
            created_at: (act.ocorreu_em as string) ?? new Date().toISOString(),
            metadata: {
              mymia_activity_id: actId,
              estado_anterior: act.estado_anterior ?? null,
              estado_novo: act.estado_novo ?? null,
              origem: "mymia_crm",
            },
          });
          if (!actErr) summary.activities++;
        }
      }

      // 6) Conversas de WhatsApp associadas a este contacto.
      if (wantConversations) {
        const convRes = await sourceSelect(
          sourceUrl,
          sourceKey,
          "whatsapp_conversations",
          new URLSearchParams({
            select:
              "id,lead_id,phone_e164,contact_name,status,last_message_at,last_message_preview,last_message_direction,tags,created_at",
            lead_id: `eq.${externalId}`,
            order: "last_message_at.desc",
            limit: "20",
          }).toString(),
        );
        if (convRes.ok) {
          for (const conv of convRes.rows) {
            const extConvId = String(conv.id ?? "");
            if (!extConvId) continue;

            const { data: convLink } = await admin
              .from("mymia_crm_conversation_links")
              .select("conversation_id")
              .eq("workspace_id", workspace_id)
              .eq("external_conversation_id", extConvId)
              .maybeSingle();

            let conversationId: string | null = convLink?.conversation_id ?? null;

            if (!conversationId) {
              const { data: newConv, error: convErr } = await admin
                .from("conversations")
                .insert({
                  workspace_id,
                  channel: "whatsapp",
                  lead_id: leadId,
                  status: "open",
                  external_thread_id: extConvId,
                  last_message_at: (conv.last_message_at as string) ?? null,
                  last_message_preview: (conv.last_message_preview as string) ?? null,
                  last_message_direction: (conv.last_message_direction as string) ?? null,
                  channel_metadata: {
                    origem: "mymia_crm",
                    phone_e164: conv.phone_e164 ?? null,
                    contact_name: conv.contact_name ?? null,
                  },
                })
                .select("id")
                .maybeSingle();
              if (convErr || !newConv) continue;
              conversationId = newConv.id;
              await admin.from("mymia_crm_conversation_links").insert({
                workspace_id,
                external_conversation_id: extConvId,
                conversation_id: conversationId,
              });
              summary.conversations++;
            }

            const msgRes = await sourceSelect(
              sourceUrl,
              sourceKey,
              "whatsapp_messages",
              new URLSearchParams({
                select: "id,conversation_id,direction,body,type,media_url,media_mime,status,created_at",
                conversation_id: `eq.${extConvId}`,
                order: "created_at.asc",
                limit: String(MAX_MESSAGES_PER_CONV),
              }).toString(),
            );
            if (!msgRes.ok) continue;

            for (const msg of msgRes.rows) {
              const extMsgId = String(msg.id ?? "");
              if (!extMsgId) continue;
              const { data: msgLink } = await admin
                .from("mymia_crm_message_links")
                .select("id")
                .eq("workspace_id", workspace_id)
                .eq("external_message_id", extMsgId)
                .maybeSingle();
              if (msgLink) continue;

              const { data: newMsg, error: msgErr } = await admin
                .from("messages")
                .insert({
                  workspace_id,
                  conversation_id: conversationId!,
                  direction: String(msg.direction ?? "inbound"),
                  content: String(msg.body ?? "") || "(sem texto)",
                  message_type: String(msg.type ?? "text"),
                  media_url: (msg.media_url as string) ?? null,
                  media_mime_type: (msg.media_mime as string) ?? null,
                  provider_status: (msg.status as string) ?? null,
                  external_message_id: extMsgId,
                  sent_at: (msg.created_at as string) ?? new Date().toISOString(),
                  metadata: { origem: "mymia_crm" },
                })
                .select("id")
                .maybeSingle();
              if (msgErr || !newMsg) continue;

              await admin.from("mymia_crm_message_links").insert({
                workspace_id,
                external_message_id: extMsgId,
                message_id: newMsg.id,
                conversation_id: conversationId,
              });
              summary.messages++;
            }
          }
        }
      }
    }

    await admin
      .from("mymia_crm_sync_settings")
      .update({ last_pull_at: new Date().toISOString(), last_pull_summary: summary })
      .eq("workspace_id", workspace_id);

    await admin.from("mymia_crm_sync_logs").insert({
      workspace_id,
      direction: "inbound",
      action: "pull_batch",
      status: "ok",
      details: summary,
    });

    return json({ ok: true, mode, ...summary });
  } catch (e) {
    console.error("[mymia-crm-pull] fatal", (e as Error).message);
    return json({ ok: false, internal_error: true, error: "internal_error" });
  }
});
