import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Search, Filter, Download, RefreshCw, Users, Activity,
  Sparkles, X, ExternalLink, Mail, Globe, MapPin, CalendarDays, Hash,
  ShieldCheck, PauseCircle, PlayCircle, Pencil, Save, Loader2, History,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PageHeader, StatTile, StatusPill, ErrorBanners, TableSkeleton, EmptyState, fmtDate,
} from "@/components/backoffice-v2/_shared";
import { ConfirmActionDialog } from "@/components/backoffice-v2/ConfirmActionDialog";
import { WorkspaceAuditTimeline } from "@/components/backoffice-v2/WorkspaceAuditTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspacesAdmin, type WorkspaceAdminRow } from "@/hooks/useWorkspacesAdmin";
import {
  useSuspendWorkspace,
  useReactivateWorkspace,
  useUpdateWorkspaceMetadata,
} from "@/hooks/useWorkspaceAdminMutations";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkspaceSaasSnapshot } from "@/hooks/useSaasAdminActions";
import { ChangePlanDialog } from "@/components/backoffice-v2/ChangePlanDialog";
import { AssignCreditsDialog } from "@/components/backoffice-v2/AssignCreditsDialog";

import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function BackofficeWorkspacesV2() {
  const { data, isLoading, isError, error, refetch, isFetching } = useWorkspacesAdmin();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");

  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkspaceAdminRow | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const saasSnapshot = useWorkspaceSaasSnapshot(selected?.id ?? null);

  const [confirmAction, setConfirmAction] = useState<null | "suspend" | "reactivate">(null);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [tab, setTab] = useState<"details" | "history">("details");

  const { isSuperAdmin } = useUserRole();
  const suspendMut = useSuspendWorkspace();
  const reactivateMut = useReactivateWorkspace();
  const updateMetaMut = useUpdateWorkspaceMetadata();

  // Sincronizar campos editáveis quando muda o workspace selecionado
  useEffect(() => {
    if (selected) {
      setEditName(selected.name ?? "");
      setEditCompany(selected.company_name ?? "");
      setEditing(false);
      setTab("details");
    }
  }, [selected?.id]);

  // Refrescar a versão "selected" quando os dados forem invalidados após mutation
  useEffect(() => {
    if (!selected || !data?.rows) return;
    const fresh = data.rows.find((r) => r.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [data?.rows]);

  // Limpar motivo sempre que o modal abre/fecha
  useEffect(() => {
    if (!confirmAction) setReason("");
  }, [confirmAction]);

  const reasonValid = reason.trim().length >= 3;

  const handleConfirmAction = () => {
    if (!selected || !confirmAction || !reasonValid) return;
    const onDone = () => setConfirmAction(null);
    const payload = { id: selected.id, status: selected.status, reason: reason.trim() };
    if (confirmAction === "suspend") {
      suspendMut.mutate(payload, { onSettled: onDone });
    } else {
      reactivateMut.mutate(payload, { onSettled: onDone });
    }
  };

  const handleSaveMetadata = () => {
    if (!selected) return;
    updateMetaMut.mutate(
      {
        workspace: {
          id: selected.id,
          name: selected.name,
          company_name: selected.company_name,
        },
        patch: { name: editName, company_name: editCompany || null },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

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
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.26, delay: Math.min(i * 0.018, 0.22), ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setSelected(w)}
                      className="group relative cursor-pointer border-b border-navy-100/60 transition-colors duration-200 hover:bg-brand-ice/60"
                    >
                      <td className="relative px-5 py-3.5">
                        <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] origin-top scale-y-0 rounded-r-full bg-gradient-to-b from-brand to-cyan transition-transform duration-300 group-hover:scale-y-100" />
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-ice to-navy-100 text-[12px] font-semibold text-navy-500 transition-all duration-300 group-hover:from-brand/15 group-hover:to-cyan/15 group-hover:text-brand group-hover:scale-105">
                            {w.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-navy">{w.name}</div>
                            <div className="truncate text-xs text-navy-300">{w.slug ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusPill status={w.status} /></td>
                      <td className="px-4 py-3.5 text-navy-500 transition-colors group-hover:text-navy">{w.company_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-navy-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-navy-300 transition-colors group-hover:text-brand" /> {w.membersCount}
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
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-40 bg-navy/45 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: "100%", opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.7 }}
              transition={{ duration: 0.38, ease: [0.19, 1, 0.22, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-[-24px_0_60px_-20px_rgba(11,29,61,0.28)]"
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

              {/* Tabs */}
              <div className="sticky top-[65px] z-[1] flex gap-1 border-b border-navy-100 bg-white/90 px-6 backdrop-blur-xl">
                <TabButton active={tab === "details"} onClick={() => setTab("details")} icon={Building2} label="Detalhes" />
                <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={History} label="Histórico" />
              </div>

              {tab === "history" ? (
                <div className="space-y-4 p-6">
                  <div className="flex items-center gap-2 text-xs text-navy-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand" />
                    <span>Auditoria server-side · últimas 50 ações</span>
                  </div>
                  <WorkspaceAuditTimeline workspaceId={selected.id} />
                </div>
              ) : (
              <div className="space-y-5 p-6">
                <div className="flex items-center gap-2"><StatusPill status={selected.status} /><span className="text-xs text-navy-300">criado a {fmtDate(selected.created_at)}</span></div>

                <DetailRow icon={Hash} label="Slug" value={selected.slug ?? "—"} />
                <DetailRow icon={Building2} label="Empresa" value={selected.company_name ?? "—"} />
                <DetailRow icon={Mail} label="Email de faturação" value={selected.billing_email ?? "—"} />
                <DetailRow icon={MapPin} label="Região" value={selected.region ?? "—"} />
                <DetailRow icon={Users} label="Membros" value={String(selected.membersCount)} />
                <DetailRow icon={Globe} label="ID" value={<span className="font-mono text-[11px]">{selected.id}</span>} />

                {/* Ações administrativas — apenas super admin */}
                {isSuperAdmin && (
                  <div className="space-y-4 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-white p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <h3 className="font-display text-sm font-semibold text-navy">Ações administrativas</h3>
                    </div>

                    {/* Editar metadados */}
                    <div className="space-y-3 rounded-xl border border-navy-100 bg-white p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                          Metadados
                        </div>
                        {!editing ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(true)}
                            className="h-7 gap-1.5 rounded-lg px-2 text-xs text-navy-500 hover:bg-brand-ice hover:text-navy"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(false);
                              setEditName(selected.name);
                              setEditCompany(selected.company_name ?? "");
                            }}
                            disabled={updateMetaMut.isPending}
                            className="h-7 gap-1.5 rounded-lg px-2 text-xs text-navy-500 hover:bg-brand-ice hover:text-navy"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>

                      {editing ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-navy-500">Nome interno</Label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={120}
                              className="h-9 rounded-lg border-navy-100 bg-white text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-navy-500">Empresa</Label>
                            <Input
                              value={editCompany}
                              onChange={(e) => setEditCompany(e.target.value)}
                              maxLength={200}
                              placeholder="—"
                              className="h-9 rounded-lg border-navy-100 bg-white text-sm"
                            />
                          </div>
                          <Button
                            onClick={handleSaveMetadata}
                            disabled={
                              updateMetaMut.isPending ||
                              (editName.trim() === selected.name &&
                                (editCompany.trim() || null) === (selected.company_name ?? null))
                            }
                            className="h-9 w-full gap-2 rounded-lg bg-brand text-white shadow-[0_8px_24px_-12px_rgba(37,99,235,0.6)] hover:bg-brand/90"
                          >
                            {updateMetaMut.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Guardar alterações
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs leading-relaxed text-navy-300">
                          Edita o nome interno e a empresa associada. Não afeta o slug nem o domínio.
                        </p>
                      )}
                    </div>

                    {/* Suspender / Reativar */}
                    <div className="space-y-2 rounded-xl border border-navy-100 bg-white p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                        Estado do workspace
                      </div>
                      {selected.status === "suspended" ? (
                        <Button
                          onClick={() => setConfirmAction("reactivate")}
                          disabled={reactivateMut.isPending}
                          className="h-9 w-full gap-2 rounded-lg bg-emerald-600 text-white shadow-[0_8px_24px_-12px_rgba(5,150,105,0.6)] hover:bg-emerald-700"
                        >
                          {reactivateMut.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                          Reativar workspace
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setConfirmAction("suspend")}
                          disabled={suspendMut.isPending}
                          className="h-9 w-full gap-2 rounded-lg bg-amber-500 text-white shadow-[0_8px_24px_-12px_rgba(245,158,11,0.6)] hover:bg-amber-600"
                        >
                          {suspendMut.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PauseCircle className="h-4 w-4" />
                          )}
                          Suspender workspace
                        </Button>
                      )}
                      <p className="text-[11px] leading-relaxed text-navy-300">
                        Reversível. Não elimina dados nem cancela subscrições.
                      </p>
                    </div>

                    {/* Plano & créditos */}
                    <div className="space-y-2 rounded-xl border border-navy-100 bg-white p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-300">
                        Plano e créditos
                      </div>
                      <p className="text-[11px] leading-relaxed text-navy-300">
                        Plano atual: <strong className="capitalize text-navy">{saasSnapshot.data?.plan ?? "—"}</strong>
                        {" · "}Saldo: <strong className="text-navy">{(saasSnapshot.data?.creditBalance ?? 0).toLocaleString("pt-PT")}</strong> créditos
                      </p>
                      <Button
                        variant="outline"
                        className="h-9 w-full gap-2 rounded-lg border-navy-100 hover:border-brand/40"
                        onClick={() => setPlanDialogOpen(true)}
                      >
                        <ShieldCheck className="h-4 w-4" /> Alterar plano de subscrição
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 w-full gap-2 rounded-lg border-navy-100 hover:border-brand/40"
                        onClick={() => setCreditsDialogOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" /> Atribuir / remover créditos
                      </Button>
                    </div>
                  </div>
                )}


                <div className="border-t border-navy-100 pt-4">
                  <Button variant="outline" className="w-full gap-2 rounded-xl border-navy-100 hover:border-brand/40" asChild>
                    <a href={`/super-admin?ws=${selected.id}`} target="_blank" rel="noreferrer">
                      Abrir em Backoffice clássico <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal de confirmação para ações de estado */}
      <ConfirmActionDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        loading={suspendMut.isPending || reactivateMut.isPending}
        confirmDisabled={!reasonValid}
        tone={confirmAction === "reactivate" ? "info" : "warning"}
        title={
          confirmAction === "reactivate"
            ? "Reativar este workspace?"
            : "Suspender este workspace?"
        }
        confirmLabel={confirmAction === "reactivate" ? "Reativar" : "Suspender"}
        description={
          confirmAction === "reactivate" ? (
            <>O workspace volta ao estado <strong className="text-navy">ativo</strong> e os membros recuperam acesso normal.</>
          ) : (
            <>O workspace fica <strong className="text-navy">suspenso</strong>. Os utilizadores deixam de conseguir aceder até ser reativado. Nenhum dado é apagado.</>
          )
        }
      >
        {selected && (
          <div className="space-y-3">
            <ul className="space-y-1.5 text-xs text-navy-500">
              <li>• Workspace: <strong className="font-medium text-navy">{selected.name}</strong></li>
              <li>• Estado atual: <span className="font-medium text-navy">{selected.status ?? "—"}</span></li>
              <li>• Membros afetados: <span className="font-medium text-navy">{selected.membersCount}</span></li>
              <li>• A ação fica registada em auditoria server-side.</li>
            </ul>
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-medium text-navy">
                Motivo {confirmAction === "suspend" ? "da suspensão" : "da reativação"}
                <span className="ml-1 text-rose-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                placeholder="Indica o motivo desta ação para o histórico administrativo."
                rows={3}
                className="resize-none rounded-lg border-navy-100 bg-white text-sm focus-visible:ring-brand/20"
                autoFocus
              />
              <div className="flex items-center justify-between text-[10.5px] text-navy-300">
                <span>{reasonValid ? "Pronto a registar." : "Mínimo 3 caracteres."}</span>
                <span>{reason.length}/500</span>
              </div>
            </div>
          </div>
        )}
      </ConfirmActionDialog>
    </BackofficeShellV2>
  );
}

function TabButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
        active ? "text-brand" : "text-navy-300 hover:text-navy",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {active && (
        <motion.span
          layoutId="ws-drawer-tab"
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </button>
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
