// Chamadas de voz WhatsApp via Z-API (SDK @z-api/call). Só chamadas humanas iniciadas
// pelo utilizador: o token efémero é pedido aqui (Client-Token nunca chega ao browser),
// cada chamada passa por opt-out/consentimento + limites anti-bloqueio, e fica registada.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { zapiCall, safeJson } from "../_shared/zapi.ts";
import { phoneOptOutVariants } from "../_shared/phoneVariants.ts";
import { toZapiPhone, canStartZapiCall } from "../_shared/zapiCallRules.ts";

const Body = z.object({
  action: z.enum(["status", "token", "start", "end"]),
  workspaceId: z.string().uuid(),
  phone: z.string().trim().min(6).max(40).optional(),
  contactId: z.string().uuid().optional(),
  callLogId: z.string().uuid().optional(),
  durationSeconds: z.number().int().min(0).max(4 * 3600).optional(),
  outcome: z.enum(["answered", "no_answer", "failed", "cancelled"]).optional(),
  notes: z.string().trim().max(2000).optional(),
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
    const p = parsed.data;
    const userId = u.user.id;

    const { data: member } = await admin.from("workspace_members").select("role").eq("workspace_id", p.workspaceId).eq("user_id", userId).maybeSingle();
    const { data: isSuper } = await userClient.rpc("is_super_admin", { _user_id: userId });
    if (!member && !isSuper) return json({ error: "Sem acesso a esta organização." }, 403);

    const { data: conn } = await admin.from("whatsapp_zapi_connections")
      .select("instance_id, instance_token, client_token, status").eq("workspace_id", p.workspaceId).maybeSingle();
    const connected = !!conn && conn.status === "connected" && !!conn.instance_id && !!conn.instance_token;

    if (p.action === "status") return json({ connected });
    if (!connected) return json({ error: "O WhatsApp (Z-API) não está ligado.", code: "NOT_CONNECTED" }, 200);
    const creds = { instanceId: conn!.instance_id, instanceToken: conn!.instance_token, clientToken: conn!.client_token ?? "" };

    if (p.action === "token") {
      const r = await zapiCall(creds, "/call-token", { method: "GET" });
      const d = await safeJson(r);
      if (!r.ok || !d?.token) {
        console.warn("[zapi-call] call-token failed", r.status);
        return json({ error: r.status === 403 || r.status === 401
          ? "A Z-API recusou o pedido. Confirme que as chamadas estão ativas na sua conta Z-API."
          : "Não foi possível preparar a chamada na Z-API.", code: "TOKEN_FAILED" }, 200);
      }
      return json({ token: d.token, instanceId: creds.instanceId });
    }

    if (p.action === "start") {
      const phone = toZapiPhone(p.phone);
      let optedOut = false, checkFailed = false, callsLastHour = 0, since: number | null = null;
      if (phone) {
        const pv = phoneOptOutVariants(phone);
        const variants = pv.length ? pv : [phone];
        const hourAgo = new Date(Date.now() - 3600_000).toISOString();
        const [oo, cons, recent, same] = await Promise.all([
          admin.from("whatsapp_optouts").select("id").eq("workspace_id", p.workspaceId).in("phone", variants).limit(1),
          admin.from("whatsapp_consents").select("status, revoked_at").eq("workspace_id", p.workspaceId).in("phone", variants).limit(20),
          admin.from("activity_logs").select("id", { count: "exact", head: true }).eq("workspace_id", p.workspaceId).eq("table_name", "whatsapp_zapi_call").eq("action", "call_started").gte("created_at", hourAgo),
          admin.from("activity_logs").select("created_at").eq("workspace_id", p.workspaceId).eq("table_name", "whatsapp_zapi_call").eq("action", "call_started").eq("new_data->>phone", phone).order("created_at", { ascending: false }).limit(1),
        ]);
        checkFailed = !!(oo.error || cons.error || recent.error);
        optedOut = (oo.data ?? []).length > 0 || (cons.data ?? []).some((c: { status: string; revoked_at: string | null }) => c.revoked_at || ["revoked", "withdrawn", "denied"].includes(String(c.status).toLowerCase()));
        callsLastHour = recent.count ?? 0;
        const last = same.data?.[0]?.created_at;
        since = last ? (Date.now() - new Date(last).getTime()) / 1000 : null;
      }
      const gate = canStartZapiCall({ phone, connected, checkFailed, optedOut, callsLastHour, secondsSinceLastSameNumber: since });
      if (!gate.ok) return json({ error: gate.message, code: gate.code }, 200);
      if (p.contactId) {
        const { data: c } = await admin.from("contacts").select("id").eq("id", p.contactId).eq("workspace_id", p.workspaceId).maybeSingle();
        if (!c) return json({ error: "Contacto não pertence a esta organização." }, 403);
      }
      const { data: log, error } = await admin.from("activity_logs").insert({
        workspace_id: p.workspaceId, user_id: userId, table_name: "whatsapp_zapi_call", action: "call_started",
        record_id: p.contactId ?? null, module: "whatsapp", new_data: { phone, contact_id: p.contactId ?? null },
      }).select("id").single();
      if (error) { console.error("[zapi-call] log failed", error.message); return json({ error: "Não foi possível registar a chamada. Chamada bloqueada." }, 200); }
      return json({ ok: true, phone, callLogId: log.id });
    }

    // end
    if (!p.callLogId) return json({ error: "callLogId em falta" }, 400);
    const { data: started } = await admin.from("activity_logs").select("id, new_data, record_id")
      .eq("id", p.callLogId).eq("workspace_id", p.workspaceId).eq("user_id", userId).eq("action", "call_started").maybeSingle();
    if (!started) return json({ error: "Chamada não encontrada." }, 404);
    await admin.from("activity_logs").insert({
      workspace_id: p.workspaceId, user_id: userId, table_name: "whatsapp_zapi_call", action: "call_ended",
      record_id: started.record_id, module: "whatsapp",
      new_data: { ...(started.new_data as Record<string, unknown>), started_log_id: started.id, duration_seconds: p.durationSeconds ?? 0, outcome: p.outcome ?? null, notes: p.notes ?? null },
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[zapi-call] error", (e as Error).message);
    return json({ error: "internal_error" }, 200);
  }
});
