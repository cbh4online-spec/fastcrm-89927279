// Gestor de modelos oficiais da Meta (rascunhos, validação, submissão, sincronização,
// duplicação, upload de media, envio de modelo aprovado). Fail-closed fora do workspace autorizado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { isMetaInstanceAllowed, META_GATEWAY_URL, toMetaRecipient, describeMetaError } from "../_shared/whatsappMetaOfficial.ts";
import {
  buildMetaComponents, validateMetaTemplateFields, canSendTemplate, countBodyVariables, metaTemplateDeletePath, type MetaTemplateDraft,
} from "../_shared/metaTemplateRules.ts";
import { phoneOptOutVariants } from "../_shared/phoneVariants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ACTIONS = ["list", "save_draft", "validate", "submit", "sync", "duplicate", "delete", "upload_media", "send"] as const;
const ButtonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]), text: z.string().max(40),
  url: z.string().max(2000).optional(), phone: z.string().max(20).optional(), urlExample: z.string().max(2000).optional(),
});
const DraftSchema = z.object({
  name: z.string().max(512), category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]), language: z.string().max(10),
  header: z.string().max(200).optional(), headerType: z.enum(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
  headerHandle: z.string().max(2000).optional(), body: z.string().max(2000).default(""), footer: z.string().max(200).optional(),
  examples: z.array(z.string().max(200)).max(20).default([]), buttons: z.array(ButtonSchema).max(10).optional(),
  addSecurityRecommendation: z.boolean().optional(), codeExpirationMinutes: z.number().int().optional(), copyCodeText: z.string().max(40).optional(),
});
const MetaSchema = z.object({
  internalName: z.string().min(1).max(160), description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  variables: z.array(z.object({ index: z.number().int().min(1).max(20), crmField: z.string().max(80).nullable().optional(), fallback: z.string().max(200).nullable().optional() })).max(20).default([]),
  buttonActions: z.array(z.object({ buttonKey: z.string().max(40), actionType: z.string().max(40), config: z.record(z.unknown()).default({}) })).max(50).default([]),
  automations: z.record(z.unknown()).default({}),
});

