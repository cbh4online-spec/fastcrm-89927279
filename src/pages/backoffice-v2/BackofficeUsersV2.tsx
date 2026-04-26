import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Filter, RefreshCw, Download, ShieldCheck, Mail,
  CalendarDays, Building2, X, Crown, UserCheck, UserX, ExternalLink, Hash,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PageHeader, StatTile, StatusPill, ErrorBanners, TableSkeleton, EmptyState,
  InitialsAvatar, fmtDate,
} from "@/components/backoffice-v2/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUsersAdmin, type UserAdminRow } from "@/hooks/useUsersAdmin";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function BackofficeUsersV2() {
  const { data, isLoading, isError, error, refetch, isFetching } = useUsersAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "super" | "with_ws" | "no_ws" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserAdminRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((u) => {
      if (filter === "super" && !u.isSuperAdmin) return false;
      if (filter === "with_ws" && u.workspaceCount === 0) return false;
      if (filter === "no_ws" && u.workspaceCount > 0) return false;
      if (filter === "suspended" && u.status !== "suspended") return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [data?.rows, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <BackofficeShellV2>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 md:px-8">
        <ErrorBanners isError={isError} error={error} partialErrors={data?.partialErrors} />

        <PageHeader
          badge={<><Users className="h-3 w-3 text-[hsl(220,90%,56%)]" /> Backoffice · Utilizadores</>}
          title="Utilizadores"
          subtitle="Contas globais do FastCRM e respetivas adesões a workspaces"
          right={
            <>
              <Button variant="outline" className="h-9 gap-2 border-slate-200" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Atualizar
              </Button>
              <Button variant="outline" className="h-9 gap-2 border-slate-200">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total" value={data?.total ?? 0} icon={Users} accent="bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)]" />
          <StatTile label="Super Admins" value={data?.superAdmins ?? 0} icon={Crown} accent="bg-gradient-to-br from-amber-500 to-orange-500" />
          <StatTile label="Com workspace" value={data?.withWorkspace ?? 0} icon={UserCheck} accent="bg-gradient-to-br from-emerald-500 to-emerald-400" />
          <StatTile label="Suspensos" value={data?.suspended ?? 0} icon={UserX} accent="bg-gradient-to-br from-rose-500 to-pink-500" />
        </div>

        {/* Filters + table */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Procurar por nome ou email…"
                className="h-9 border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={filter} onValueChange={(v) => { setFilter(v as any); setPage(1); }}>
                <SelectTrigger className="h-9 w-[180px] border-slate-200">
                  <SelectValue placeholder="Filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os utilizadores</SelectItem>
                  <SelectItem value="super">Super Admins</SelectItem>
                  <SelectItem value="with_ws">Com workspace</SelectItem>
                  <SelectItem value="no_ws">Sem workspace</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Utilizador</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Workspaces</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Criado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={5} />
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState icon={Users} title="Sem resultados" hint="Ajusta a pesquisa ou os filtros." />
                    </td>
                  </tr>
                ) : (
                  visible.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelected(u)}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={u.full_name} email={u.email} src={u.avatar_url} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-slate-900">{u.full_name ?? "—"}</span>
                              {u.isSuperAdmin && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                            </div>
                            <div className="truncate text-xs text-slate-500">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={u.status ?? "active"} /></td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" /> {u.workspaceCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isSuperAdmin ? (
                          <Badge className="border-0 bg-amber-50 text-[11px] text-amber-700">Super Admin</Badge>
                        ) : u.workspaces.length > 0 ? (
                          <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-600">
                            {Array.from(new Set(u.workspaces.map((w) => w.role))).slice(0, 2).join(", ")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(u.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filtered.length > 0 && (
            <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 md:flex-row md:items-center">
              <span>
                A mostrar <strong className="text-slate-700">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="h-8">Anterior</Button>
                <span className="px-2">Página {safePage} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} className="h-8">Seguinte</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/30"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
                <div className="min-w-0 flex items-center gap-3">
                  <InitialsAvatar name={selected.full_name} email={selected.email} src={selected.avatar_url} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-base font-semibold text-slate-900">{selected.full_name ?? "—"}</span>
                      {selected.isSuperAdmin && <Crown className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="truncate text-xs text-slate-500">{selected.email ?? "—"}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex items-center gap-2">
                  <StatusPill status={selected.status ?? "active"} />
                  <span className="text-xs text-slate-500">desde {fmtDate(selected.created_at)}</span>
                </div>

                <Detail icon={Mail} label="Email" value={selected.email ?? "—"} />
                <Detail icon={ShieldCheck} label="Super Admin" value={selected.isSuperAdmin ? "Sim" : "Não"} />
                <Detail icon={Building2} label="Adesões" value={`${selected.workspaceCount} workspace(s)`} />
                <Detail icon={Hash} label="Profile ID" value={<span className="font-mono text-[11px]">{selected.id}</span>} />
                <Detail icon={Hash} label="Auth ID" value={<span className="font-mono text-[11px]">{selected.user_id}</span>} />
                <Detail icon={CalendarDays} label="Criado" value={fmtDate(selected.created_at)} />

                {selected.workspaces.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Workspaces & roles
                    </div>
                    <ul className="space-y-1.5">
                      {selected.workspaces.map((w, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                          <span className="truncate font-mono text-[11px] text-slate-600">{w.workspace_id.slice(0, 8)}…</span>
                          <Badge variant="outline" className="border-slate-200 text-[10px] text-slate-600">{w.role}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <Button variant="outline" className="w-full gap-2 border-slate-200" asChild>
                    <a href={`/super-admin?user=${selected.user_id}`} target="_blank" rel="noreferrer">
                      Abrir em Backoffice clássico <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </BackofficeShellV2>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
        <div className="break-words text-sm text-slate-800">{value}</div>
      </div>
    </div>
  );
}
