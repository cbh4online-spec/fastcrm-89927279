// Edge function: admin-workspace-action
// Centraliza ações administrativas seguras sobre workspaces, com auditoria
// server-side. Valida super admin via JWT (não confia apenas no frontend).
//
// Ações suportadas (Fase 2F.1):
// - suspend_workspace      → status = 'suspended'  (requer reason)
// - reactivate_workspace   → status = 'active'     (requer reason)
// - update_admin_notes     → workspaces.admin_notes (texto livre)
// - update_metadata        → name / company_name (campos não-críticos)
//
// NÃO suportado nesta fase: revogar sessões, ban/unban, reset password,
// billing/Stripe mutations, alterações de plano, eliminação.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = [
  "suspend_workspace",
  "reactivate_workspace",
  "update_admin_notes",
  "update_metadata",
] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

const REASON_REQUIRED: Action[] = ["suspend_workspace", "reactivate_workspace"];

type RequestBody = {
  workspace_id?: string;
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

    // Cliente "as user" — para validar a sessão do chamador
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid_session" });
    }
    const actor = userData.user;

    // Cliente service role — para verificar super admin e executar mutations
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Validar super admin via RPC (fonte de verdade no servidor)
    const { data: superRow, error: superErr } = await admin.rpc(
      "is_super_admin",
      { _user_id: actor.id },
    );
    if (superErr) {
      console.error("[admin-workspace-action] is_super_admin error:", superErr);
      return json(500, { error: "authorization_check_failed" });
    }
    if (!superRow) {
      return json(403, { error: "forbidden" });
    }

    // Parse body
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return json(400, { error: "invalid_json" });
    }

    const { workspace_id, action, reason, payload, metadata } = body;
    if (!isUuid(workspace_id)) {
      return json(400, { error: "invalid_workspace_id" });
    }
    if (
      typeof action !== "string" ||
      !ALLOWED_ACTIONS.includes(action as Action)
    ) {
      return json(400, { error: "invalid_action" });
    }
    const act = action as Action;

    const reasonStr =
      typeof reason === "string" ? reason.trim().slice(0, 500) : "";
    if (REASON_REQUIRED.includes(act) && reasonStr.length < 3) {
      return json(400, { error: "reason_required" });
    }

    // Buscar estado atual do workspace
    const { data: wsBefore, error: wsErr } = await admin
      .from("workspaces")
      .select("id, name, company_name, status")
      .eq("id", workspace_id)
      .maybeSingle();
    if (wsErr) {
      console.error("[admin-workspace-action] fetch workspace:", wsErr);
      return json(500, { error: "workspace_lookup_failed" });
    }
    if (!wsBefore) {
      return json(404, { error: "workspace_not_found" });
    }

    // Executar a mutation permitida
    let updatePatch: Record<string, unknown> = {};
    if (act === "suspend_workspace") {
      updatePatch = { status: "suspended" };
    } else if (act === "reactivate_workspace") {
      updatePatch = { status: "active" };
    } else if (act === "update_admin_notes") {
      const notes = payload?.admin_notes;
      if (typeof notes !== "string" || notes.length > 2000) {
        return json(400, { error: "invalid_admin_notes" });
      }
      updatePatch = { admin_notes: notes.trim() || null };
    } else if (act === "update_metadata") {
      const patch: Record<string, unknown> = {};
      if (payload && typeof payload.name === "string") {
        const v = (payload.name as string).trim();
        if (!v || v.length > 120) {
          return json(400, { error: "invalid_name" });
        }
        patch.name = v;
      }
      if (payload && "company_name" in payload) {
        const raw = payload.company_name;
        if (raw !== null && typeof raw !== "string") {
          return json(400, { error: "invalid_company_name" });
        }
        const v = typeof raw === "string" ? raw.trim() : "";
        if (v.length > 200) {
          return json(400, { error: "invalid_company_name" });
        }
        patch.company_name = v ? v : null;
      }
      if (Object.keys(patch).length === 0) {
        return json(400, { error: "no_changes" });
      }
      updatePatch = patch;
    }

    const { data: wsAfter, error: updErr } = await admin
      .from("workspaces")
      .update(updatePatch)
      .eq("id", workspace_id)
      .select("id, name, company_name, status")
      .single();
    if (updErr) {
      console.error("[admin-workspace-action] update error:", updErr);
      return json(500, { error: "update_failed", detail: updErr.message });
    }

    // Auditoria server-side (best-effort: nunca reverter mutation por falha de log)
    const ip = getClientIp(req);
    const ua = req.headers.get("user-agent");
    const auditRow = {
      admin_user_id: actor.id,
      action_type: act,
      target_type: "workspace",
      target_id: workspace_id,
      workspace_id,
      details: {
        actor_email: actor.email ?? null,
        reason: reasonStr || null,
        before: wsBefore,
        after: wsAfter,
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
        "[admin-workspace-action] audit insert failed:",
        auditErr.message,
      );
    }

    return json(200, {
      ok: true,
      action: act,
      workspace: wsAfter,
      audit_logged: !auditErr,
    });
  } catch (err) {
    console.error("[admin-workspace-action] unexpected:", err);
    return json(500, { error: "internal_error" });
  }
});
