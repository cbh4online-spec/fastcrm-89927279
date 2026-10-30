// Gestão dos modelos oficiais da Meta (listar / submeter / apagar) para o workspace
// que tem a linha oficial `meta_cloud_api`. Fail-closed noutros workspaces.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isMetaInstanceAllowed, META_GATEWAY_URL } from "../_shared/whatsappMetaOfficial.ts";
import { buildMetaComponents, validateMetaTemplate, type MetaTemplateDraft } from "../_shared/metaTemplateRules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const workspaceId = String(body.workspaceId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(workspaceId) || !["list", "create", "delete"].includes(action)) {
      return json({ error: "Pedido inválido." }, 400);
    }

    const { data: member } = await admin.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", u.user.id).maybeSingle();
    const { data: sa } = await admin.rpc("is_super_admin", { _user_id: u.user.id });
    if (!member && !sa) return json({ error: "Sem acesso a este workspace." }, 403);
    const canManage = !!sa || ["owner", "admin"].includes(String(member?.role ?? ""));
    if (action !== "list" && !canManage) return json({ error: "Só o dono ou administradores podem gerir modelos." }, 403);

    const { data: inst } = await admin.from("whatsapp_provider_instances")
      .select("id, workspace_id, provider_name, active, metadata")
      .eq("workspace_id", workspaceId).eq("provider_name", "meta_cloud_api").eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!isMetaInstanceAllowed(inst as never, workspaceId)) {
      return json({ error: "Este workspace não tem a linha oficial WhatsApp ativa.", code: "META_NOT_ALLOWED" }, 200);
    }

    const lk = Deno.env.get("LOVABLE_API_KEY"), wk = Deno.env.get("WHATSAPP_API_KEY");
    if (!lk || !wk) return json({ error: "Linha oficial não configurada no servidor." }, 200);
    const headers = { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": wk, "Content-Type": "application/json" };

    let res: Response;
    if (action === "list") {
      res = await fetch(`${META_GATEWAY_URL}/message_templates?limit=200&fields=id,name,status,category,language,components,rejected_reason`, { headers });
    } else if (action === "create") {
      const d = body.template as MetaTemplateDraft;
      const draft: MetaTemplateDraft = {
        name: String(d?.name ?? ""), category: d?.category, language: String(d?.language ?? "pt_PT"),
        header: d?.header ? String(d.header) : undefined, body: String(d?.body ?? ""),
        footer: d?.footer ? String(d.footer) : undefined,
        examples: Array.isArray(d?.examples) ? d.examples.map((e) => String(e ?? "").slice(0, 200)) : [],
      };
      const errs = validateMetaTemplate(draft);
      if (errs.length) return json({ error: errs.join(" "), errors: errs }, 400);
      res = await fetch(`${META_GATEWAY_URL}/message_templates`, {
        method: "POST", headers,
        body: JSON.stringify({ name: draft.name, language: draft.language, category: draft.category, components: buildMetaComponents(draft) }),
      });
    } else {
      const name = String(body.name ?? "");
      if (!/^[a-z0-9_]{1,512}$/.test(name)) return json({ error: "Nome inválido." }, 400);
      res = await fetch(`${META_GATEWAY_URL}/message_templates?name=${encodeURIComponent(name)}`, { method: "DELETE", headers });
    }

    const raw = await res.text();
    if (!res.ok) {
      console.error(`[meta-templates] ${action} failed [${res.status}]: ${raw.slice(0, 500)}`);
      let msg = `A Meta recusou o pedido (${res.status}).`;
      try { const e = JSON.parse(raw)?.error; msg = e?.error_user_msg || e?.message || msg; } catch { /* */ }
      return json({ error: msg, status: res.status }, 200);
    }
    await admin.from("activity_logs").insert({
      workspace_id: workspaceId, user_id: u.user.id, action: `whatsapp_meta_template_${action}`,
      entity_type: "whatsapp_meta_template", details: { name: body.name ?? body.template?.name ?? null },
    }).then(() => {}, () => {});
    return json({ ok: true, data: raw ? JSON.parse(raw) : null });
  } catch (e) {
    console.error("[meta-templates] internal", e);
    return json({ error: "Erro interno.", code: "internal_error" }, 200);
  }
});
