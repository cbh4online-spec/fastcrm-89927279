import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  usePartnerOrderApprovals,
  type PendingPartnerOrder,
} from "@/hooks/partner/usePartnerOrderApprovals";
import { usePartnerOrderApprovalHistory } from "@/hooks/partner/usePartnerOrderApprovalHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Package,
  Inbox,
  ChevronDown,
  ChevronUp,
  History,
  Ban,
} from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

type DecisionDialog = {
  order: PendingPartnerOrder;
  decision: "approved" | "rejected";
} | null;

export default function B2BOrderApprovalsPage() {
  const { orders, isLoading, decide, isDeciding } = usePartnerOrderApprovals();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DecisionDialog>(null);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!dialog) return;
    await decide({ orderId: dialog.order.id, decision: dialog.decision, reason: reason.trim() || undefined });
    setDialog(null);
    setReason("");
  };

  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Aprovação de Encomendas B2B</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Encomendas do Partner Center que aguardam decisão. Aprovar confirma o stock reservado; rejeitar liberta-o automaticamente.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {orders.length} pendente{orders.length === 1 ? "" : "s"}
          </Badge>
        </header>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pendentes ({orders.length})</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-0">

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sem encomendas pendentes</p>
              <p className="text-sm">Todas as encomendas B2B foram processadas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = !!expanded[order.id];
              const account = order.partner_accounts;
              const creditAvailable = account
                ? account.credit_limit - account.current_credit_exposure
                : 0;
              const creditExceeded = account
                ? account.credit_limit > 0 &&
                  account.current_credit_exposure + order.subtotal_net > account.credit_limit
                : false;

              const stockIssues = order.partner_order_items.filter((item) => {
                const v = item.product_variants;
                if (!v || !v.track_stock) return false;
                const available = v.stock_quantity - v.stock_reserved;
                // se a reserva já cobre esta linha, está OK; problema é só se available < quantity
                // Nota: como já reservámos, available pode estar reduzido pela própria reserva.
                // Mostramos apenas casos em que stock_quantity < quantity.
                return v.stock_quantity < item.quantity;
              });

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {order.order_number}
                          <Badge variant="outline" className="text-xs">
                            {order.partner_order_items.length} {order.partner_order_items.length === 1 ? "linha" : "linhas"}
                          </Badge>
                          {order.stock_reserved && (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                              Stock reservado
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {account?.trade_name || account?.legal_name || "—"} ·{" "}
                          {formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                            locale: pt,
                          })}
                          {order.po_number && ` · PO: ${order.po_number}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{formatMoneyEur(order.total_gross)}</p>
                        <p className="text-xs text-muted-foreground">
                          Subtotal: {formatMoneyEur(order.subtotal_net)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {creditExceeded && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Limite de crédito ultrapassado. Disponível: {formatMoneyEur(creditAvailable)}.
                        </AlertDescription>
                      </Alert>
                    )}

                    {stockIssues.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {stockIssues.length} linha(s) com stock insuficiente para cobrir a reserva. Aprovar irá colocar o stock em backorder.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(order.id)}
                      className="w-full justify-between text-xs h-8"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5" />
                        {isExpanded ? "Ocultar" : "Ver"} itens e impacto em stock
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>

                    {isExpanded && (
                      <div className="border rounded-md divide-y">
                        {order.partner_order_items.map((item) => {
                          const v = item.product_variants;
                          const available = v ? v.stock_quantity - v.stock_reserved : null;
                          const insufficient = v?.track_stock && v.stock_quantity < item.quantity;
                          return (
                            <div key={item.id} className="p-3 text-xs flex items-start justify-between gap-3">
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-medium truncate">
                                  {item.product_name}
                                  {item.variant_label && (
                                    <span className="text-muted-foreground"> · {item.variant_label}</span>
                                  )}
                                </p>
                                <p className="text-muted-foreground">
                                  SKU: {item.sku || "—"} · Qtd: {item.quantity} ×{" "}
                                  {formatMoneyEur(item.unit_price_net)}
                                </p>
                                {v && v.track_stock && (
                                  <p className={insufficient ? "text-destructive" : "text-muted-foreground"}>
                                    Stock: {v.stock_quantity} total · {v.stock_reserved} reservado · {available} disponível
                                  </p>
                                )}
                                {v && !v.track_stock && (
                                  <p className="text-muted-foreground">Stock não controlado</p>
                                )}
                              </div>
                              <span className="font-medium whitespace-nowrap">
                                {formatMoneyEur(item.line_total_net)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
                        "{order.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialog({ order, decision: "rejected" });
                          setReason("");
                        }}
                        disabled={isDeciding}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setDialog({ order, decision: "approved" });
                          setReason("");
                        }}
                        disabled={isDeciding || creditExceeded}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Aprovar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialog?.decision === "approved" ? "Aprovar encomenda" : "Rejeitar encomenda"}
              </DialogTitle>
              <DialogDescription>
                {dialog?.decision === "approved" ? (
                  <>
                    A encomenda <strong>{dialog?.order.order_number}</strong> será confirmada e o stock reservado será movido para venda real.
                  </>
                ) : (
                  <>
                    A encomenda <strong>{dialog?.order.order_number}</strong> será rejeitada e o stock reservado será libertado automaticamente.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivo {dialog?.decision === "rejected" && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                placeholder={
                  dialog?.decision === "approved"
                    ? "Notas internas (opcional)"
                    : "Indique o motivo da rejeição (visível para o parceiro)"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isDeciding}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isDeciding || (dialog?.decision === "rejected" && !reason.trim())}
                variant={dialog?.decision === "rejected" ? "destructive" : "default"}
              >
                {isDeciding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar {dialog?.decision === "approved" ? "aprovação" : "rejeição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
