// Edge: apply-field-permission-defaults
// Aplica defaults de visibilidade de campos para 1 página + N perfis,
// no workspace atual ou em TODOS os workspaces (apenas super_admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  scope: "current" | "all";
  workspaceId?: string;
  pageKey: string;
  fieldKeys?: string[]; // se vazio, aplica a todos os field_keys já existentes nessa página
  perProfile: Record<string, boolean>; // ex: { vendedor: true, gestor: false }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    // Cliente com JWT do chamador para identidade
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(200, { fallback: true, error: "unauthenticated" });
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    if (!body?.pageKey || !body?.perProfile || Object.keys(body.perProfile).length === 0) {
      return json(200, { fallback: true, error: "missing_params" });
    }

    // Cliente service_role para escritas em massa
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Determinar workspaces alvo
    let targetWorkspaces: string[] = [];
    if (body.scope === "all") {
      const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userId });
      if (!isSuper) return json(200, { fallback: true, error: "forbidden_super_admin" });
      const { data: ws } = await admin.from("workspaces").select("id");
      targetWorkspaces = (ws ?? []).map((w: any) => w.id);
    } else {
      if (!body.workspaceId) return json(200, { fallback: true, error: "missing_workspace" });
      // Confirmar role owner/admin
      const { data: member } = await admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", body.workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return json(200, { fallback: true, error: "forbidden_role" });
      }
      targetWorkspaces = [body.workspaceId];
    }

    // Determinar field_keys
    let fieldKeys = (body.fieldKeys ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (fieldKeys.length === 0) {
      const { data: existing } = await admin
        .from("profile_field_permissions")
        .select("field_key")
        .eq("page_key", body.pageKey.trim().toLowerCase())
        .in("workspace_id", targetWorkspaces);
      fieldKeys = Array.from(new Set((existing ?? []).map((r: any) => r.field_key)));
    }
    if (fieldKeys.length === 0) return json(200, { applied: 0, note: "no_fields_found" });

    const profiles = Object.entries(body.perProfile).map(([fn, visible]) => ({
      sales_function: fn.trim().toLowerCase(),
      visible: !!visible,
    }));

    const rows: any[] = [];
    for (const wid of targetWorkspaces) {
      for (const fk of fieldKeys) {
        for (const p of profiles) {
          rows.push({
            workspace_id: wid,
            sales_function: p.sales_function,
            page_key: body.pageKey.trim().toLowerCase(),
            field_key: fk,
            visible: p.visible,
          });
        }
      }
    }

    // Upsert em lotes de 500
    const BATCH = 500;
    let applied = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await admin
        .from("profile_field_permissions")
        .upsert(slice, { onConflict: "workspace_id,sales_function,page_key,field_key" });
      if (error) {
        console.error("[apply-field-permission-defaults] upsert error", error);
        return json(200, { fallback: true, error: error.message, applied });
      }
      applied += slice.length;
    }

    return json(200, {
      ok: true,
      applied,
      workspaces: targetWorkspaces.length,
      fields: fieldKeys.length,
      profiles: profiles.length,
    });
  } catch (e: any) {
    console.error("[apply-field-permission-defaults] internal", e);
    return json(200, { fallback: true, internal_error: e?.message ?? "unknown" });
  }
});
