// Gestão da ligação WAScript por workspace (owner/admin ou super admin).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { testWascript } from "../_shared/wascript.ts";

const Body = z.object({
  action: z.enum(["status", "save", "test", "set_primary", "disconnect", "rotate_webhook"]),
  workspaceId: z.string().uuid(),
  apiToken: z.string().trim().min(8).max(300).optional(),
  primary: z.boolean().optional(),
});

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

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }, 400);
    const { action, workspaceId } = parsed.data;

    const { data: member } = await admin.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", u.user.id).maybeSingle();
    const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: u.user.id });
    const isManager = ["owner", "admin", "agency"].includes(member?.role ?? "");
    if (!member && !isSuper) return json({ error: "Sem acesso a esta organização." }, 403);
    if (action !== "status" && !isManager && !isSuper) return json({ error: "Só proprietários e administradores podem alterar a ligação." }, 403);

    const webhookUrl = (token: string) => `${url}/functions/v1/wascript-webhook?t=${token}`;
    const { data: conn } = await admin.from("whatsapp_wascript_connections").select("*").eq("workspace_id", workspaceId).maybeSingle();
    const { data: inst } = await admin.from("whatsapp_provider_instances").select("id, provider_name, metadata")
      .eq("workspace_id", workspaceId).eq("active", true).order("created_at", { ascending: true }).limit(1).maybeSingle();

    const statusPayload = (c: typeof conn) => ({
      connected: !!c && c.status !== "disconnected",
      status: c?.status ?? "disconnected",
      lastError: c?.last_error ?? null,
      lastCheckedAt: c?.last_checked_at ?? null,
      lastInboundAt: c?.last_inbound_at ?? null,
      webhookUrl: c && isManager || c && isSuper ? webhookUrl(c.webhook_token) : null,
      isPrimary: inst?.provider_name === "wascript",
    });

    if (action === "status") return json(statusPayload(conn));

    if (action === "save") {
      if (!parsed.data.apiToken) return json({ error: "Indique o token da WAScript." }, 400);
      const t = await testWascript(parsed.data.apiToken);
      if (!t.ok && t.code === "WASCRIPT_TOKEN_INVALID") return json({ error: t.message, code: t.code }, 200);
      const now = new Date().toISOString();
      const row = {
        workspace_id: workspaceId, api_token: parsed.data.apiToken, status: t.ok ? "connected" : "error",
        last_error: t.ok ? null : t.message, last_checked_at: now, connected_by: u.user.id, updated_at: now,
      };
      const { data: saved, error } = await admin.from("whatsapp_wascript_connections").upsert(row, { onConflict: "workspace_id" }).select("*").single();
      if (error) return json({ error: "Não foi possível guardar a ligação." }, 200);
      return json({ ...statusPayload(saved), warning: t.ok ? null : t.message });
    }

    if (!conn) return json({ error: "A WAScript ainda não está ligada nesta organização." }, 200);

    if (action === "test") {
      const t = await testWascript(conn.api_token);
      const { data: upd } = await admin.from("whatsapp_wascript_connections").update({
        status: t.ok ? "connected" : "error", last_error: t.ok ? null : t.message, last_checked_at: new Date().toISOString(),
      }).eq("workspace_id", workspaceId).select("*").single();
      return json({ ...statusPayload(upd ?? conn), ok: t.ok, message: t.message });
    }

    if (action === "rotate_webhook") {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: upd } = await admin.from("whatsapp_wascript_connections").update({ webhook_token: token, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId).select("*").single();
      return json(statusPayload(upd ?? conn));
    }

    if (action === "set_primary" || action === "disconnect") {
      const makePrimary = action === "set_primary" && parsed.data.primary !== false;
      if (makePrimary && conn.status === "disconnected") return json({ error: "Ligue primeiro a WAScript." }, 200);
      if (inst) {
        const meta = (inst.metadata ?? {}) as Record<string, unknown>;
        if (makePrimary && inst.provider_name !== "wascript") {
          await admin.from("whatsapp_provider_instances").update({
            provider_name: "wascript", metadata: { ...meta, previous_provider: inst.provider_name },
          }).eq("id", inst.id);
        } else if (!makePrimary && inst.provider_name === "wascript") {
          const prev = typeof meta.previous_provider === "string" && meta.previous_provider !== "wascript" ? meta.previous_provider : "zapi";
          await admin.from("whatsapp_provider_instances").update({ provider_name: prev }).eq("id", inst.id);
        }
      } else if (makePrimary) {
        await admin.from("whatsapp_provider_instances").insert({
          workspace_id: workspaceId, provider_name: "wascript", display_name: "FastCRM WhatsApp Pro", active: true,
        });
      }
      if (action === "disconnect") {
        await admin.from("whatsapp_wascript_connections").update({ status: "disconnected", updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId);
      }
      const { data: c2 } = await admin.from("whatsapp_wascript_connections").select("*").eq("workspace_id", workspaceId).maybeSingle();
      const { data: i2 } = await admin.from("whatsapp_provider_instances").select("provider_name")
        .eq("workspace_id", workspaceId).eq("active", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
      return json({ ...statusPayload(c2), isPrimary: i2?.provider_name === "wascript" });
    }
    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[wascript-manage]", (e as Error).message);
    return json({ error: "internal_error" }, 200);
  }
});
