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
      <div className="mx-auto max-w-[1400px] space-y-7 px-4 py-8 md:px-8 md:py-10">
        <ErrorBanners isError={isError} error={error} partialErrors={data?.partialErrors} />

        <PageHeader
          badge={<><Building2 className="h-3 w-3 text-brand" /> Backoffice · Workspaces</>}
          title="Workspaces"
          subtitle="Gestão de organizações registadas no FastCRM"
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
          <StatTile label="Total" value={data?.total ?? 0} icon={Building2} accent="bg-gradient-to-br from-brand to-cyan" />
          <StatTile label="Ativos" value={data?.active ?? 0} icon={Activity} accent="bg-gradient-to-br from-success to-emerald-400" />
          <StatTile label="Trial" value={data?.trial ?? 0} icon={Sparkles} accent="bg-gradient-to-br from-cyan to-sky-400" />
          <StatTile label="Novos · 30d" value={data?.new30d ?? 0} icon={CalendarDays} accent="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
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
                placeholder="Procurar por nome, slug, empresa ou email…"
                className="h-10 rounded-xl border-navy-100 bg-brand-ice/60 pl-10 text-sm text-navy placeholder:text-navy-300 transition-all focus-visible:border-brand focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-brand/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-navy-300" />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl border-navy-100 bg-white text-sm">
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
              <thead className="bg-brand-ice/60 text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                <tr>
                  <th className="px-5 py-3.5">Workspace</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Empresa</th>
                  <th className="px-4 py-3.5">Membros</th>
                  <th className="px-4 py-3.5">Região</th>
                  <th className="px-4 py-3.5">Criado</th>
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
                  visible.map((w, i) => (
                    <motion.tr
                      key={w.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.2) }}
                      onClick={() => setSelected(w)}
                      className="group cursor-pointer border-b border-navy-100/60 transition-colors hover:bg-brand-ice/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-ice to-navy-100 text-[12px] font-semibold text-navy-500 transition-all group-hover:from-brand/15 group-hover:to-cyan/15 group-hover:text-brand">
                            {w.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-navy">{w.name}</div>
                            <div className="truncate text-xs text-navy-300">{w.slug ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusPill status={w.status} /></td>
                      <td className="px-4 py-3.5 text-navy-500">{w.company_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-navy-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-navy-300" /> {w.membersCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-navy-500">{w.region ?? "—"}</td>
                      <td className="px-4 py-3.5 text-navy-300">{fmtDate(w.created_at)}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">Workspace</div>
                  <div className="truncate font-display text-lg font-semibold text-navy">{selected.name}</div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-brand-ice hover:text-navy" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-5 p-6">
                <div className="flex items-center gap-2"><StatusPill status={selected.status} /><span className="text-xs text-navy-300">criado a {fmtDate(selected.created_at)}</span></div>

                <DetailRow icon={Hash} label="Slug" value={selected.slug ?? "—"} />
                <DetailRow icon={Building2} label="Empresa" value={selected.company_name ?? "—"} />
                <DetailRow icon={Mail} label="Email de faturação" value={selected.billing_email ?? "—"} />
                <DetailRow icon={MapPin} label="Região" value={selected.region ?? "—"} />
                <DetailRow icon={Users} label="Membros" value={String(selected.membersCount)} />
                <DetailRow icon={Globe} label="ID" value={<span className="font-mono text-[11px]">{selected.id}</span>} />

                <div className="border-t border-navy-100 pt-4">
                  <Button variant="outline" className="w-full gap-2 rounded-xl border-navy-100 hover:border-brand/40" asChild>
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
