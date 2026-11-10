// CloudTalk management: connect / webhook info / disconnect (managers) and click-to-call (members).
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/security.ts";
import { CLOUDTALK_API, cloudtalkAuthHeader } from "../_shared/cloudtalk.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), workspaceId: z.string().uuid(),
    apiKeyId: z.string().trim().min(3).max(200), apiKeySecret: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("webhook_info"), workspaceId: z.string().uuid() }),
  z.object({ action: z.literal("disconnect"), workspaceId: z.string().uuid() }),
  z.object({ action: z.literal("me"), workspaceId: z.string().uuid() }),
  z.object({ action: z.literal("set_auto_ai"), workspaceId: z.string().uuid(), enabled: z.boolean() }),
  z.object({ action: z.literal("call"), workspaceId: z.string().uuid(), phone: z.string().trim().min(6).max(30) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireAuth(req);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const ws = body.workspaceId;

    const [{ data: isSuper }, { data: isMember }, { data: canManage }] = await Promise.all([
      admin.rpc("is_super_admin", { _user_id: auth.userId }),
      admin.rpc("is_workspace_member", { _user_id: auth.userId, _workspace_id: ws }),
      admin.rpc("can_manage_workspace", { _user_id: auth.userId, _workspace_id: ws }),
    ]);
    if (!isMember && !isSuper) return json({ error: "forbidden", message: "Sem acesso a esta organização." }, 403);

    // Module gate (fail closed).
    const { data: mod } = await admin.from("workspace_modules")
      .select("status, marketplace_modules!inner(slug)")
      .eq("workspace_id", ws).eq("marketplace_modules.slug", "cloudtalk")
      .in("status", ["active", "trial"]).limit(1).maybeSingle();
    if (!mod) return json({ error: "module_inactive", message: "O módulo Telefonia CloudTalk não está ativo." }, 403);

    const manager = !!canManage || !!isSuper;

    if (body.action === "connect") {
      if (!manager) return json({ error: "forbidden", message: "Só gestores podem ligar a CloudTalk." }, 403);
      const test = await fetch(`${CLOUDTALK_API}/agents/index.json?limit=1`, {
        headers: { Authorization: cloudtalkAuthHeader(body.apiKeyId, body.apiKeySecret) },
      });
      if (!test.ok) return json({ error: "invalid_credentials", message: "A CloudTalk recusou estas chaves (verifique o ID e o segredo)." }, 400);
      const { error } = await admin.from("cloudtalk_connections").upsert({
        workspace_id: ws, api_key_id: body.apiKeyId, api_key_secret: body.apiKeySecret,
        enabled: true, created_by: auth.userId, updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id" });
      if (error) return json({ error: "store_failed", message: "Não foi possível guardar a ligação." }, 500);
      return json({ ok: true });
    }

    if (body.action === "webhook_info") {
      if (!manager) return json({ error: "forbidden" }, 403);
      const { data } = await admin.from("cloudtalk_connections").select("webhook_token").eq("workspace_id", ws).maybeSingle();
      if (!data) return json({ error: "not_connected" }, 404);
      return json({ url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/cloudtalk-webhook?token=${data.webhook_token}` });
    }

    if (body.action === "me") return json({ manager });

    if (body.action === "set_auto_ai") {
      if (!manager) return json({ error: "forbidden", message: "Só gestores podem alterar esta opção." }, 403);
      const { error } = await admin.from("cloudtalk_connections")
        .update({ auto_ai_summary: body.enabled, updated_at: new Date().toISOString() }).eq("workspace_id", ws);
      if (error) return json({ error: "store_failed", message: "Não foi possível guardar." }, 500);
      return json({ ok: true });
    }

    if (body.action === "disconnect") {
      if (!manager) return json({ error: "forbidden" }, 403);
      await admin.from("cloudtalk_connections").update({ enabled: false, updated_at: new Date().toISOString() }).eq("workspace_id", ws);
      return json({ ok: true });
    }

    // call
    const { data: conn } = await admin.from("cloudtalk_connections")
      .select("api_key_id, api_key_secret, enabled").eq("workspace_id", ws).maybeSingle();
    if (!conn?.enabled) return json({ error: "not_connected", message: "A CloudTalk não está ligada nesta organização." }, 400);
    const { data: agent } = await admin.from("cloudtalk_agents")
      .select("agent_id").eq("workspace_id", ws).eq("user_id", auth.userId).maybeSingle();
    if (!agent) return json({ error: "no_agent", message: "Defina o seu ID de agente CloudTalk nas Integrações." }, 400);
    const phone = body.phone.replace(/[^\d+]/g, "");
    const res = await fetch(`${CLOUDTALK_API}/calls/create.json`, {
      method: "POST",
      headers: { Authorization: cloudtalkAuthHeader(conn.api_key_id, conn.api_key_secret), "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: Number(agent.agent_id) || agent.agent_id, callee_number: phone }),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 300);
      console.error("cloudtalk call failed", res.status);
      return json({ error: "call_failed", message: `A CloudTalk não iniciou a chamada (${res.status}). Confirme que o seu agente está online.`, details: txt }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    console.error("cloudtalk-manage error", (e as Error).message);
    return json({ error: "internal_error" }, 500);
  }
});
