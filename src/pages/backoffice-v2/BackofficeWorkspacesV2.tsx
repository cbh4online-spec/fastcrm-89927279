import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Search, Filter, Download, RefreshCw, Users, Activity,
  Sparkles, X, ExternalLink, Mail, Globe, MapPin, CalendarDays, Hash,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PageHeader, StatTile, StatusPill, ErrorBanners, TableSkeleton, EmptyState, fmtDate,
} from "@/components/backoffice-v2/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspacesAdmin, type WorkspaceAdminRow } from "@/hooks/useWorkspacesAdmin";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function BackofficeWorkspacesV2() {
  const { data, isLoading, isError, error, refetch, isFetching } = useWorkspacesAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkspaceAdminRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((w) => {
      if (status !== "all" && (w.status ?? "inactive") !== status) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        (w.slug ?? "").toLowerCase().includes(q) ||
        (w.company_name ?? "").toLowerCase().includes(q) ||
        (w.billing_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [data?.rows, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <BackofficeShellV2>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 md:px-8">
        <ErrorBanners isError={isError} error={error} partialErrors={data?.partialErrors} />

        <PageHeader
          badge={<><Building2 className="h-3 w-3 text-[hsl(220,90%,56%)]" /> Backoffice · Workspaces</>}
          title="Workspaces"
          subtitle="Gestão de organizações registadas no FastCRM"
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
          <StatTile label="Total" value={data?.total ?? 0} icon={Building2} accent="bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)]" />
          <StatTile label="Ativos" value={data?.active ?? 0} icon={Activity} accent="bg-gradient-to-br from-emerald-500 to-emerald-400" />
          <StatTile label="Trial" value={data?.trial ?? 0} icon={Sparkles} accent="bg-gradient-to-br from-sky-500 to-cyan-500" />
          <StatTile label="Novos · 30d" value={data?.new30d ?? 0} icon={CalendarDays} accent="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        </div>

        {/* Filters + table */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Procurar por nome, slug, empresa ou email…"
                className="h-9 border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[150px] border-slate-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Membros</th>
                  <th className="px-4 py-3">Região</th>
                  <th className="px-4 py-3">Criado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={6} />
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Building2} title="Sem resultados" hint="Ajusta a pesquisa ou os filtros." />
                    </td>
                  </tr>
                ) : (
                  visible.map((w) => (
                    <tr
                      key={w.id}
                      onClick={() => setSelected(w)}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-[12px] font-semibold text-slate-700">
                            {w.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">{w.name}</div>
                            <div className="truncate text-xs text-slate-500">{w.slug ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={w.status} /></td>
                      <td className="px-4 py-3 text-slate-700">{w.company_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" /> {w.membersCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{w.region ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(w.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</div>
                  <div className="truncate text-base font-semibold text-slate-900">{selected.name}</div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex items-center gap-2"><StatusPill status={selected.status} /><span className="text-xs text-slate-500">criado a {fmtDate(selected.created_at)}</span></div>

                <DetailRow icon={Hash} label="Slug" value={selected.slug ?? "—"} />
                <DetailRow icon={Building2} label="Empresa" value={selected.company_name ?? "—"} />
                <DetailRow icon={Mail} label="Email de faturação" value={selected.billing_email ?? "—"} />
                <DetailRow icon={MapPin} label="Região" value={selected.region ?? "—"} />
                <DetailRow icon={Users} label="Membros" value={String(selected.membersCount)} />
                <DetailRow icon={Globe} label="ID" value={<span className="font-mono text-[11px]">{selected.id}</span>} />

                <div className="border-t border-slate-100 pt-4">
                  <Button variant="outline" className="w-full gap-2 border-slate-200" asChild>
                    <a href={`/super-admin?ws=${selected.id}`} target="_blank" rel="noreferrer">
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

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
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
