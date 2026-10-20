import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Users, Crown, Briefcase, Headphones, Eye,
  Check, Minus, Plug, Plus, Search, Filter,
  LayoutDashboard, Contact2, Target, GitBranch, BarChart3, Bot,
  Settings, ShieldAlert, FileText, Mail, MessageSquare, Calendar,
  Zap, ArrowUpRight, MoreHorizontal,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import { PageHeader, StatTile, StatTileGrid, StatusPill, InitialsAvatar } from "@/components/backoffice-v2/_shared";
import { cn } from "@/lib/utils";
import { EASE_PREMIUM as EASE, staggerContainer, staggerItem } from "@/lib/motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/* ─────────────────────────────────────────────────────────
   Mockup visual — sem ligação a roles/permissions reais.
   Apenas para demonstrar a experiência "Executive Hybrid".
   ───────────────────────────────────────────────────────── */

type RoleKey = "admin" | "manager" | "sales" | "support" | "viewer";

const ROLES: { key: RoleKey; label: string; icon: any; tone: string }[] = [
  { key: "admin",   label: "Admin",     icon: Crown,      tone: "from-brand to-cyan" },
  { key: "manager", label: "Gestor",    icon: Briefcase,  tone: "from-navy to-navy-700" },
  { key: "sales",   label: "Comercial", icon: Target,     tone: "from-brand-vivid to-brand" },
  { key: "support", label: "Suporte",   icon: Headphones, tone: "from-cyan to-brand-glow" },
  { key: "viewer",  label: "Visor",     icon: Eye,        tone: "from-navy-500 to-navy-700" },
];

const RESOURCES: { key: string; label: string; icon: any }[] = [
  { key: "dashboard",    label: "Dashboard",         icon: LayoutDashboard },
  { key: "contacts",     label: "Contactos",         icon: Contact2 },
  { key: "opportunities",label: "Oportunidades",     icon: Target },
  { key: "funnels",      label: "Funis",             icon: GitBranch },
  { key: "reports",      label: "Relatórios",        icon: BarChart3 },
  { key: "automations",  label: "Automação",         icon: Bot },
  { key: "settings",     label: "Configurações",     icon: Settings },
  { key: "users",        label: "Utilizadores",      icon: Users },
  { key: "audit",        label: "Auditoria",         icon: ShieldAlert },
];

// Mockup: matriz de permissões por role
const MATRIX: Record<string, Record<RoleKey, boolean>> = {
  dashboard:     { admin: true, manager: true, sales: true,  support: true,  viewer: true  },
  contacts:      { admin: true, manager: true, sales: true,  support: true,  viewer: false },
  opportunities: { admin: true, manager: true, sales: true,  support: false, viewer: false },
  funnels:       { admin: true, manager: true, sales: true,  support: false, viewer: false },
  reports:       { admin: true, manager: true, sales: false, support: false, viewer: true  },
  automations:   { admin: true, manager: true, sales: false, support: false, viewer: false },
  settings:      { admin: true, manager: false,sales: false, support: false, viewer: false },
  users:         { admin: true, manager: false,sales: false, support: false, viewer: false },
  audit:         { admin: true, manager: true, sales: false, support: false, viewer: false },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", agent: "Agente", viewer: "Visor", agency: "Agência",
};

type RealUser = { name: string; email: string; role: string; status: string };

function useWorkspaceUsers() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["backoffice-permissions-users", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<RealUser[]> => {
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", ids);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return (members ?? []).map((m) => {
        const p: any = map.get(m.user_id);
        return {
          name: p?.full_name || p?.email || "Sem nome",
          email: p?.email || "",
          role: ROLE_LABELS[m.role] ?? m.role,
          status: "active",
        };
      });
    },
  });
}

const TABS = ["Utilizadores", "Funções", "Permissões", "Grupos"] as const;

