/**
 * SSoT espelhado de `src/lib/permissions/capabilities.ts`.
 * Qualquer alteração aqui tem de ser replicada lá (e vice-versa).
 *
 * Usado em edge functions do Control Plane para validar autorização
 * antes de executar acções sensíveis.
 */

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "agent"
  | "viewer"
  | "agency"
  | "hr";

export const CAPABILITIES = [
  "workspace.manage",
  "workspace.billing",
  "members.manage",
  "integrations.manage",
  "ai.configure",
  "finance.view",
  "finance.manage",
  "crm.read",
  "crm.write",
  "crm.delete",
  "crm.bulk_export",
  "inbox.read",
  "inbox.reply",
  "catalog.read",
  "catalog.write",
  "reports.operational",
  "reports.executive",
  "hr.access",
  "security.access",
  "audit.view",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL: Capability[] = [...CAPABILITIES];

export const ROLE_CAPABILITIES: Record<WorkspaceRole, Capability[]> = {
  owner: ALL,
  admin: ALL.filter((c) => c !== "workspace.billing"),
  agency: ALL.filter((c) => c !== "workspace.billing"),
  hr: [
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.reply",
    "catalog.read",
    "reports.operational",
    "hr.access",
  ],
  agent: [
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.reply",
    "catalog.read",
    "reports.operational",
  ],
  viewer: [
    "crm.read",
    "inbox.read",
    "catalog.read",
    "reports.operational",
    "finance.view",
  ],
};

export function roleHasCapability(
  role: WorkspaceRole | null | undefined,
  cap: Capability,
): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(cap) ?? false;
}

export interface CapabilityCheckResult {
  ok: boolean;
  userId?: string;
  role?: WorkspaceRole;
  isSuperAdmin?: boolean;
  status?: number;
  error?: string;
}

/**
 * Valida JWT, pertença ao workspace e capability.
 * Devolve `{ ok: false, status, error }` em caso de falha — o caller deve
 * traduzir para Response 200 OK com payload de erro (padrão Lovable) ou 4xx.
 *
 * @param supabase  Cliente Supabase com service_role (preferencial).
 * @param req       Request original (para extrair o Authorization header).
 * @param workspaceId  Workspace alvo da operação.
 * @param cap       Capability requerida.
 */
export async function requireCapability(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  req: Request,
  workspaceId: string | null | undefined,
  cap: Capability,
): Promise<CapabilityCheckResult> {
  if (!workspaceId) {
    return { ok: false, status: 400, error: "workspace_id_required" };
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, status: 401, error: "missing_jwt" };
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return { ok: false, status: 401, error: "invalid_jwt" };
  }
  const userId = userRes.user.id as string;

  // Super admin bypass — lê de user_roles via profiles.user_id
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);
      const isSuperAdmin = (roles ?? []).some(
        (r: { role: string }) => r.role === "super_admin",
      );
      if (isSuperAdmin) {
        return { ok: true, userId, role: "owner", isSuperAdmin: true };
      }
    }
  } catch {
    /* não bloquear — cai no check de membership */
  }

  const { data: member, error: memberErr } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (memberErr || !member) {
    return { ok: false, status: 403, error: "not_a_workspace_member" };
  }

  const role = member.role as WorkspaceRole;
  if (!roleHasCapability(role, cap)) {
    return {
      ok: false,
      status: 403,
      error: "missing_capability",
      role,
      userId,
    };
  }

  return { ok: true, userId, role, isSuperAdmin: false };
}
