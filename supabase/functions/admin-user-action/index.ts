// Edge function: admin-user-action
// Centraliza ações administrativas seguras sobre utilizadores, com auditoria
// server-side. Valida super admin via JWT (não confia apenas no frontend).
//
// Ações suportadas (Fase 2F.2):
// - deactivate_user  → profiles.status = 'inactive'   (requer reason)
// - reactivate_user  → profiles.status = 'active'     (requer reason)
//
// NÃO suportado nesta fase: reset password, auth.admin.signOut, revogação de
// sessões, eliminar utilizador, alteração de roles, billing/Stripe mutations,
// ban a nível de auth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = ["deactivate_user", "reactivate_user"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

const REASON_REQUIRED: Action[] = ["deactivate_user", "reactivate_user"];

type RequestBody = {
  target_user_id?: string; // profiles.user_id (auth.users.id)
  action?: string;
  reason?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

function getClientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "missing_authorization" });
    }

    // Validação da sessão do chamador
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid_session" });
    }
    const actor = userData.user;

    // Cliente service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Confirmar que o actor é super admin (server-side)
    const { data: actorIsSuper, error: superErr } = await admin.rpc(
      "is_super_admin",
      { _user_id: actor.id },
    );
    if (superErr) {
      console.error("[admin-user-action] is_super_admin error:", superErr);
      return json(500, { error: "authorization_check_failed" });
    }
    if (!actorIsSuper) {
      return json(403, { error: "forbidden" });
    }

    // Parse body
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return json(400, { error: "invalid_json" });
    }

    const { target_user_id, action, reason, metadata } = body;
    if (!isUuid(target_user_id)) {
      return json(400, { error: "invalid_target_user_id" });
    }
    if (
      typeof action !== "string" ||
      !ALLOWED_ACTIONS.includes(action as Action)
    ) {
      return json(400, { error: "invalid_action" });
    }
    const act = action as Action;

    // Bloquear auto-ação
    if (target_user_id === actor.id) {
      return json(400, { error: "cannot_target_self" });
    }

    const reasonStr =
      typeof reason === "string" ? reason.trim().slice(0, 500) : "";
    if (REASON_REQUIRED.includes(act) && reasonStr.length < 3) {
      return json(400, { error: "reason_required" });
    }

    // Buscar perfil alvo (status atual)
    const { data: profileBefore, error: profileErr } = await admin
      .from("profiles")
      .select("id, user_id, email, full_name, status")
      .eq("user_id", target_user_id)
      .maybeSingle();
    if (profileErr) {
      console.error("[admin-user-action] fetch profile:", profileErr);
      return json(500, { error: "profile_lookup_failed" });
    }
    if (!profileBefore) {
      return json(404, { error: "user_not_found" });
    }

    // Impedir ações sobre outros super admins (proteção mútua)
    const { data: targetIsSuper, error: targetSuperErr } = await admin.rpc(
      "is_super_admin",
      { _user_id: target_user_id },
    );
    if (targetSuperErr) {
      console.error(
        "[admin-user-action] target is_super_admin error:",
        targetSuperErr,
      );
      return json(500, { error: "authorization_check_failed" });
    }
    if (targetIsSuper) {
      return json(403, { error: "cannot_target_super_admin" });
    }

    // Aplicar mutation permitida
    const newStatus =
      act === "deactivate_user" ? "inactive" : "active";

    // Idempotência: se já está no estado pedido, evitar ruído
    if (profileBefore.status === newStatus) {
      return json(409, { error: "no_state_change", current: newStatus });
    }

    const { data: profileAfter, error: updErr } = await admin
      .from("profiles")
      .update({ status: newStatus })
      .eq("user_id", target_user_id)
      .select("id, user_id, email, full_name, status")
      .single();
    if (updErr) {
      console.error("[admin-user-action] update error:", updErr);
      return json(500, { error: "update_failed", detail: updErr.message });
    }

    // Auditoria server-side (best-effort)
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent");
    const auditRow = {
      admin_user_id: actor.id,
      action_type: act,
      target_type: "user",
      target_id: target_user_id,
      workspace_id: null,
      details: {
        actor_email: actor.email ?? null,
        target_email: profileBefore.email ?? null,
        target_name: profileBefore.full_name ?? null,
        reason: reasonStr || null,
        before: { status: profileBefore.status },
        after: { status: profileAfter.status },
        metadata: metadata ?? null,
      },
      ip_address: ip,
      user_agent: ua,
    } as const;
    const { error: auditErr } = await admin
      .from("admin_audit_logs")
      .insert([auditRow]);
    if (auditErr) {
      console.warn(
        "[admin-user-action] audit insert failed:",
        auditErr.message,
      );
    }

    return json(200, {
      ok: true,
      action: act,
      user: profileAfter,
      audit_logged: !auditErr,
    });
  } catch (err) {
    console.error("[admin-user-action] unexpected:", err);
    return json(500, { error: "internal_error" });
  }
});