export default function BackofficePermissionsV2() {
  const [tab, setTab] = useState<typeof TABS[number]>("Permissões");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const usersQuery = useWorkspaceUsers();
  const usersCount = usersQuery.data?.length ?? 0;

  // Skeleton inicial
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 520);
    return () => clearTimeout(t);
  }, []);

  // Skeleton curto ao trocar de tab (microinteração)
  const handleTabChange = (next: typeof TABS[number]) => {
    if (next === tab) return;
    setTabLoading(true);
    setTab(next);
    const t = setTimeout(() => setTabLoading(false), 220);
    return () => clearTimeout(t);
  };

  return (
    <BackofficeShellV2>
      <div className="space-y-7 px-4 py-7 md:px-8">
        <PageHeader
          badge={
            <>
              <ShieldCheck className="h-3 w-3 text-brand" /> Governação
            </>
          }
          title="Utilizadores & Permissões"
          subtitle="Defina quem pode fazer o quê. Controlo granular por função, recurso e workspace."
          right={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-vivid px-4 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_hsl(216_100%_52%/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_hsl(216_100%_52%/0.65)]"
            >
              <Plus className="h-4 w-4" /> Convidar utilizador
            </button>
          }
        />

        {/* KPIs */}
        <StatTileGrid className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile index={0} label="Utilizadores"  value={usersCount} icon={Users}       accent="bg-gradient-to-br from-brand to-brand-vivid" />
        </StatTileGrid>

        {/* Tabs + content */}
        <motion.div
          variants={staggerContainer(0.05, 0.05)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6 xl:grid-cols-3"
        >
          <motion.div variants={staggerItem} className="xl:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-[0_10px_30px_-20px_hsl(213_65%_12%/0.18)]">
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-navy-100 bg-white px-4 pt-3">
                {TABS.map((t) => {
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTabChange(t)}
                      className={cn(
                        "relative h-10 px-4 text-sm font-medium transition-all duration-200",
                        "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
                        active ? "text-brand" : "text-navy-500 hover:text-navy"
                      )}
                    >
                      {t}
                      {active && (
                        <motion.span
                          layoutId="permissions-tab"
                          className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-brand to-cyan"
                          transition={{ duration: 0.32, ease: EASE }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 border-b border-navy-100 px-4 py-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-300" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === "Utilizadores" ? "Procurar utilizador…" : "Procurar recurso…"}
                    className="h-9 w-full rounded-lg border border-navy-100 bg-brand-ice/50 pl-9 pr-3 text-sm text-navy placeholder:text-navy-300 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
                  />
                </div>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 text-xs font-semibold text-navy-500 transition-all duration-200 hover:-translate-y-[1px] hover:border-brand/40 hover:text-brand hover:shadow-[0_8px_18px_-12px_hsl(216_100%_52%/0.4)] active:translate-y-0 active:scale-[0.98]">
                  <Filter className="h-3.5 w-3.5" /> Filtros
                </button>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait" initial={false}>
                {loading || tabLoading ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
                    <TabSkeleton variant={tab === "Utilizadores" ? "users" : "matrix"} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.26, ease: EASE }}
                  >
                    {tab === "Permissões" || tab === "Funções" ? (
                      <PermissionsMatrix />
                    ) : tab === "Utilizadores" ? (
                      <UsersList query={search} users={usersQuery.data ?? []} loading={usersQuery.isLoading} />
                    ) : (
                      <GroupsEmpty />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right column */}
          <div className="space-y-6">
          </div>
        </motion.div>
      </div>
    </BackofficeShellV2>
  );
}

/* ───────────── Skeletons ───────────── */

function Shimmer({ className }: { className?: string }) {
  return <span className={cn("block rounded-md bg-navy-100/70 v2-shimmer", className)} />;
}

function TabSkeleton({ variant }: { variant: "matrix" | "users" }) {
  const rows = 6;
  return (
    <div className="space-y-2 px-5 py-5" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 pb-2">
        <Shimmer className="h-3 w-24" />
        <div className="ml-auto flex gap-2">
          {Array.from({ length: variant === "matrix" ? 5 : 3 }).map((_, i) => (
            <Shimmer key={i} className="h-6 w-12" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Shimmer className="h-8 w-8 rounded-lg" />
          <Shimmer className="h-3 w-1/3" />
          <div className="ml-auto flex gap-2">
            {Array.from({ length: variant === "matrix" ? 5 : 3 }).map((_, j) => (
              <Shimmer key={j} className="h-6 w-10 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidePanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-navy-100 bg-white p-5 shadow-[0_10px_30px_-20px_hsl(213_65%_12%/0.18)]" aria-busy="true">
      <div className="flex items-center gap-3">
        <Shimmer className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-2.5 w-1/3" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ───────────── Permissions matrix ───────────── */

function PermissionsMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-brand-ice/40 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-300">
            <th className="px-5 py-3">Recurso</th>
            {ROLES.map((r) => (
              <th key={r.key} className="px-3 py-3 text-center">
                <div className="inline-flex flex-col items-center gap-1.5">
                  <span className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-white shadow-[0_6px_14px_-6px_hsl(213_65%_12%/0.35)]",
                    r.tone
                  )}>
                    <r.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-navy">{r.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCES.map((res, i) => (
            <motion.tr
              key={res.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + i * 0.025, duration: 0.26, ease: EASE }}
              className="group border-b border-navy-100/60 transition-colors hover:bg-brand-ice/40"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand transition-transform group-hover:scale-105">
                    <res.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium text-navy">{res.label}</span>
                </div>
              </td>
              {ROLES.map((role) => {
                const allowed = MATRIX[res.key][role.key];
                return (
                  <td key={role.key} className="px-3 py-3.5 text-center">
                    {allowed ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand/12 text-brand transition-all duration-200 group-hover:scale-110">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-navy-100/60 text-navy-300">
                        <Minus className="h-3 w-3" />
                      </span>
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Users list ───────────── */

function UsersList({ query, users, loading }: { query: string; users: RealUser[]; loading: boolean }) {
  if (loading) return <TabSkeleton variant="users" />;
  if (users.length === 0) return <div className="px-6 py-12 text-center text-sm text-navy-500">Ainda não há utilizadores neste espaço de trabalho.</div>;
  const filtered = users.filter(
    (u) =>
      !query ||
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-brand-ice/40 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-300">
            <th className="px-5 py-3">Utilizador</th>
            <th className="px-3 py-3">Função</th>
            <th className="px-3 py-3">Estado</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u, i) => (
            <motion.tr
              key={u.email || u.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + i * 0.025, duration: 0.26, ease: EASE }}
              className="group border-b border-navy-100/60 transition-colors hover:bg-brand-ice/40"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={u.name} />
                  <div>
                    <div className="font-medium text-navy">{u.name}</div>
                    <div className="text-xs text-navy-300">{u.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/8 px-2 py-1 text-xs font-semibold text-brand">
                  {u.role}
                </span>
              </td>
              <td className="px-3 py-3.5"><StatusPill status={u.status} /></td>
              <td className="px-3 py-3.5 text-right">
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-brand-ice hover:text-navy">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupsEmpty() {
  return (
    <div className="grid place-items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-ice to-white ring-1 ring-navy-100">
        <Users className="h-6 w-6 text-navy-300" />
      </div>
      <div className="font-display text-base font-semibold text-navy">Sem grupos definidos</div>
      <div className="max-w-xs text-xs text-navy-500">
        Agrupe utilizadores por equipa, departamento ou região para aplicar permissões em bloco.
      </div>
      <button className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-100 bg-white px-3 text-xs font-semibold text-navy transition-colors hover:border-brand/40 hover:text-brand">
        <Plus className="h-3.5 w-3.5" /> Criar grupo
      </button>
    </div>
  );
}
