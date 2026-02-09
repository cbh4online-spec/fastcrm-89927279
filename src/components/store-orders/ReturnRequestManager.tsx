import { useState } from "react";
import {
  useReturnRequestsByOrder,
  useCreateReturnRequest,
  useProcessReturn,
  RETURN_STATUS_CONFIG,
  RETURN_REASON_CATEGORIES,
} from "@/hooks/useReturnRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, CheckCircle2, XCircle, Loader2, Plus, Package } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  sku?: string;
}

interface ReturnRequestManagerProps {
  orderId: string;
  orderItems: OrderItem[];
  orderTotal: number;
  orderStatus: string;
}

export function ReturnRequestManager({ orderId, orderItems, orderTotal, orderStatus }: ReturnRequestManagerProps) {
  const { data: returns = [], isLoading } = useReturnRequestsByOrder(orderId);
  const createReturn = useCreateReturnRequest();
  const processReturn = useProcessReturn();

  const [createOpen, setCreateOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Create form state
  const [returnType, setReturnType] = useState<"full" | "partial">("full");
  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; qty: number }>>({});

  const canCreateReturn = ["paid", "processing", "shipped", "delivered"].includes(orderStatus);

  const handleCreate = () => {
    const items = returnType === "partial"
      ? orderItems
          .filter((_, i) => selectedItems[i]?.selected)
          .map((item, i) => ({
            product_id: item.product_id,
            product_name: item.name,
            quantity: selectedItems[Object.keys(selectedItems).find(k => selectedItems[k]?.selected) ? i : i]?.qty || item.quantity,
            unit_price: item.unit_price,
          }))
      : undefined;

    const amount = returnType === "partial" && refundAmount ? parseFloat(refundAmount) : returnType === "full" ? orderTotal : undefined;

    createReturn.mutate(
      {
        orderId,
        returnType,
        reason,
        reasonCategory: reasonCategory || undefined,
        refundAmount: amount,
        items,
        requestedBy: "admin",
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setReturnType("full");
    setReasonCategory("");
    setReason("");
    setRefundAmount("");
    setSelectedItems({});
  };

  const handleProcess = (returnRequestId: string, action: "approve" | "reject") => {
    processReturn.mutate(
      { returnRequestId, action, adminNotes },
      { onSuccess: () => { setProcessOpen(null); setAdminNotes(""); } }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Devoluções
          <Badge variant="secondary" className="ml-auto">{returns.length}</Badge>
          {canCreateReturn && (
            <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar Pedido de Devolução</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Devolução</Label>
                    <Select value={returnType} onValueChange={(v) => setReturnType(v as "full" | "partial")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Reembolso Total (€{orderTotal.toFixed(2)})</SelectItem>
                        <SelectItem value="partial">Reembolso Parcial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {returnType === "partial" && (
                    <>
                      <div className="space-y-2">
                        <Label>Itens a devolver</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {orderItems.map((item, i) => (
                            <label key={i} className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                              <input
                                type="checkbox"
                                checked={selectedItems[i]?.selected || false}
                                onChange={(e) => setSelectedItems(prev => ({
                                  ...prev,
                                  [i]: { selected: e.target.checked, qty: prev[i]?.qty || item.quantity }
                                }))}
                                className="rounded"
                              />
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 text-sm">{item.name}</span>
                              <span className="text-sm text-muted-foreground">€{item.unit_price.toFixed(2)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor do Reembolso (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          max={orderTotal}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder={`Máx: €${orderTotal.toFixed(2)}`}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Categoria do Motivo</Label>
                    <Select value={reasonCategory} onValueChange={setReasonCategory}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RETURN_REASON_CATEGORIES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo / Observações</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Descrever o motivo da devolução..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={!reason.trim() || createReturn.isPending}>
                    {createReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                    Criar Pedido
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : returns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem pedidos de devolução</p>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => {
              const statusConf = RETURN_STATUS_CONFIG[ret.status] || { label: ret.status, color: "bg-muted" };
              return (
                <div key={ret.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{ret.request_number}</span>
                      <Badge variant="outline" className={cn("text-xs", statusConf.color)}>{statusConf.label}</Badge>
                      <Badge variant="secondary" className="text-xs">{ret.return_type === "full" ? "Total" : "Parcial"}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ret.created_at), "dd/MM/yyyy", { locale: pt })}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">{ret.reason}</p>

                  {ret.refund_amount && (
                    <p className="text-sm font-medium">Valor: €{ret.refund_amount.toFixed(2)}</p>
                  )}

                  {ret.stripe_refund_id && (
                    <p className="text-xs text-muted-foreground font-mono">Stripe: {ret.stripe_refund_id}</p>
                  )}

                  {ret.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Dialog open={processOpen === ret.id} onOpenChange={(o) => { setProcessOpen(o ? ret.id : null); setAdminNotes(""); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="default" className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aprovar Devolução {ret.request_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <p className="text-sm">
                              Será processado um reembolso de <strong>€{(ret.refund_amount || orderTotal).toFixed(2)}</strong> via Stripe.
                            </p>
                            <div className="space-y-2">
                              <Label>Notas internas (opcional)</Label>
                              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setProcessOpen(null)}>Cancelar</Button>
                            <Button onClick={() => handleProcess(ret.id, "approve")} disabled={processReturn.isPending}>
                              {processReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                              Confirmar Reembolso
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => handleProcess(ret.id, "reject")}
                        disabled={processReturn.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
