// FastCRM — Ponte de sincronização com o CRM do mymia.world.
// Recebe leads do mymia.world (crm_leads) e cria/atualiza leads do workspace no FastCRM.
// Segurança: assinatura HMAC-SHA256 obrigatória (MYMIA_CRM_SYNC_SECRET), fail-closed.
// Nunca confia no corpo: valida com Zod, normaliza telefone/email e verifica o workspace.
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validateWebhook, logSecurityEvent, getRemoteIp, makeAdmin } from "../_shared/hmac.ts";

const MAX_LEADS = 500;

/** Estados do CRM do mymia.world → estados do FastCRM. */
const STATUS_MAP: Record<string, string> = {
  novo: "new",
  contactado: "contacted",
  reuniao_agendada: "meeting_scheduled",
  proposta_enviada: "proposal_sent",
  negociacao: "negotiation",
  ganho: "won",
  perdido: "lost",
};

const LeadSchema = z.object({
  external_id: z.string().min(1).max(64),
  nome: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().nullable(),
  telefone: z.string().min(6).max(32).optional().nullable(),
  estado: z.string().max(40).optional().nullable(),
  origem: z.string().max(60).optional().nullable(),
  empresa: z.string().max(255).optional().nullable(),
  notas: z.string().max(4000).optional().nullable(),
  valor_estimado_cents: z.number().int().min(0).max(100_000_000).optional().nullable(),
  updated_at: z.string().datetime().optional().nullable(),
});

const MensagemSchema = z.object({
  external_message_id: z.string().min(1).max(64),
  direcao: z.enum(["inbound", "outbound"]).default("inbound"),
  texto: z.string().max(8000).optional().nullable(),
  tipo: z.string().max(32).optional().nullable(),
  media_url: z.string().url().max(2000).optional().nullable(),
  criado_em: z.string().datetime().optional().nullable(),
});

const ConversaSchema = z.object({
  external_conversation_id: z.string().min(1).max(64),
  canal: z.string().max(32).optional().nullable(),
  telefone: z.string().max(32).optional().nullable(),
  contacto_nome: z.string().max(255).optional().nullable(),
  ultima_mensagem_em: z.string().datetime().optional().nullable(),
  mensagens: z.array(MensagemSchema).max(200).default([]),
});

