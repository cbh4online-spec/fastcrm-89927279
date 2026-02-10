import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useC2CSellers, useUpdateSellerStatus } from "@/hooks/useC2CSellers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Search, CheckCircle2, XCircle, Clock, Ban, Eye,
  Phone, MapPin, CreditCard, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { C2CSeller } from "@/hooks/useC2CSellers";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  suspended: { label: "Suspenso", variant: "outline" },
};

export default function C2CSellersAdmin() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: sellers = [], isLoading } = useC2CSellers(workspaceId);
  const updateStatus = useUpdateSellerStatus(workspaceId);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<C2CSeller | null>(null);
  const [rejectDialog, setRejectDialog] = useState<C2CSeller | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filtered = sellers.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.display_name.toLowerCase().includes(q) || s.nif?.includes(q) || s.phone?.includes(q);
    }
    return true;
  });

  const counts = {
    all: sellers.length,
    pending: sellers.filter((s) => s.status === "pending").length,
    approved: sellers.filter((s) => s.status === "approved").length,
    rejected: sellers.filter((s) => s.status === "rejected").length,
    suspended: sellers.filter((s) => s.status === "suspended").length,
  };

  const handleApprove = (seller: C2CSeller) => {
    updateStatus.mutate({ sellerId: seller.id, status: "approved" });
  };

  const handleReject = () => {
    if (!rejectDialog) return;
    updateStatus.mutate({ sellerId: rejectDialog.id, status: "rejected", rejectionReason });
    setRejectDialog(null);
    setRejectionReason("");
  };

  const handleSuspend = (seller: C2CSeller) => {
    updateStatus.mutate({ sellerId: seller.id, status: "suspended" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestão de Vendedores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Aprovar, rejeitar e gerir vendedores do marketplace C2C</p>
        </div>
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar vendedores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
                <TableHead>Vendedor</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((seller) => {
                const sc = STATUS_CONFIG[seller.status];
                return (
                  <TableRow key={seller.id}>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Vendedor</DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedSeller.display_name}</p>
                </div>
                {selectedSeller.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bio</p>
                    <p className="text-sm">{selectedSeller.bio}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {selectedSeller.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm">{selectedSeller.phone}</p>
                    </div>
                  )}
                  {selectedSeller.location && (
                    <div>
                      <p className="text-xs text-muted-foreground">Localização</p>
                      <p className="text-sm">{selectedSeller.location}</p>
                    </div>
                  )}
                </div>
                {selectedSeller.iban && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> IBAN</p>
                    <p className="text-sm font-mono">{selectedSeller.iban}</p>
                  </div>
                )}
                {selectedSeller.bank_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">Banco</p>
                    <p className="text-sm">{selectedSeller.bank_name}</p>
                  </div>
                )}
                {selectedSeller.nif && (
                  <div>
                    <p className="text-xs text-muted-foreground">NIF</p>
                    <p className="text-sm">{selectedSeller.nif}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant={STATUS_CONFIG[selectedSeller.status].variant}>
                    {STATUS_CONFIG[selectedSeller.status].label}
                  </Badge>
                </div>
              </div>
              {selectedSeller.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1" onClick={() => { handleApprove(selectedSeller); setSelectedSeller(null); }}>
                    <CheckCircle2 className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button variant="destructive" className="flex-1 gap-1" onClick={() => { setRejectDialog(selectedSeller); setSelectedSeller(null); }}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Vendedor</DialogTitle>
            <DialogDescription>
              Indica o motivo da rejeição para {rejectDialog?.display_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Motivo da rejeição..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason(""); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
