import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Loader2, CheckCircle2, XCircle, Search, Eye, Package } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useReturnRequests,
  useProcessReturn,
  RETURN_STATUS_CONFIG,
  RETURN_REASON_CATEGORIES,
  type ReturnRequest,
} from "@/hooks/useReturnRequests";

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "refunded", label: "Reembolsados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "cancelled", label: "Cancelados" },
];

export default function StoreReturnsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{ rr: ReturnRequest; action: "approve" | "reject" } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: returns, isLoading } = useReturnRequests({ status: statusFilter });
  const processReturn = useProcessReturn();

  const filtered = (returns || []).filter((rr) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const order = rr.store_orders as any;
    return (
      rr.request_number?.toLowerCase().includes(q) ||
      rr.reason?.toLowerCase().includes(q) ||
      order?.order_number?.toLowerCase().includes(q) ||
      order?.customer_name?.toLowerCase().includes(q) ||
      order?.customer_email?.toLowerCase().includes(q)
    );
  });

  const pendingCount = (returns || []).filter((r) => r.status === "pending").length;

  const handleProcess = async () => {
    if (!actionDialog) return;
    try {
      await processReturn.mutateAsync({
        returnRequestId: actionDialog.rr.id,
        action: actionDialog.action,
        adminNotes: adminNotes || undefined,
      });
      setActionDialog(null);
      setAdminNotes("");
    } catch {
      // Error handled by hook
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Devoluções & Reembolsos | FastCRM</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-primary" />
              Devoluções & Reembolsos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerir pedidos de devolução e processar reembolsos
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nº, cliente, motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum pedido de devolução encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Pedido</TableHead>
                      <TableHead>Encomenda</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((rr) => {
                      const order = rr.store_orders as any;
                      const statusCfg = RETURN_STATUS_CONFIG[rr.status] || RETURN_STATUS_CONFIG.pending;
                      return (
                        <TableRow key={rr.id} className="group">
                          <TableCell className="font-mono text-xs">{rr.request_number || rr.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{order?.order_number || "—"}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{order?.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{order?.customer_email}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rr.return_type === "full" ? "Total" : "Parcial"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-xs text-muted-foreground truncate">
                              {rr.reason_category ? RETURN_REASON_CATEGORIES[rr.reason_category] || rr.reason_category : rr.reason}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {rr.refund_amount != null ? `€${rr.refund_amount.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs border", statusCfg.color)}>{statusCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(rr.created_at), "dd/MM/yy HH:mm", { locale: pt })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedReturn(rr)} title="Ver detalhes">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {rr.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => { setActionDialog({ rr, action: "approve" }); setAdminNotes(""); }}
                                    title="Aprovar e reembolsar"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => { setActionDialog({ rr, action: "reject" }); setAdminNotes(""); }}
                                    title="Rejeitar"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={(o) => !o && setSelectedReturn(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Devolução</DialogTitle>
          </DialogHeader>
          {selectedReturn && <ReturnDetailView rr={selectedReturn} />}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approve" ? "Aprovar e Reembolsar" : "Rejeitar Pedido"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.action === "approve"
                ? `Confirma o reembolso de €${actionDialog?.rr.refund_amount?.toFixed(2) || "—"} via Stripe?`
                : "Indique o motivo da rejeição (opcional)."}
            </p>
            <Textarea
              placeholder="Notas internas (opcional)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
            <Button
              variant={actionDialog?.action === "approve" ? "default" : "destructive"}
              onClick={handleProcess}
              disabled={processReturn.isPending}
            >
              {processReturn.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {actionDialog?.action === "approve" ? "Confirmar Reembolso" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ReturnDetailView({ rr }: { rr: ReturnRequest }) {
  const order = rr.store_orders as any;
  const statusCfg = RETURN_STATUS_CONFIG[rr.status] || RETURN_STATUS_CONFIG.pending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Nº Pedido</p>
          <p className="font-medium">{rr.request_number || rr.id.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Estado</p>
          <Badge className={cn("text-xs border", statusCfg.color)}>{statusCfg.label}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Encomenda</p>
          <p className="font-medium">#{order?.order_number || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tipo</p>
          <p className="font-medium">{rr.return_type === "full" ? "Devolução Total" : "Devolução Parcial"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Cliente</p>
          <p className="font-medium">{order?.customer_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{order?.customer_email}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Valor do Reembolso</p>
          <p className="font-bold text-lg">{rr.refund_amount != null ? `€${rr.refund_amount.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground text-xs mb-1">Motivo</p>
        {rr.reason_category && (
          <Badge variant="outline" className="text-xs mb-1 mr-1">
            {RETURN_REASON_CATEGORIES[rr.reason_category] || rr.reason_category}
          </Badge>
        )}
        <p className="text-sm">{rr.reason}</p>
      </div>

      {rr.customer_notes && rr.customer_notes !== rr.reason && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Notas do Cliente</p>
          <p className="text-sm bg-muted/50 rounded-lg p-3">{rr.customer_notes}</p>
        </div>
      )}

      {rr.admin_notes && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Notas Admin</p>
          <p className="text-sm bg-muted/50 rounded-lg p-3">{rr.admin_notes}</p>
        </div>
      )}

      {rr.items && rr.items.length > 0 && (
        <div>
          <p className="text-muted-foreground text-xs mb-2">Itens Devolvidos</p>
          <div className="space-y-2">
            {rr.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{item.product_name} × {item.quantity}</span>
                </div>
                <span className="font-medium">€{(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rr.stripe_refund_id && (
        <div>
          <p className="text-muted-foreground text-xs mb-1">Ref. Stripe</p>
          <p className="text-xs font-mono">{rr.stripe_refund_id}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
        <div>Criado: {format(new Date(rr.created_at), "dd/MM/yy HH:mm", { locale: pt })}</div>
        {rr.approved_at && <div>Aprovado: {format(new Date(rr.approved_at), "dd/MM/yy HH:mm", { locale: pt })}</div>}
        {rr.rejected_at && <div>Rejeitado: {format(new Date(rr.rejected_at), "dd/MM/yy HH:mm", { locale: pt })}</div>}
        {rr.refunded_at && <div>Reembolsado: {format(new Date(rr.refunded_at), "dd/MM/yy HH:mm", { locale: pt })}</div>}
      </div>
    </div>
  );
}
