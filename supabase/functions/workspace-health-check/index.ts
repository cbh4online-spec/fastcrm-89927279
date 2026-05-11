// Workspace Health Check / Diagnostic Endpoint
// Tests: credentials (JWT), workspace existence, membership, role routing
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CheckResult {
  name: string;
  ok: boolean;
  ms: number;
  detail?: unknown;
  error?: string;
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<CheckResult> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t0, detail };
  } catch (e: any) {
    return { name, ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const checks: CheckResult[] = [];
  const meta: Record<string, unknown> = {
    started_at: startedAt,
    project_url: SUPABASE_URL,
    has_service_key: !!SERVICE_KEY,
    has_anon_key: !!ANON_KEY,
  };

  // Parse payload
  let workspaceId: string | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      workspaceId = body?.workspace_id ?? null;
    }
    const url = new URL(req.url);
    workspaceId = workspaceId ?? url.searchParams.get("workspace_id");
    workspaceId = workspaceId ?? req.headers.get("x-workspace-id");
  } catch {
    /* noop */
  }

  // 1) Auth header / JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const hasBearer = authHeader.toLowerCase().startsWith("bearer ");
  checks.push({
    name: "auth_header_present",
    ok: hasBearer,
    ms: 0,
    detail: { has_bearer: hasBearer },
    error: hasBearer ? undefined : "Missing Authorization: Bearer <token>",
  });

  let userId: string | null = null;
  let userEmail: string | null = null;
  let userRole: string | null = null;

  if (hasBearer) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const claimsCheck = await timed("jwt_get_claims", async () => {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims) throw new Error(error?.message ?? "Invalid JWT");
      userId = data.claims.sub as string;
      userEmail = (data.claims.email as string) ?? null;
      userRole = (data.claims.role as string) ?? null;
      return { sub: userId, email: userEmail, role: userRole, exp: data.claims.exp };
    });
    checks.push(claimsCheck);
  }

  // Service-role client for routing/membership
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 2) DB connectivity (service role)
  checks.push(
    await timed("db_connectivity", async () => {
      const { error } = await admin.from("workspaces").select("id", { count: "exact", head: true }).limit(1);
      if (error) throw error;
      return { ok: true };
    }),
  );

  // 3) Profile lookup
  if (userId) {
    checks.push(
      await timed("profile_lookup", async () => {
        const { data, error } = await admin
          .from("profiles")
          .select("id, user_id, email, full_name")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("No profile row for this auth user");
        return data;
      }),
    );

    // 4) Super admin check
    checks.push(
      await timed("super_admin_check", async () => {
        const { data, error } = await admin.rpc("is_super_admin", { _user_id: userId });
        if (error) throw error;
        return { is_super_admin: !!data };
      }),
    );
  }

  // 5) Workspace-specific checks
  if (workspaceId) {
    if (!UUID_RE.test(workspaceId)) {
      checks.push({
        name: "workspace_id_format",
        ok: false,
        ms: 0,
        error: `Invalid UUID: ${workspaceId}`,
      });
    } else {
      checks.push(
        await timed("workspace_exists", async () => {
          const { data, error } = await admin
            .from("workspaces")
            .select("id, name, slug, owner_id, status, deleted_at, created_at")
            .eq("id", workspaceId)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error("Workspace not found");
          if (data.deleted_at) throw new Error("Workspace is soft-deleted");
          return data;
        }),
      );

      if (userId) {
        checks.push(
          await timed("workspace_membership", async () => {
            const { data: ws } = await admin
              .from("workspaces")
              .select("owner_id")
              .eq("id", workspaceId)
              .maybeSingle();

            const isOwner = ws?.owner_id === userId;

            const { data: member, error } = await admin
              .from("workspace_members")
              .select("role, created_at")
              .eq("workspace_id", workspaceId)
              .eq("user_id", userId)
              .maybeSingle();
            if (error) throw error;

            const { data: superAdmin } = await admin.rpc("is_super_admin", { _user_id: userId });

            const path = isOwner
              ? "owner"
              : member
                ? `member:${member.role}`
                : superAdmin
                  ? "super_admin"
                  : null;

            if (!path) throw new Error("User has no access to this workspace");
            return { authorization_path: path, member_role: member?.role ?? null, is_owner: isOwner };
          }),
        );

        // 6) RLS sanity check via user-scoped client
        checks.push(
          await timed("rls_workspace_select_as_user", async () => {
            const userClient = createClient(SUPABASE_URL, ANON_KEY, {
              global: { headers: { Authorization: authHeader } },
              auth: { persistSession: false },
            });
            const { data, error } = await userClient
              .from("workspaces")
              .select("id, name")
              .eq("id", workspaceId)
              .maybeSingle();
            if (error) throw error;
            if (!data) throw new Error("RLS blocked workspace SELECT for this user");
            return { id: data.id, name: data.name };
          }),
        );
      }
    }
  } else {
    checks.push({
      name: "workspace_id_provided",
      ok: false,
      ms: 0,
      error: "No workspace_id provided (body, ?workspace_id=, or x-workspace-id header)",
    });
  }

  const allOk = checks.every((c) => c.ok);
  const totalMs = checks.reduce((s, c) => s + c.ms, 0);

  return new Response(
    JSON.stringify(
      {
        ok: allOk,
        status: allOk ? "healthy" : "degraded",
        workspace_id: workspaceId,
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        meta,
        total_ms: totalMs,
        checks,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
