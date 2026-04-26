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
      <div className="mx-auto max-w-[1400px] space-y-7 px-4 py-8 md:px-8 md:py-10">
        <ErrorBanners isError={isError} error={error} partialErrors={data?.partialErrors} />

        <PageHeader
          badge={<><Users className="h-3 w-3 text-brand" /> Backoffice · Utilizadores</>}
          title="Utilizadores"
          subtitle="Contas globais do FastCRM e respetivas adesões a workspaces"
          right={
            <>
              <Button variant="outline" className="h-10 gap-2 rounded-xl border-navy-100 bg-white text-navy-500 hover:border-brand/40 hover:text-navy" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Atualizar
              </Button>
              <Button variant="outline" className="h-10 gap-2 rounded-xl border-navy-100 bg-white text-navy-500 hover:border-brand/40 hover:text-navy">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatTile label="Total" value={data?.total ?? 0} icon={Users} accent="bg-gradient-to-br from-brand to-cyan" />
          <StatTile label="Super Admins" value={data?.superAdmins ?? 0} icon={Crown} accent="bg-gradient-to-br from-amber-500 to-orange-500" />
          <StatTile label="Com workspace" value={data?.withWorkspace ?? 0} icon={UserCheck} accent="bg-gradient-to-br from-success to-emerald-400" />
          <StatTile label="Suspensos" value={data?.suspended ?? 0} icon={UserX} accent="bg-gradient-to-br from-destructive to-pink-500" />
        </div>

        {/* Filters + table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
        >
          <div className="flex flex-col gap-3 border-b border-navy-100 p-4 md:flex-row md:items-center md:p-5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Procurar por nome ou email…"
                className="h-10 rounded-xl border-navy-100 bg-brand-ice/60 pl-10 text-sm text-navy placeholder:text-navy-300 transition-all focus-visible:border-brand focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-brand/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-navy-300" />
              <Select value={filter} onValueChange={(v) => { setFilter(v as any); setPage(1); }}>
                <SelectTrigger className="h-10 w-[190px] rounded-xl border-navy-100 bg-white text-sm">
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
              <thead className="bg-brand-ice/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                <tr>
                  <th className="px-5 py-3.5">Utilizador</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Workspaces</th>
                  <th className="px-4 py-3.5">Roles</th>
                  <th className="px-4 py-3.5">Criado</th>
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
                  visible.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.2) }}
                      onClick={() => setSelected(u)}
                      className="cursor-pointer border-b border-navy-100/60 transition-colors hover:bg-brand-ice/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={u.full_name} email={u.email} src={u.avatar_url} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-navy">{u.full_name ?? "—"}</span>
                              {u.isSuperAdmin && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                            </div>
                            <div className="truncate text-xs text-navy-300">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusPill status={u.status ?? "active"} /></td>
                      <td className="px-4 py-3.5 text-navy-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-navy-300" /> {u.workspaceCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.isSuperAdmin ? (
                          <Badge className="border-0 bg-amber-50 text-[11px] font-semibold text-amber-700">Super Admin</Badge>
                        ) : u.workspaces.length > 0 ? (
                          <Badge variant="outline" className="border-navy-100 text-[11px] font-medium text-navy-500">
                            {Array.from(new Set(u.workspaces.map((w) => w.role))).slice(0, 2).join(", ")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-navy-300">{fmtDate(u.created_at)}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filtered.length > 0 && (
            <div className="flex flex-col items-start justify-between gap-2 border-t border-navy-100 px-5 py-3.5 text-xs text-navy-500 md:flex-row md:items-center">
              <span>
                A mostrar <strong className="font-semibold text-navy">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}</strong> de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="h-8 rounded-lg border-navy-100 hover:border-brand/40">Anterior</Button>
                <span className="px-2 font-medium text-navy">Página {safePage} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} className="h-8 rounded-lg border-navy-100 hover:border-brand/40">Seguinte</Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-[-20px_0_50px_-20px_rgba(11,29,61,0.25)]"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-navy-100 bg-white/90 px-6 py-4 backdrop-blur-xl">
                <div className="min-w-0 flex items-center gap-3">
                  <InitialsAvatar name={selected.full_name} email={selected.email} src={selected.avatar_url} size={42} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-base font-semibold text-navy">{selected.full_name ?? "—"}</span>
                      {selected.isSuperAdmin && <Crown className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="truncate text-xs text-navy-300">{selected.email ?? "—"}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-brand-ice hover:text-navy" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <StatusPill status={selected.status ?? "active"} />
                  <span className="text-xs text-navy-300">desde {fmtDate(selected.created_at)}</span>
                </div>

                <Detail icon={Mail} label="Email" value={selected.email ?? "—"} />
                <Detail icon={ShieldCheck} label="Super Admin" value={selected.isSuperAdmin ? "Sim" : "Não"} />
                <Detail icon={Building2} label="Adesões" value={`${selected.workspaceCount} workspace(s)`} />
                <Detail icon={Hash} label="Profile ID" value={<span className="font-mono text-[11px]">{selected.id}</span>} />
                <Detail icon={Hash} label="Auth ID" value={<span className="font-mono text-[11px]">{selected.user_id}</span>} />
                <Detail icon={CalendarDays} label="Criado" value={fmtDate(selected.created_at)} />

                {selected.workspaces.length > 0 && (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">
                      Workspaces & roles
                    </div>
                    <ul className="space-y-1.5">
                      {selected.workspaces.map((w, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg border border-navy-100 bg-brand-ice/40 px-3 py-2 text-xs">
                          <span className="truncate font-mono text-[11px] text-navy-500">{w.workspace_id.slice(0, 8)}…</span>
                          <Badge variant="outline" className="border-navy-100 text-[10px] font-medium text-navy-500">{w.role}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-navy-100 pt-4">
                  <Button variant="outline" className="w-full gap-2 rounded-xl border-navy-100 hover:border-brand/40" asChild>
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
      <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-brand-ice ring-1 ring-navy-100">
        <Icon className="h-4 w-4 text-navy-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">{label}</div>
        <div className="mt-0.5 break-words text-sm font-medium text-navy">{value}</div>
      </div>
    </div>
  );
}
