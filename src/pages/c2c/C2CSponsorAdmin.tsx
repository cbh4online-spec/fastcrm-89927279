import { useState, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAdminSponsorApplications, useUpdateSponsorApplication, type SponsorApplication } from "@/hooks/useSponsorApplications";
import {
  useAdminStoreSponsors, useCreateStoreSponsor, useUpdateStoreSponsor,
  useDeleteStoreSponsor, useToggleSponsorActive, type StoreSponsor,
} from "@/hooks/useStoreAds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle, XCircle, Globe, Plus, Pencil, Trash2,
  Award, Users, TrendingUp, Crown, Medal, Star,
} from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
  active: { label: "Ativa", variant: "default" },
  expired: { label: "Expirada", variant: "outline" },
};

const TIER_COLORS: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  silver: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const TIER_PRICES: Record<string, number> = { gold: 99, silver: 59, bronze: 29 };

const TIER_ICONS: Record<string, React.ReactNode> = {
  gold: <Crown className="h-4 w-4" />,
  silver: <Medal className="h-4 w-4" />,
  bronze: <Star className="h-4 w-4" />,
};

type SponsorFormData = {
  name: string;
  logo_url: string;
  website_url: string;
  description: string;
  tier: "gold" | "silver" | "bronze";
  is_active: boolean;
  sort_order: number;
};

const emptySponsorForm: SponsorFormData = {
  name: "", logo_url: "", website_url: "", description: "",
  tier: "bronze", is_active: true, sort_order: 0,
};