const ConversasPorLead = z.array(ConversaSchema).max(20);

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
  mode: z.enum(["apply", "preview"]).default("apply"),
  leads: z.array(LeadSchema.extend({ conversas: ConversasPorLead.optional() })).min(1).max(MAX_LEADS),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normaliza para E.164 assumindo Portugal quando não há indicativo. */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
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
  const v = (raw ?? "").trim().toLowerCase();
  return v.length > 0 ? v : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const started = Date.now();
  const admin = makeAdmin();
  const remoteIp = getRemoteIp(req);
  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("x-mymia-signature") ?? req.headers.get("x-signature") ?? null;

  // 1) Autenticação antes de qualquer leitura ou escrita.
  //    Duas vias aceites, sempre fail-closed:
  //    a) Authorization: Bearer <FASTCRM_CRM_TOKEN>  (modelo simples, igual ao catálogo)
  //    b) x-mymia-signature: sha256=<HMAC do corpo com MYMIA_CRM_SYNC_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const bearerSecret = Deno.env.get("FASTCRM_CRM_TOKEN") ?? null;
  const useToken = Boolean(bearer) && Boolean(bearerSecret);
  console.log("[mymia-crm-sync] auth", {
    has_bearer: Boolean(bearer),
    has_token_secret: Boolean(bearerSecret),
    mode: useToken ? "token" : "hmac",
  });

  const check = useToken
    ? await validateWebhook({
        mode: "token",
        rawBody,
        secret: bearerSecret,
        signatureHeader: bearer,
        provider: "mymia_crm",
        functionName: "mymia-crm-sync",
        remoteIp,
      })
    : await validateWebhook({
        mode: "hmac",
        rawBody,
        secret: Deno.env.get("MYMIA_CRM_SYNC_SECRET"),
        signatureHeader,
        provider: "mymia_crm",
        functionName: "mymia-crm-sync",
        remoteIp,
        signaturePrefix: "sha256=",
      });
  await logSecurityEvent(admin, {
    provider: "mymia_crm",
    function_name: "mymia-crm-sync",
    validation_mode: useToken ? "token" : "hmac",
    outcome: check.outcome,
    reason: check.reason ?? null,
    remote_ip: remoteIp,
    signature_header: signatureHeader,
    duration_ms: Date.now() - started,
    payload_size: rawBody.length,
  });
  if (!check.ok) return json({ error: "unauthorized", reason: check.outcome }, 401);

  try {
    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const parsed = BodySchema.safeParse(bodyJson);
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { workspace_id, mode, leads } = parsed.data;

    // 2) Workspace tem de existir (fail-closed).
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("id", workspace_id)
      .maybeSingle();
    if (!ws) return json({ error: "workspace_not_found" }, 404);

    // 3) Configuração da ponte: entrada pode estar desligada.
    const { data: settings } = await admin
      .from("mymia_crm_sync_settings")
      .select("inbound_enabled, default_source, default_tags")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const inboundEnabled = settings?.inbound_enabled ?? true;
    if (!inboundEnabled) {
      await admin.from("mymia_crm_sync_logs").insert({
        workspace_id,
        direction: "inbound",
        action: "batch",
        status: "skipped",
        details: { reason: "inbound_disabled", received: leads.length },
      });
      return json({ ok: true, applied: false, reason: "inbound_disabled" });
    }

    const defaultSource = settings?.default_source ?? "mymia_crm";
    const defaultTags: string[] = settings?.default_tags ?? ["mymia", "crm"];

    const results: Array<{
      external_id: string;
      action: "created" | "updated" | "linked" | "skipped";
      lead_id?: string;
      reason?: string;
    }> = [];
    let conversationsCreated = 0;
    let messagesCreated = 0;


    for (const raw of leads) {
      const email = normalizeEmail(raw.email);
      const phone = normalizePhone(raw.telefone);

      if (!email && !phone) {
        results.push({ external_id: raw.external_id, action: "skipped", reason: "sem_email_nem_telefone" });
        continue;
      }

      const status = STATUS_MAP[(raw.estado ?? "novo").toLowerCase()] ?? "new";

      if (mode === "preview") {
        results.push({ external_id: raw.external_id, action: "updated", reason: "previsao" });
        continue;
      }

      // 3a) Já existe ligação para este id externo?
      const { data: link } = await admin
        .from("mymia_crm_lead_links")
        .select("id, lead_id")
        .eq("workspace_id", workspace_id)
        .eq("external_lead_id", raw.external_id)
        .maybeSingle();

      let leadId = link?.lead_id ?? null;

      // 3b) Sem ligação: tenta reconciliar por email no mesmo workspace (índice único).
      if (!leadId && email) {
        const { data: existing } = await admin
          .from("leads")
          .select("id")
          .eq("workspace_id", workspace_id)
          .eq("email", email)
          .maybeSingle();
        if (existing) leadId = existing.id;
      }

      const common = {
        name: raw.nome.trim(),
        email,
        phone,
        status,
        company_name: raw.empresa?.trim() || null,
        estimated_value:
          raw.valor_estimado_cents != null ? raw.valor_estimado_cents / 100 : undefined,
        updated_at: new Date().toISOString(),
      };

      if (leadId) {
        const patch: Record<string, unknown> = { ...common };
        if (patch.estimated_value === undefined) delete patch.estimated_value;
        const { error: upErr } = await admin.from("leads").update(patch).eq("id", leadId);
        if (upErr) {
          await admin.from("mymia_crm_sync_logs").insert({
            workspace_id,
            direction: "inbound",
            action: "update_lead",
            status: "error",
            external_lead_id: raw.external_id,
            lead_id: leadId,
            error: upErr.message,
          });
          results.push({ external_id: raw.external_id, action: "skipped", reason: "erro_ao_atualizar" });
          continue;
        }
        results.push({
          external_id: raw.external_id,
          action: link ? "updated" : "linked",
          lead_id: leadId,
        });
      } else {
        const insertPayload: Record<string, unknown> = {
          workspace_id,
          ...common,
          source: raw.origem?.trim() || defaultSource,
          tags: defaultTags,
        };
        if (insertPayload.estimated_value === undefined) delete insertPayload.estimated_value;

        const { data: created, error: insErr } = await admin
          .from("leads")
          .insert(insertPayload)
          .select("id")
          .maybeSingle();

        if (insErr || !created) {
          await admin.from("mymia_crm_sync_logs").insert({
            workspace_id,
            direction: "inbound",
            action: "create_lead",
            status: "error",
            external_lead_id: raw.external_id,
            error: insErr?.message ?? "insert_failed",
          });
          results.push({ external_id: raw.external_id, action: "skipped", reason: "erro_ao_criar" });
          continue;
        }
        leadId = created.id;
        results.push({ external_id: raw.external_id, action: "created", lead_id: leadId });
      }

      // 3c) Guarda/atualiza a ligação estável.
      await admin.from("mymia_crm_lead_links").upsert(
        {
          workspace_id,
          external_lead_id: raw.external_id,
          lead_id: leadId,
          external_status: raw.estado ?? null,
          external_updated_at: raw.updated_at ?? null,
          last_inbound_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
          attempt_count: 0,
        },
        { onConflict: "workspace_id,external_lead_id" },
      );

      // 3d) Conversas e mensagens associadas (idempotentes por id externo).
      for (const conversa of raw.conversas ?? []) {
        const extConvId = conversa.external_conversation_id;

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
              channel: conversa.canal?.trim() || "whatsapp",
              lead_id: leadId,
              status: "open",
              external_thread_id: extConvId,
              last_message_at: conversa.ultima_mensagem_em ?? null,
              channel_metadata: {
                origem: "mymia_crm",
                phone_e164: normalizePhone(conversa.telefone),
                contact_name: conversa.contacto_nome ?? null,
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
          conversationsCreated++;
        }

        for (const msg of conversa.mensagens) {
          const { data: msgLink } = await admin
            .from("mymia_crm_message_links")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("external_message_id", msg.external_message_id)
            .maybeSingle();
          if (msgLink) continue;

          const { data: newMsg, error: msgErr } = await admin
            .from("messages")
            .insert({
              workspace_id,
              conversation_id: conversationId,
              direction: msg.direcao,
              content: (msg.texto ?? "").trim() || "(sem texto)",
              message_type: msg.tipo?.trim() || "text",
              media_url: msg.media_url ?? null,
              external_message_id: msg.external_message_id,
              sent_at: msg.criado_em ?? new Date().toISOString(),
              metadata: { origem: "mymia_crm" },
            })
            .select("id")
            .maybeSingle();
          if (msgErr || !newMsg) continue;

          await admin.from("mymia_crm_message_links").insert({
            workspace_id,
            external_message_id: msg.external_message_id,
            message_id: newMsg.id,
            conversation_id: conversationId,
          });
          messagesCreated++;
        }
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated" || r.action === "linked").length;
    const skipped = results.filter((r) => r.action === "skipped").length;

    await admin.from("mymia_crm_sync_logs").insert({
      workspace_id,
      direction: "inbound",
      action: mode === "preview" ? "batch_preview" : "batch",
      status: "ok",
      details: {
        received: leads.length,
        created,
        updated,
        skipped,
        conversations: conversationsCreated,
        messages: messagesCreated,
      },
    });

    return json({
      ok: true,
      mode,
      received: leads.length,
      created,
      updated,
      skipped,
      conversations: conversationsCreated,
      messages: messagesCreated,
      results,
    });
  } catch (e) {
    console.error("[mymia-crm-sync] fatal", (e as Error).message);
    return json({ ok: false, internal_error: true, error: "internal_error" });
  }
});
