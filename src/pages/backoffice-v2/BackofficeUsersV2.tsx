import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Filter, RefreshCw, Download, ShieldCheck, Mail,
  CalendarDays, Building2, X, Crown, UserCheck, UserX, ExternalLink, Hash,
  History, ShieldAlert, Loader2, KeyRound, MailCheck, Copy, Check,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import {
  PageHeader, StatTile, StatusPill, ErrorBanners, TableSkeleton, EmptyState,
  InitialsAvatar, fmtDate,
} from "@/components/backoffice-v2/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUsersAdmin, type UserAdminRow } from "@/hooks/useUsersAdmin";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeactivateUser, useReactivateUser,
} from "@/hooks/useUserAdminMutations";
import { ConfirmActionDialog } from "@/components/backoffice-v2/ConfirmActionDialog";
import { UserAuditTimeline } from "@/components/backoffice-v2/UserAuditTimeline";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type DrawerTab = "details" | "history";
type PendingAction =
  | { kind: "deactivate"; user: UserAdminRow }
  | { kind: "reactivate"; user: UserAdminRow }
  | null;

export default function BackofficeUsersV2() {
  const { data, isLoading, isError, error, refetch, isFetching } = useUsersAdmin();
  const { isSuperAdmin } = useUserRole();
  const { user: authUser } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "super" | "with_ws" | "no_ws" | "suspended">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserAdminRow | null>(null);
  const [tab, setTab] = useState<DrawerTab>("details");

  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");

  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((u) => {
      if (filter === "super" && !u.isSuperAdmin) return false;
      if (filter === "with_ws" && u.workspaceCount === 0) return false;
      if (filter === "no_ws" && u.workspaceCount > 0) return false;
      if (filter === "suspended" && u.status !== "suspended" && u.status !== "inactive") return false;
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

  const closeDrawer = () => {
    setSelected(null);
    setTab("details");
  };
  const openDrawer = (u: UserAdminRow) => {
    setSelected(u);
    setTab("details");
  };

  const closeDialog = () => {
    if (deactivate.isPending || reactivate.isPending) return;
    setPending(null);
    setReason("");
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "deactivate") {
        await deactivate.mutateAsync({
          targetUserId: pending.user.user_id,
          reason,
        });
      } else {
        await reactivate.mutateAsync({
          targetUserId: pending.user.user_id,
          reason,
        });
      }
      // Atualizar selected para refletir novo status sem fechar o drawer
      if (selected?.user_id === pending.user.user_id) {
        setSelected({
          ...selected,
          status: pending.kind === "deactivate" ? "inactive" : "active",
        });
      }
      setPending(null);
      setReason("");
    } catch {
      // erro já tratado por toast nos hooks
    }
  };

  const isActor = (u: UserAdminRow) => authUser?.id && u.user_id === authUser.id;

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
                  <SelectItem value="suspended">Suspensos / Inativos</SelectItem>
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
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.26, delay: Math.min(i * 0.018, 0.22), ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => openDrawer(u)}
                      className="group relative cursor-pointer border-b border-navy-100/60 transition-colors duration-200 hover:bg-brand-ice/60"
                    >
                      <td className="relative px-5 py-3.5">
                        <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] origin-top scale-y-0 rounded-r-full bg-gradient-to-b from-brand to-cyan transition-transform duration-300 group-hover:scale-y-100" />
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
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-40 bg-navy/45 backdrop-blur-sm"
              onClick={closeDrawer}
            />
            <motion.aside
              initial={{ x: "100%", opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.7 }}
              transition={{ duration: 0.38, ease: [0.19, 1, 0.22, 1] }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-[-24px_0_60px_-20px_rgba(11,29,61,0.28)]"
            >
              <div className="sticky top-0 z-10 border-b border-navy-100 bg-white/90 backdrop-blur-xl">
                <div className="flex items-center justify-between px-6 py-4">
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
                  <button onClick={closeDrawer} className="rounded-lg p-1.5 text-navy-500 transition-colors hover:bg-brand-ice hover:text-navy" aria-label="Fechar">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex gap-1 px-6 pb-2">
                  <TabBtn active={tab === "details"} onClick={() => setTab("details")}>Detalhes</TabBtn>
                  <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
                    <History className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" /> Histórico
                  </TabBtn>
                </div>
              </div>

              {tab === "details" ? (
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

                  {/* Ações administrativas (apenas super admin) */}
                  {isSuperAdmin && (
                    <AdminActionsPanel
                      user={selected}
                      isActor={!!isActor(selected)}
                      onDeactivate={() => { setReason(""); setPending({ kind: "deactivate", user: selected }); }}
                      onReactivate={() => { setReason(""); setPending({ kind: "reactivate", user: selected }); }}
                      pending={
                        deactivate.isPending || reactivate.isPending
                      }
                    />
                  )}

                  <div className="border-t border-navy-100 pt-4">
                    <Button variant="outline" className="w-full gap-2 rounded-xl border-navy-100 hover:border-brand/40" asChild>
                      <a href={`/super-admin?user=${selected.user_id}`} target="_blank" rel="noreferrer">
                        Abrir em Backoffice clássico <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <UserAuditTimeline targetUserId={selected.user_id} />
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Confirmação de ação administrativa */}
      <ConfirmActionDialog
        open={!!pending}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        loading={deactivate.isPending || reactivate.isPending}
        confirmDisabled={reason.trim().length < 3}
        tone={pending?.kind === "deactivate" ? "warning" : "info"}
        title={
          pending?.kind === "deactivate"
            ? "Suspender acesso do utilizador?"
            : "Reativar acesso do utilizador?"
        }
        description={
          pending?.kind === "deactivate" ? (
            <>
              Esta ação marca o utilizador como <strong>inativo</strong> e pode impedir o
              acesso à plataforma em fluxos que verificam o estado do perfil. As sessões
              ativas <strong>não</strong> são revogadas nesta fase.
              <br />Indica o motivo para manter o histórico administrativo completo.
            </>
          ) : (
            <>
              Esta ação repõe o utilizador no estado <strong>ativo</strong>.
              <br />Indica o motivo para registo no histórico.
            </>
          )
        }
        confirmLabel={
          pending?.kind === "deactivate" ? "Confirmar suspensão" : "Confirmar reativação"
        }
      >
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-300">
            {pending?.kind === "deactivate" ? "Motivo da suspensão" : "Motivo da reativação"}
            <span className="ml-1 text-rose-500">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="Ex.: pedido do cliente, suspeita de uso indevido, etc."
            rows={3}
            className="resize-none rounded-xl border-navy-100 bg-white text-sm text-navy placeholder:text-navy-300 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/10"
          />
          <div className="flex justify-end text-[10px] text-navy-300">
            {reason.trim().length}/500
          </div>
        </div>
      </ConfirmActionDialog>
    </BackofficeShellV2>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-brand/10 text-brand"
          : "text-navy-500 hover:bg-brand-ice hover:text-navy",
      )}
    >
      {children}
    </button>
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

function generatePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Garantir pelo menos 1 de cada tipo (requisitos de password)
  const base = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (base.length < length) base.push(pick(all));
  return base.sort(() => Math.random() - 0.5).join("");
}

function SetPasswordDialog({
  user, open, onClose,
}: { user: UserAdminRow; open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setPassword("");
    setSavedPassword(null);
    setCopied(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "set_password", userId: user.user_id, password },
      });
      if (error) throw new Error(data?.error || error.message || "Erro ao definir palavra-passe");
      if (data?.error) throw new Error(data.error);
      setSavedPassword(password);
      toast.success("Palavra-passe definida com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível definir a palavra-passe.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(savedPassword ?? password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir palavra-passe</DialogTitle>
          <DialogDescription>
            Definir uma nova palavra-passe para <strong>{user.email}</strong>.
            Esta ação fica registada no histórico administrativo.
          </DialogDescription>
        </DialogHeader>

        {savedPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Palavra-passe definida. Copia-a agora e envia-a ao utilizador por um canal seguro —
              não voltará a ser mostrada.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
                {savedPassword}
              </code>
              <Button variant="outline" size="icon" onClick={copyPassword} aria-label="Copiar palavra-passe">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-new-password">
                Nova palavra-passe
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="admin-new-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                  className="shrink-0"
                >
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: usar "Gerar" e partilhar a password com o utilizador, que a poderá
                alterar depois nas definições do perfil.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {savedPassword ? (
            <Button onClick={handleClose}>Concluir</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isSaving || password.length < 8}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Definir palavra-passe
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminActionsPanel({
  user, isActor, onDeactivate, onReactivate, pending,
}: {
  user: UserAdminRow;
  isActor: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
  pending: boolean;
}) {
  const isInactive = user.status === "inactive" || user.status === "suspended";
  const blockedSelf = isActor;
  const blockedSuper = user.isSuperAdmin;
  const blocked = blockedSelf || blockedSuper;

  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [emailConfirmedNow, setEmailConfirmedNow] = useState(false);

  const handleSendReset = async () => {
    if (!user.email) {
      toast.error("Este utilizador não tem email registado.");
      return;
    }
    setIsSendingReset(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "send_password_reset", userId: user.user_id, email: user.email },
      });
      if (error) throw new Error(data?.error || error.message || "Erro ao enviar email");
      if (data?.error) throw new Error(data.error);
      toast.success(`Email de recuperação enviado para ${user.email}.`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível enviar o email de recuperação.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmEmail = async () => {
    setIsConfirmingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "confirm_email", userId: user.user_id },
      });
      if (error) throw new Error(data?.error || error.message || "Erro ao confirmar email");
      if (data?.error) throw new Error(data.error);
      setEmailConfirmedNow(true);
      toast.success("Email confirmado. O utilizador já consegue iniciar sessão.");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível confirmar o email.");
    } finally {
      setIsConfirmingEmail(false);
    }
  };


  return (
    <div className="rounded-2xl border border-navy-100 bg-brand-ice/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-brand" />
        <h3 className="font-display text-sm font-semibold text-navy">
          Ações administrativas
        </h3>
      </div>

      {blocked && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          {blockedSelf && (
            <div>Não podes executar ações administrativas sobre a tua própria conta.</div>
          )}
          {!blockedSelf && blockedSuper && (
            <div>Ações sobre outros super admins estão bloqueadas nesta fase.</div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={() => setSetPasswordOpen(true)}
          disabled={blocked || pending}
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-navy-100 bg-white text-navy-500 hover:border-brand/40 hover:text-navy"
        >
          <KeyRound className="h-4 w-4" />
          Definir palavra-passe
        </Button>

        <Button
          onClick={handleSendReset}
          disabled={blocked || pending || isSendingReset}
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-navy-100 bg-white text-navy-500 hover:border-brand/40 hover:text-navy"
        >
          {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          Enviar email de recuperação
        </Button>

        <Button
          onClick={handleConfirmEmail}
          disabled={blocked || pending || isConfirmingEmail || emailConfirmedNow}
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-navy-100 bg-white text-navy-500 hover:border-brand/40 hover:text-navy"
        >
          {isConfirmingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {emailConfirmedNow ? "Email confirmado" : "Confirmar email manualmente"}
        </Button>


        {!isInactive ? (
          <Button
            onClick={onDeactivate}
            disabled={blocked || pending}
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-amber-200 bg-white text-amber-700 hover:border-amber-300 hover:bg-amber-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
            Suspender acesso
          </Button>
        ) : (
          <Button
            onClick={onReactivate}
            disabled={blocked || pending}
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Reativar acesso
          </Button>
        )}
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-navy-300">
        Se o email do utilizador ainda não estiver confirmado, o email de recuperação pode não
        chegar — nesse caso usa "Definir palavra-passe". Revogação de sessões e remoção de conta
        serão adicionados em fases seguintes.
      </p>

      <SetPasswordDialog user={user} open={setPasswordOpen} onClose={() => setSetPasswordOpen(false)} />
    </div>
  );
}