export default function C2CSponsorAdmin() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  // Applications
  const { data: apps = [], isLoading: loadingApps } = useAdminSponsorApplications(wid);
  const updateApp = useUpdateSponsorApplication(wid);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

  // Sponsors
  const { data: sponsors = [], isLoading: loadingSponsors } = useAdminStoreSponsors(wid);
  const createSponsor = useCreateStoreSponsor(wid);
  const updateSponsor = useUpdateStoreSponsor(wid);
  const deleteSponsor = useDeleteStoreSponsor(wid);
  const toggleActive = useToggleSponsorActive(wid);
  const [sponsorDialog, setSponsorDialog] = useState<{ open: boolean; editing: StoreSponsor | null }>({ open: false, editing: null });
  const [sponsorForm, setSponsorForm] = useState<SponsorFormData>(emptySponsorForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Computed
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: apps.length, pending: 0, approved: 0, rejected: 0, active: 0, expired: 0 };
    apps.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [apps]);

  const filteredApps = statusFilter === "all" ? apps : apps.filter((a) => a.status === statusFilter);

  const stats = useMemo(() => {
    const active = sponsors.filter((s) => s.is_active);
    const byTier = { gold: 0, silver: 0, bronze: 0 };
    active.forEach((s) => { byTier[s.tier]++; });
    const revenue = byTier.gold * TIER_PRICES.gold + byTier.silver * TIER_PRICES.silver + byTier.bronze * TIER_PRICES.bronze;
    return { total: active.length, byTier, revenue, pendingApps: statusCounts.pending };
  }, [sponsors, statusCounts]);

  // Handlers
  const handleApprove = (id: string) => updateApp.mutate({ applicationId: id, status: "approved" });

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    updateApp.mutate(
      { applicationId: rejectDialog.id, status: "rejected", rejectionReason: rejectReason },
      { onSuccess: () => { setRejectDialog({ open: false, id: "" }); setRejectReason(""); } }
    );
  };

  const openCreateSponsor = () => {
    setSponsorForm(emptySponsorForm);
    setSponsorDialog({ open: true, editing: null });
  };

  const openEditSponsor = (s: StoreSponsor) => {
    setSponsorForm({
      name: s.name, logo_url: s.logo_url || "", website_url: s.website_url || "",
      description: s.description || "", tier: s.tier, is_active: s.is_active, sort_order: s.sort_order,
    });
    setSponsorDialog({ open: true, editing: s });
  };

  const handleSaveSponsor = () => {
    if (!sponsorForm.name.trim()) return;
    if (sponsorDialog.editing) {
      updateSponsor.mutate(
        { id: sponsorDialog.editing.id, ...sponsorForm },
        { onSuccess: () => setSponsorDialog({ open: false, editing: null }) }
      );
    } else {
      createSponsor.mutate(sponsorForm, {
        onSuccess: () => setSponsorDialog({ open: false, editing: null }),
      });
    }
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteSponsor.mutate(deleteConfirm, { onSuccess: () => setDeleteConfirm(null) });
    }
  };

  if (loadingApps && loadingSponsors) {
    return <div className="p-8 text-center text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Sponsors</h1>
        <p className="text-muted-foreground">Gerir candidaturas, parceiros ativos e métricas.</p>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">
            Candidaturas {statusCounts.pending > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{statusCounts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors Ativos</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        {/* ── Tab: Candidaturas ── */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "approved", "rejected", "active", "expired"].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}>
                {s === "all" ? "Todas" : STATUS_BADGES[s]?.label || s} ({statusCounts[s] || 0})
              </Button>
            ))}
          </div>

          {filteredApps.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma candidatura encontrada.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => {
                const badge = STATUS_BADGES[app.status] || STATUS_BADGES.pending;
                return (
                  <Card key={app.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{app.company_name}</h3>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[app.tier]}`}>
                              {TIER_ICONS[app.tier]} {app.tier}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{app.contact_email}</p>
                          {app.contact_phone && <p className="text-sm text-muted-foreground">{app.contact_phone}</p>}
                          {app.website_url && (
                            <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-primary flex items-center gap-1 hover:underline">
                              <Globe className="h-3 w-3" />{app.website_url}
                            </a>
                          )}
                          {app.description && <p className="text-sm mt-2">{app.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            Submetida em {new Date(app.created_at).toLocaleDateString("pt-PT")}
                            {app.amount_paid > 0 && ` · Pago: ${app.amount_paid}€`}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {app.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => handleApprove(app.id)} disabled={updateApp.isPending}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive"
                                onClick={() => setRejectDialog({ open: true, id: app.id })} disabled={updateApp.isPending}>
                                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                              </Button>
                            </>
                          )}
                          {app.status === "approved" && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateApp.mutate({ applicationId: app.id, status: "active" })} disabled={updateApp.isPending}>
                              Marcar Ativa
                            </Button>
                          )}
                          {(app.status === "active" || app.status === "approved") && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateApp.mutate({ applicationId: app.id, status: "expired" })} disabled={updateApp.isPending}>
                              Expirar
                            </Button>
                          )}
                        </div>
                      </div>

                      {app.status === "rejected" && app.rejection_reason && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          Motivo: {app.rejection_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Sponsors Ativos ── */}
        <TabsContent value="sponsors" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{sponsors.length} parceiro(s)</p>
            <Button onClick={openCreateSponsor}><Plus className="h-4 w-4 mr-1" /> Adicionar Sponsor</Button>
          </div>

          {sponsors.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum sponsor registado.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {sponsors.map((s) => (
                <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-bold">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{s.name}</h3>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[s.tier]}`}>
                              {TIER_ICONS[s.tier]} {s.tier}
                            </span>
                          </div>
                          {s.website_url && (
                            <a href={s.website_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline">{s.website_url}</a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${s.id}`} className="text-xs text-muted-foreground">Ativo</Label>
                          <Switch id={`active-${s.id}`} checked={s.is_active}
                            onCheckedChange={(checked) => toggleActive.mutate({ id: s.id, is_active: checked })} />
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => openEditSponsor(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Estatísticas ── */}
        <TabsContent value="stats">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm text-muted-foreground">Sponsors Ativos</p><p className="text-2xl font-bold">{stats.total}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-2"><Crown className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Por Tier</p>
                  <p className="text-sm font-medium">{stats.byTier.gold} Gold · {stats.byTier.silver} Silver · {stats.byTier.bronze} Bronze</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div><p className="text-sm text-muted-foreground">Receita Mensal Est.</p><p className="text-2xl font-bold">{stats.revenue}€</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-secondary p-2"><Award className="h-5 w-5 text-muted-foreground" /></div>
                <div><p className="text-sm text-muted-foreground">Candidaturas Pendentes</p><p className="text-2xl font-bold">{stats.pendingApps}</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Reject Dialog ── */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, id: rejectDialog.id })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Candidatura</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Indique o motivo da rejeição:</p>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo da rejeição..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: "" })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || updateApp.isPending}>Confirmar Rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sponsor Create/Edit Dialog ── */}
      <Dialog open={sponsorDialog.open} onOpenChange={(o) => setSponsorDialog({ open: o, editing: sponsorDialog.editing })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sponsorDialog.editing ? "Editar Sponsor" : "Novo Sponsor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={sponsorForm.name} onChange={(e) => setSponsorForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Logo URL</Label><Input value={sponsorForm.logo_url} onChange={(e) => setSponsorForm((f) => ({ ...f, logo_url: e.target.value }))} /></div>
            <div><Label>Website</Label><Input value={sponsorForm.website_url} onChange={(e) => setSponsorForm((f) => ({ ...f, website_url: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={sponsorForm.description} onChange={(e) => setSponsorForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Tier</Label>
              <Select value={sponsorForm.tier} onValueChange={(v) => setSponsorForm((f) => ({ ...f, tier: v as "gold" | "silver" | "bronze" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">🥇 Gold</SelectItem>
                  <SelectItem value="silver">🥈 Silver</SelectItem>
                  <SelectItem value="bronze">🥉 Bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sponsorForm.is_active} onCheckedChange={(c) => setSponsorForm((f) => ({ ...f, is_active: c }))} />
              <Label>Ativo</Label>
            </div>
            <div><Label>Ordem</Label><Input type="number" value={sponsorForm.sort_order} onChange={(e) => setSponsorForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSponsorDialog({ open: false, editing: null })}>Cancelar</Button>
            <Button onClick={handleSaveSponsor} disabled={!sponsorForm.name.trim() || createSponsor.isPending || updateSponsor.isPending}>
              {sponsorDialog.editing ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Sponsor?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. O sponsor será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