const LOCKED = new Set(["APPROVED", "PENDING", "IN_APPEAL", "PAUSED", "DISABLED"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "") as typeof ACTIONS[number];
    const workspaceId = String(body.workspaceId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !ACTIONS.includes(action)) return json({ error: "Pedido inválido." }, 400);

    const { data: member } = await admin.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
    const { data: sa } = await admin.rpc("is_super_admin", { _user_id: userId });
    if (!member && !sa) return json({ error: "Sem acesso a este workspace." }, 403);
    const canManage = !!sa || ["owner", "admin"].includes(String(member?.role ?? ""));
    if (!["list", "validate", "send"].includes(action) && !canManage) return json({ error: "Só o dono ou administradores podem gerir modelos." }, 403);

    const { data: inst } = await admin.from("whatsapp_provider_instances")
      .select("id, workspace_id, provider_name, active, metadata")
      .eq("workspace_id", workspaceId).eq("provider_name", "meta_cloud_api").eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!isMetaInstanceAllowed(inst as never, workspaceId)) {
      return json({ error: "Este workspace não tem a linha oficial WhatsApp ativa.", code: "META_NOT_ALLOWED" }, 200);
    }
    const lk = Deno.env.get("LOVABLE_API_KEY"), wk = Deno.env.get("WHATSAPP_API_KEY");
    if (!lk || !wk) return json({ error: "Linha oficial não configurada no servidor.", code: "NOT_CONFIGURED" }, 200);
    const gh = { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": wk };
    const meta = async (path: string, init: RequestInit = {}) => {
      const r = await fetch(`${META_GATEWAY_URL}${path}`, { ...init, headers: { ...gh, ...(init.headers ?? {}) } });
      const raw = await r.text();
      if (!r.ok) console.error(`[meta-templates] ${action} ${path} [${r.status}]: ${raw.slice(0, 500)}`);
      let parsed: any = null; try { parsed = raw ? JSON.parse(raw) : null; } catch { /* */ }
      const msg = parsed?.error?.error_user_msg || parsed?.error?.message || `A Meta recusou o pedido (${r.status}).`;
      return { ok: r.ok, status: r.status, data: parsed, raw, msg };
    };
    const log = (a: string, details: Record<string, unknown>) =>
      admin.from("activity_logs").insert({ workspace_id: workspaceId, user_id: userId, action: `whatsapp_meta_template_${a}`, entity_type: "whatsapp_meta_template", details }).then(() => {}, () => {});
    const snapshot = async (tpl: any, change: string) => {
      await admin.from("whatsapp_meta_template_versions").insert({
        template_id: tpl.id, workspace_id: workspaceId, version: tpl.version, change_type: change,
        snapshot: { definition: tpl.definition, components: tpl.components, automations: tpl.automations, internal_name: tpl.internal_name }, status: tpl.status, changed_by: userId,
      });
    };
    const loadTpl = async (id: unknown) => {
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data } = await admin.from("whatsapp_meta_templates").select("*").eq("id", id).eq("workspace_id", workspaceId).is("deleted_at", null).maybeSingle();
      return data;
    };

    // ---------- list ----------
    if (action === "list") {
      const { data, error } = await admin.from("whatsapp_meta_templates").select("*").eq("workspace_id", workspaceId).is("deleted_at", null).order("updated_at", { ascending: false });
      if (error) return json({ error: "Não foi possível ler os modelos." }, 200);
      const ids = (data ?? []).map((t) => t.id);
      const [{ data: vars }, { data: acts }, { data: vers }] = await Promise.all([
        admin.from("whatsapp_meta_template_variables").select("*").in("template_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("whatsapp_meta_template_button_actions").select("*").in("template_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        admin.from("whatsapp_meta_template_versions").select("id,template_id,version,change_type,status,created_at").in("template_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(500),
      ]);
      return json({ ok: true, templates: data, variables: vars ?? [], buttonActions: acts ?? [], versions: vers ?? [], phone: (inst as any)?.metadata?.display_phone_number ?? null });
    }

    // ---------- validate / save_draft ----------
    if (action === "validate" || action === "save_draft") {
      const dp = DraftSchema.safeParse(body.template);
      if (!dp.success) return json({ error: "Dados do modelo inválidos.", details: dp.error.flatten().fieldErrors }, 400);
      const draft = dp.data as MetaTemplateDraft;
      const fieldErrors = validateMetaTemplateFields(draft);
      if (action === "validate") {
        const { data: dup } = await admin.from("whatsapp_meta_templates").select("id").eq("workspace_id", workspaceId).eq("meta_name", draft.name).eq("language", draft.language).is("deleted_at", null).neq("id", body.templateId ?? "00000000-0000-0000-0000-000000000000").limit(1);
        if (dup?.length) (fieldErrors.name ??= []).push("Já existe um modelo com este nome técnico neste idioma.");
        return json({ ok: true, fieldErrors, valid: Object.keys(fieldErrors).length === 0 });
      }
      const mp = MetaSchema.safeParse(body.meta ?? {});
      if (!mp.success) return json({ error: "Dados internos inválidos.", details: mp.error.flatten().fieldErrors }, 400);
      if (!/^[a-z0-9_]{1,512}$/.test(draft.name)) return json({ error: "Nome técnico inválido.", fieldErrors: { name: ["O nome só pode ter letras minúsculas, números e _."] } }, 200);
      const existing = body.templateId ? await loadTpl(body.templateId) : null;
      if (body.templateId && !existing) return json({ error: "Modelo não encontrado." }, 404);
      if (existing && LOCKED.has(existing.status)) return json({ error: "Este modelo já foi submetido/aprovado e está protegido. Duplique-o para criar uma nova versão.", code: "LOCKED" }, 200);
      const row = {
        workspace_id: workspaceId, provider_instance_id: (inst as any).id, internal_name: mp.data.internalName, meta_name: draft.name,
        category: draft.category, language: draft.language, description: mp.data.description ?? null, tags: mp.data.tags,
        definition: draft, components: buildMetaComponents(draft), automations: mp.data.automations, updated_at: new Date().toISOString(),
      };
      let tpl: any;
      if (existing) {
        const { data, error } = await admin.from("whatsapp_meta_templates").update({ ...row, version: existing.version + 1, status: existing.status === "REJECTED" ? "DRAFT" : existing.status }).eq("id", existing.id).select("*").single();
        if (error) return json({ error: error.code === "23505" ? "Já existe um modelo com este nome técnico neste idioma." : "Não foi possível guardar." }, 200);
        tpl = data;
      } else {
        const { data, error } = await admin.from("whatsapp_meta_templates").insert({ ...row, status: "DRAFT", created_by: userId, parent_template_id: body.parentTemplateId ?? null }).select("*").single();
        if (error) return json({ error: error.code === "23505" ? "Já existe um modelo com este nome técnico neste idioma." : "Não foi possível guardar." }, 200);
        tpl = data;
      }
      await admin.from("whatsapp_meta_template_variables").delete().eq("template_id", tpl.id);
      const nVars = countBodyVariables(draft.body);
      const vars = Array.from({ length: nVars }, (_, i) => {
        const v = mp.data.variables.find((x) => x.index === i + 1);
        return { template_id: tpl.id, workspace_id: workspaceId, component: "BODY", var_index: i + 1, crm_field: v?.crmField ?? null, example_value: draft.examples[i] ?? null, fallback_value: v?.fallback ?? null };
      });
      if (vars.length) await admin.from("whatsapp_meta_template_variables").insert(vars);
      await admin.from("whatsapp_meta_template_button_actions").delete().eq("template_id", tpl.id);
      if (mp.data.buttonActions.length) {
        await admin.from("whatsapp_meta_template_button_actions").insert(mp.data.buttonActions.map((a) => ({
          template_id: tpl.id, workspace_id: workspaceId, button_key: a.buttonKey, action_type: a.actionType, config: a.config,
          workflow_id: typeof a.config.workflow_id === "string" && /^[0-9a-f-]{36}$/i.test(a.config.workflow_id) ? a.config.workflow_id : null,
        })));
      }
      await snapshot(tpl, existing ? "edit" : "create");
      await log("save", { id: tpl.id, name: tpl.meta_name });
      return json({ ok: true, template: tpl, fieldErrors: validateMetaTemplateFields(draft) });
    }

    // ---------- submit ----------
    if (action === "submit") {
      const tpl = await loadTpl(body.templateId);
      if (!tpl) return json({ error: "Modelo não encontrado." }, 404);
      if (tpl.status !== "DRAFT" && tpl.status !== "REJECTED") return json({ error: "Este modelo já foi submetido.", code: "LOCKED" }, 200);
      const draft = tpl.definition as MetaTemplateDraft;
      const fe = validateMetaTemplateFields(draft);
      if (Object.keys(fe).length) return json({ error: "Corrija os erros antes de enviar.", fieldErrors: fe }, 200);
      const r = await meta("/message_templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tpl.meta_name, language: tpl.language, category: tpl.category, components: buildMetaComponents(draft) }) });
      if (!r.ok) {
        await admin.from("whatsapp_meta_templates").update({ rejected_reason: r.msg, updated_at: new Date().toISOString() }).eq("id", tpl.id);
        return json({ error: r.msg, status: r.status }, 200);
      }
      // Submissão aceite ≠ aprovado: guarda o estado que a Meta devolveu (normalmente PENDING).
      const st = String(r.data?.status ?? "PENDING").toUpperCase();
      const { data: upd } = await admin.from("whatsapp_meta_templates").update({
        meta_template_id: r.data?.id ?? null, status: st, category: r.data?.category ?? tpl.category, rejected_reason: null,
        submitted_at: new Date().toISOString(), last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", tpl.id).select("*").single();
      if (upd) await snapshot(upd, "submit");
      await log("submit", { id: tpl.id, name: tpl.meta_name, status: st });
      return json({ ok: true, template: upd });
    }

    // ---------- sync ----------
    if (action === "sync") {
      const all: any[] = [];
      let path = "/message_templates?limit=200&fields=id,name,status,category,language,components,rejected_reason,quality_score";
      for (let i = 0; i < 10 && path; i++) {
        const r = await meta(path);
        if (!r.ok) return json({ error: r.msg, status: r.status }, 200);
        all.push(...(r.data?.data ?? []));
        const after = r.data?.paging?.cursors?.after;
        path = r.data?.paging?.next && after ? `/message_templates?limit=200&after=${encodeURIComponent(after)}&fields=id,name,status,category,language,components,rejected_reason,quality_score` : "";
      }
      const { data: local } = await admin.from("whatsapp_meta_templates").select("*").eq("workspace_id", workspaceId).is("deleted_at", null);
      let updated = 0, imported = 0;
      const now = new Date().toISOString();
      for (const m of all) {
        const t = (local ?? []).find((l) => l.meta_template_id === m.id) ?? (local ?? []).find((l) => l.meta_name === m.name && l.language === m.language);
        const patch = {
          meta_template_id: m.id, status: String(m.status ?? "UNKNOWN").toUpperCase(), category: m.category ?? undefined,
          rejected_reason: m.rejected_reason && m.rejected_reason !== "NONE" ? m.rejected_reason : null,
          quality_score: m.quality_score?.score ?? null, last_synced_at: now,
        };
        if (t) {
          const changed = t.status !== patch.status;
          const { data: upd } = await admin.from("whatsapp_meta_templates").update(patch).eq("id", t.id).select("*").single();
          if (changed && upd) await snapshot(upd, "status_sync");
          updated++;
        } else {
          const comps = m.components ?? [];
          const bodyText = comps.find((c: any) => c.type === "BODY")?.text ?? "";
          const head = comps.find((c: any) => c.type === "HEADER");
          const foot = comps.find((c: any) => c.type === "FOOTER");
          const btn = comps.find((c: any) => c.type === "BUTTONS")?.buttons ?? [];
          const definition = {
            name: m.name, category: m.category, language: m.language, body: bodyText,
            headerType: head ? head.format : "NONE", header: head?.format === "TEXT" ? head.text : undefined,
            footer: foot?.text, examples: comps.find((c: any) => c.type === "BODY")?.example?.body_text?.[0] ?? [],
            buttons: btn.filter((b: any) => ["QUICK_REPLY", "URL", "PHONE_NUMBER"].includes(b.type)).map((b: any) => ({ type: b.type, text: b.text, url: b.url, phone: b.phone_number })),
          };
          const { data: ins } = await admin.from("whatsapp_meta_templates").insert({
            workspace_id: workspaceId, provider_instance_id: (inst as any).id, internal_name: m.name, meta_name: m.name, language: m.language,
            category: m.category ?? "UTILITY", definition, components: comps, created_by: userId, ...patch,
          }).select("*").single();
          if (ins) { await snapshot(ins, "imported"); imported++; }
        }
      }
      await log("sync", { updated, imported });
      return json({ ok: true, updated, imported });
    }

    // ---------- duplicate ----------
    if (action === "duplicate") {
      const tpl = await loadTpl(body.templateId);
      if (!tpl) return json({ error: "Modelo não encontrado." }, 404);
      let base = `${tpl.meta_name}_v${tpl.version + 1}`.slice(0, 500);
      for (let i = 2; i < 50; i++) {
        const { data: d } = await admin.from("whatsapp_meta_templates").select("id").eq("workspace_id", workspaceId).eq("meta_name", base).eq("language", tpl.language).is("deleted_at", null).limit(1);
        if (!d?.length) break;
        base = `${tpl.meta_name}_v${tpl.version + i}`.slice(0, 500);
      }
      const definition = { ...(tpl.definition as object), name: base };
      const { data: ins, error } = await admin.from("whatsapp_meta_templates").insert({
        workspace_id: workspaceId, provider_instance_id: tpl.provider_instance_id, internal_name: `${tpl.internal_name} (cópia)`.slice(0, 160),
        meta_name: base, category: tpl.category, language: tpl.language, description: tpl.description, tags: tpl.tags,
        definition, components: buildMetaComponents(definition as MetaTemplateDraft), automations: tpl.automations, status: "DRAFT",
        parent_template_id: tpl.id, created_by: userId,
      }).select("*").single();
      if (error || !ins) return json({ error: "Não foi possível duplicar." }, 200);
      const [{ data: vars }, { data: acts }] = await Promise.all([
        admin.from("whatsapp_meta_template_variables").select("*").eq("template_id", tpl.id),
        admin.from("whatsapp_meta_template_button_actions").select("*").eq("template_id", tpl.id),
      ]);
      if (vars?.length) await admin.from("whatsapp_meta_template_variables").insert(vars.map(({ id: _i, ...v }) => ({ ...v, template_id: ins.id })));
      if (acts?.length) await admin.from("whatsapp_meta_template_button_actions").insert(acts.map(({ id: _i, ...a }) => ({ ...a, template_id: ins.id })));
      await snapshot(ins, "duplicate");
      await log("duplicate", { from: tpl.id, to: ins.id });
      return json({ ok: true, template: ins });
    }

    // ---------- delete ----------
    if (action === "delete") {
      const tpl = await loadTpl(body.templateId);
      if (!tpl) return json({ error: "Modelo não encontrado." }, 404);
      if (tpl.meta_template_id || tpl.status !== "DRAFT") {
        // Só por nome, a Meta apaga TODOS os idiomas do modelo; com hsm_id apaga apenas este.
        const r = await meta(metaTemplateDeletePath(tpl.meta_name, tpl.meta_template_id), { method: "DELETE" });
        if (!r.ok && r.status !== 404) return json({ error: r.msg, status: r.status }, 200);
      }
      await admin.from("whatsapp_meta_templates").update({ deleted_at: new Date().toISOString(), status: "DELETED" }).eq("id", tpl.id);
      await log("delete", { id: tpl.id, name: tpl.meta_name });
      return json({ ok: true });
    }

    // ---------- upload_media (exemplo do cabeçalho → header_handle) ----------
    if (action === "upload_media") {
      const p = z.object({ fileBase64: z.string().max(140_000_000), mimeType: z.string().max(100), fileName: z.string().max(200) }).safeParse(body);
      if (!p.success) return json({ error: "Ficheiro inválido." }, 400);
      const bytes = Uint8Array.from(atob(p.data.fileBase64), (c) => c.charCodeAt(0));
      const s = await meta(`/uploads?file_name=${encodeURIComponent(p.data.fileName)}&file_length=${bytes.length}&file_type=${encodeURIComponent(p.data.mimeType)}`, { method: "POST" });
      if (!s.ok || !s.data?.id) return json({ error: `Não foi possível iniciar o carregamento na Meta: ${s.msg}`, status: s.status }, 200);
      const up = await meta(`/${s.data.id}`, { method: "POST", headers: { file_offset: "0", "Content-Type": p.data.mimeType }, body: bytes });
      if (!up.ok || !up.data?.h) return json({ error: `A Meta não aceitou o ficheiro: ${up.msg}`, status: up.status }, 200);
      await log("upload_media", { name: p.data.fileName, size: bytes.length });
      return json({ ok: true, handle: up.data.h });
    }

    // ---------- send (modelo aprovado a um contacto / teste) ----------
    const sp = z.object({
      templateId: z.string().uuid(), phone: z.string().min(6).max(30), contactId: z.string().uuid().optional().nullable(),
      values: z.record(z.string().max(500)).default({}), test: z.boolean().default(false),
    }).safeParse(body);
    if (!sp.success) return json({ error: "Pedido de envio inválido.", details: sp.error.flatten().fieldErrors }, 400);
    const tpl = await loadTpl(sp.data.templateId);
    if (!tpl) return json({ error: "Modelo não encontrado." }, 404);
    const to = toMetaRecipient(sp.data.phone);
    if (!to) return json({ error: "Número inválido para WhatsApp.", code: "INVALID_RECIPIENT" }, 200);
    const variants = phoneOptOutVariants(to);
    const pv = variants.length ? variants : [to];
    const [{ data: oo, error: ooErr }, { data: cons, error: cErr }] = await Promise.all([
      admin.from("whatsapp_optouts").select("id").eq("workspace_id", workspaceId).in("phone", pv).limit(1),
      admin.from("whatsapp_consents").select("status,consent_category,revoked_at").eq("workspace_id", workspaceId).in("phone", pv).order("updated_at", { ascending: false }).limit(20),
    ]);
    if (ooErr || cErr) return json({ error: "Não foi possível confirmar o consentimento. Envio bloqueado por segurança.", code: "CONSENT_CHECK_FAILED" }, 200);
    const revoked = (cons ?? []).some((c) => c.revoked_at || ["revoked", "withdrawn", "denied"].includes(String(c.status).toLowerCase()));
    const marketingConsent = !revoked && (cons ?? []).some((c) => ["granted", "active", "accepted"].includes(String(c.status).toLowerCase()) && (!c.consent_category || /market/i.test(c.consent_category)));
    const gate = canSendTemplate({ status: tpl.status, category: tpl.category, optedOut: (oo ?? []).length > 0 || revoked, marketingConsent });
    if (!gate.ok) return json({ error: gate.message, code: gate.code }, 200);

    // Resolve variáveis com dados reais do contacto (exemplos nunca são usados no envio)
    const { data: vars } = await admin.from("whatsapp_meta_template_variables").select("*").eq("template_id", tpl.id).order("var_index");
    let contact: any = null, company: any = null, ownerName: string | null = null;
    if (sp.data.contactId) {
      const { data: c } = await admin.from("contacts").select("*").eq("id", sp.data.contactId).eq("workspace_id", workspaceId).maybeSingle();
      contact = c;
      if (c?.company_id) { const { data: co } = await admin.from("companies").select("name").eq("id", c.company_id).eq("workspace_id", workspaceId).maybeSingle(); company = co; }
      // Responsável comercial: vendedor (sales_reps) ou, na falta, o gestor atribuído.
      if (c?.sales_rep_id) {
        const { data: rep } = await admin.from("sales_reps").select("name").eq("id", c.sales_rep_id).eq("workspace_id", workspaceId).maybeSingle();
        ownerName = rep?.name ?? null;
      }
      if (!ownerName && c?.assigned_to) {
        const { data: pr } = await admin.from("profiles").select("full_name").eq("id", c.assigned_to).maybeSingle();
        ownerName = pr?.full_name ?? null;
      }
    }
    const resolve = (f: string | null): string | null => {
      if (!f || f === "manual") return null;
      if (f === "contact.first_name") return contact?.first_name ?? null;
      if (f === "contact.last_name") return contact?.last_name ?? null;
      if (f === "contact.full_name") return [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") || contact?.name || null;
      if (f === "contact.phone") return contact?.phone ?? null;
      if (f === "contact.email") return contact?.email ?? null;
      if (f === "company.name") return company?.name ?? null;
      if (f === "owner.name") return ownerName;
      return null;
    };
    const n = countBodyVariables(String((tpl.definition as any)?.body ?? ""));
    const params: string[] = [];
    for (let i = 1; i <= n; i++) {
      const v = (vars ?? []).find((x) => x.var_index === i);
      const val = (sp.data.values[String(i)] ?? "").trim() || resolve(v?.crm_field ?? null) || (v?.fallback_value ?? "").trim();
      if (!val) return json({ error: `Falta o valor da variável {{${i}}}.`, code: "MISSING_VARIABLE", index: i }, 200);
      params.push(val);
    }
    const components: unknown[] = [];
    const def = tpl.definition as MetaTemplateDraft;
    if (def.headerType && ["IMAGE", "VIDEO", "DOCUMENT"].includes(def.headerType)) {
      const link = (sp.data.values.header_link ?? "").trim();
      if (!/^https:\/\//.test(link)) return json({ error: "Indique o link https do ficheiro do cabeçalho para este envio.", code: "MISSING_HEADER_MEDIA" }, 200);
      const k = def.headerType.toLowerCase();
      components.push({ type: "header", parameters: [{ type: k, [k]: { link } }] });
    }
    if (params.length) components.push({ type: "body", parameters: params.map((t) => ({ type: "text", text: t })) });
    if (tpl.category === "AUTHENTICATION") {
      const code = params[0] ?? (sp.data.values.code ?? "").trim();
      if (!code) return json({ error: "Indique o código.", code: "MISSING_VARIABLE" }, 200);
      components.length = 0;
      components.push({ type: "body", parameters: [{ type: "text", text: code }] }, { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] });
    }
    const r = await meta("/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: tpl.meta_name, language: { code: tpl.language }, components } }) });
    if (!r.ok) {
      const info = describeMetaError(r.status, r.raw);
      await admin.from("whatsapp_meta_template_events").insert({ workspace_id: workspaceId, template_id: tpl.id, contact_id: sp.data.contactId ?? null, phone: to, event_type: "send_failed", result: info.code, details: { status: r.status, msg: r.msg }, created_by: userId });
      return json({ error: r.msg || info.message, code: info.code }, 200);
    }
    const messageId = r.data?.messages?.[0]?.id ?? null;
    await admin.from("whatsapp_meta_template_events").insert({ workspace_id: workspaceId, template_id: tpl.id, contact_id: sp.data.contactId ?? null, phone: to, message_id: messageId, event_type: sp.data.test ? "test_accepted" : "accepted", result: "accepted_by_api", details: { params_count: params.length }, created_by: userId });
    await log("send", { id: tpl.id, test: sp.data.test });
    return json({ ok: true, messageId, note: "Aceite pela Meta. A confirmação de entrega não está disponível neste momento." });
  } catch (e) {
    console.error("[meta-templates] internal", e);
    return json({ error: "Erro interno.", code: "internal_error" }, 200);
  }
});
