import { useState, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useC2CSellers, useUpdateSellerStatus } from "@/hooks/useC2CSellers";
import {
  useSellerListings,
  useSellerCommissions,
  useSellerReviews,
  useSellerNotes,
  useAddSellerNote,
  useUpdateSellerDetails,
  useBulkUpdateSellers,
} from "@/hooks/useC2CSellerAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Search, CheckCircle2, XCircle, Clock, Ban, Eye,
  Phone, MapPin, CreditCard, FileText, Download, ShieldCheck,
  Star, Package, ArrowUpDown, StickyNote, Send, ChevronUp, ChevronDown,
  Percent, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Papa from "papaparse";
import type { C2CSeller } from "@/hooks/useC2CSellers";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  suspended: { label: "Suspenso", variant: "outline" },
};

type SortKey = "display_name" | "total_sales" | "total_revenue" | "commission_rate" | "created_at";

// ── Seller Detail Dialog ──
function SellerDetailDialog({
  seller,
  onClose,
  onApprove,
  onReject,
  onSuspend,
}: {
  seller: C2CSeller;
  onClose: () => void;
  onApprove: (s: C2CSeller) => void;
  onReject: (s: C2CSeller) => void;
  onSuspend: (s: C2CSeller) => void;
}) {
  const { data: listings = [] } = useSellerListings(seller.id);
  const { data: commissions = [] } = useSellerCommissions(seller.id);
  const { data: reviews = [] } = useSellerReviews(seller.id);
  const { data: notes = [] } = useSellerNotes(seller.id);
  const addNote = useAddSellerNote();
  const updateDetails = useUpdateSellerDetails();
  const [newNote, setNewNote] = useState("");
  const [editCommission, setEditCommission] = useState(false);
  const [commissionVal, setCommissionVal] = useState(String(seller.commission_rate));

  const totalSalesAmount = commissions.reduce((s, c) => s + c.sale_amount, 0);
  const totalCommissionAmount = commissions.reduce((s, c) => s + c.commission_amount, 0);

  const handleSaveCommission = () => {
    const rate = parseFloat(commissionVal);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    updateDetails.mutate({ sellerId: seller.id, updates: { commission_rate: rate } });
    setEditCommission(false);
  };

  const handleToggleVerified = () => {
    updateDetails.mutate({ sellerId: seller.id, updates: { is_verified: !seller.is_verified } });
  };

  const handleReactivate = () => {
    updateDetails.mutate({ sellerId: seller.id, updates: { status: "approved" } });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {seller.display_name}
            {seller.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            <Badge variant={STATUS_CONFIG[seller.status].variant} className="ml-2">
              {STATUS_CONFIG[seller.status].label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="listings">Anúncios</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Nome" value={seller.display_name} />
              <Field label="Telefone" value={seller.phone} icon={<Phone className="h-3 w-3" />} />
              <Field label="Localização" value={seller.location} icon={<MapPin className="h-3 w-3" />} />
              <Field label="NIF" value={seller.nif} icon={<FileText className="h-3 w-3" />} />
              <Field label="IBAN" value={seller.iban} icon={<CreditCard className="h-3 w-3" />} className="col-span-2 font-mono" />
              <Field label="Banco" value={seller.bank_name} />
              <Field label="Titular" value={seller.account_holder} />
            </div>

            {seller.bio && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-sm">{seller.bio}</p>
              </div>
            )}

            {/* Admin actions */}
            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Ações Admin</p>

              {/* Commission override */}
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Comissão:</span>
                {editCommission ? (
                  <>
                    <Input
                      type="number"
                      value={commissionVal}
                      onChange={(e) => setCommissionVal(e.target.value)}
                      className="w-20 h-8"
                      min={0}
                      max={100}
                      step={0.5}
                    />
                    <span className="text-sm">%</span>
                    <Button size="sm" variant="ghost" onClick={handleSaveCommission}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditCommission(false)}>Cancelar</Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium">{seller.commission_rate}%</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditCommission(true); setCommissionVal(String(seller.commission_rate)); }}>
                      Editar
                    </Button>
                  </>
                )}
              </div>

              {/* Verification toggle */}
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Verificado:</span>
                <Badge variant={seller.is_verified ? "default" : "outline"}>
                  {seller.is_verified ? "Sim" : "Não"}
                </Badge>
                <Button size="sm" variant="ghost" onClick={handleToggleVerified}>
                  {seller.is_verified ? "Remover verificação" : "Verificar"}
                </Button>
              </div>

              {/* Status actions */}
              <div className="flex gap-2 flex-wrap">
                {seller.status === "pending" && (
                  <>
                    <Button size="sm" className="gap-1" onClick={() => { onApprove(seller); onClose(); }}>
                      <CheckCircle2 className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => { onReject(seller); onClose(); }}>
                      <XCircle className="h-3 w-3" /> Rejeitar
                    </Button>
                  </>
                )}
                {seller.status === "approved" && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { onSuspend(seller); onClose(); }}>
                    <Ban className="h-3 w-3" /> Suspender
                  </Button>
                )}
                {(seller.status === "rejected" || seller.status === "suspended") && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { handleReactivate(); onClose(); }}>
                    <RotateCcw className="h-3 w-3" /> Reativar
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Listings Tab ── */}
          <TabsContent value="listings" className="mt-4">
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem anúncios</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {listings.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 border rounded-lg p-2">
                    {l.photos?.[0] && (
                      <img src={l.photos[0]} alt="" className="h-12 w-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.price}€ · {l.condition}</p>
                    </div>
                    <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs">
                      {l.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Sales Tab ── */}
          <TabsContent value="sales" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Vendas</p>
                <p className="text-lg font-bold">{commissions.length}</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-lg font-bold">{totalSalesAmount.toFixed(2)}€</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Comissões</p>
                <p className="text-lg font-bold">{totalCommissionAmount.toFixed(2)}€</p>
              </div>
            </div>
            {commissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem vendas registadas</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {commissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                    <div>
                      <p>{c.sale_amount.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd MMM yyyy", { locale: pt })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">Comissão: {c.commission_amount.toFixed(2)}€</p>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-xs">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Reviews Tab ── */}
          <TabsContent value="reviews" className="mt-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem avaliações</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {reviews.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(r.created_at), "dd MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Notes Tab ── */}
          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota interna..."
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                disabled={!newNote.trim() || addNote.isPending}
                onClick={() => {
                  addNote.mutate({ sellerId: seller.id, note: newNote.trim() });
                  setNewNote("");
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem notas</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className="border rounded-lg p-2 text-sm">
                    <p>{n.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: pt })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, icon, className }: { label: string; value?: string | null; icon?: React.ReactNode; className?: string }) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// ── Main Page ──
export default function C2CSellersAdmin() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: sellers = [], isLoading } = useC2CSellers(workspaceId);
  const updateStatus = useUpdateSellerStatus(workspaceId);
  const bulkUpdate = useBulkUpdateSellers();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<C2CSeller | null>(null);
  const [rejectDialog, setRejectDialog] = useState<C2CSeller | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = sellers.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.display_name.toLowerCase().includes(q) || s.nif?.includes(q) || s.phone?.includes(q);
      }
      return true;
    });
    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [sellers, filterStatus, search, sortKey, sortAsc]);

  const counts = {
    all: sellers.length,
    pending: sellers.filter((s) => s.status === "pending").length,
    approved: sellers.filter((s) => s.status === "approved").length,
    rejected: sellers.filter((s) => s.status === "rejected").length,
    suspended: sellers.filter((s) => s.status === "suspended").length,
  };

  const handleApprove = (seller: C2CSeller) => updateStatus.mutate({ sellerId: seller.id, status: "approved" });
  const handleReject = () => {
    if (!rejectDialog) return;
    updateStatus.mutate({ sellerId: rejectDialog.id, status: "rejected", rejectionReason });
    setRejectDialog(null);
    setRejectionReason("");
  };
  const handleSuspend = (seller: C2CSeller) => updateStatus.mutate({ sellerId: seller.id, status: "suspended" });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortAsc ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s) => s.id)));
  };

  const handleBulkApprove = () => {
    bulkUpdate.mutate({ sellerIds: [...selectedIds], updates: { status: "approved" } });
    setSelectedIds(new Set());
  };

  const handleBulkSuspend = () => {
    bulkUpdate.mutate({ sellerIds: [...selectedIds], updates: { status: "suspended" } });
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const csv = Papa.unparse(
      sellers.map((s) => ({
        Nome: s.display_name,
        Estado: STATUS_CONFIG[s.status]?.label,
        Telefone: s.phone || "",
        Localização: s.location || "",
        NIF: s.nif || "",
        IBAN: s.iban || "",
        Banco: s.bank_name || "",
        Titular: s.account_holder || "",
        "Comissão (%)": s.commission_rate,
        Verificado: s.is_verified ? "Sim" : "Não",
        "Total Vendas": s.total_sales,
        Receita: s.total_revenue,
        "Data Registo": format(new Date(s.created_at), "yyyy-MM-dd"),
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendedores-c2c-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Vendedores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Aprovar, rejeitar e gerir vendedores do marketplace C2C</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: "all", label: "Total", icon: Users, count: counts.all },
          { key: "pending", label: "Pendentes", icon: Clock, count: counts.pending },
          { key: "approved", label: "Aprovados", icon: CheckCircle2, count: counts.approved },
          { key: "rejected", label: "Rejeitados", icon: XCircle, count: counts.rejected },
          { key: "suspended", label: "Suspensos", icon: Ban, count: counts.suspended },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              filterStatus === key ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/50"
            }`}
          >
            <Icon className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-xl font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar vendedores..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionados</span>
            <Button size="sm" className="gap-1" onClick={handleBulkApprove}>
              <CheckCircle2 className="h-3 w-3" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleBulkSuspend}>
              <Ban className="h-3 w-3" /> Suspender
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum vendedor encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>
                  <button className="flex items-center" onClick={() => toggleSort("display_name")}>
                    Vendedor <SortIcon col="display_name" />
                  </button>
                </TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <button className="flex items-center" onClick={() => toggleSort("total_sales")}>
                    Vendas <SortIcon col="total_sales" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="flex items-center" onClick={() => toggleSort("total_revenue")}>
                    Receita <SortIcon col="total_revenue" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="flex items-center" onClick={() => toggleSort("commission_rate")}>
                    Comissão <SortIcon col="commission_rate" />
                  </button>
                </TableHead>
                <TableHead>Verificado</TableHead>
                <TableHead>
                  <button className="flex items-center" onClick={() => toggleSort("created_at")}>
                    Data <SortIcon col="created_at" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((seller) => {
                const sc = STATUS_CONFIG[seller.status];
                return (
                  <TableRow key={seller.id} data-state={selectedIds.has(seller.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(seller.id)} onCheckedChange={() => toggleSelect(seller.id)} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{seller.display_name}</p>
                        {seller.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {seller.location}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {seller.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {seller.phone}</p>}
                        {seller.nif && <p className="flex items-center gap-1"><FileText className="h-3 w-3" /> {seller.nif}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{seller.total_sales}</TableCell>
                    <TableCell className="font-medium">{seller.total_revenue.toFixed(2)}€</TableCell>
                    <TableCell>{seller.commission_rate}%</TableCell>
                    <TableCell>
                      {seller.is_verified ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(seller.created_at), "dd MMM yyyy", { locale: pt })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSeller(seller)} title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {seller.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleApprove(seller)} title="Aprovar">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setRejectDialog(seller)} title="Rejeitar">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {seller.status === "approved" && (
                          <Button variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700" onClick={() => handleSuspend(seller)} title="Suspender">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Seller Detail Dialog */}
      {selectedSeller && (
        <SellerDetailDialog
          seller={selectedSeller}
          onClose={() => setSelectedSeller(null)}
          onApprove={handleApprove}
          onReject={(s) => { setRejectDialog(s); setSelectedSeller(null); }}
          onSuspend={handleSuspend}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Vendedor</DialogTitle>
            <DialogDescription>
              Indica o motivo da rejeição para {rejectDialog?.display_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motivo da rejeição..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Confirmar Rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
