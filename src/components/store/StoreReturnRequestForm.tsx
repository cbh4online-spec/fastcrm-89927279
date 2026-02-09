import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Loader2, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const REASON_CATEGORIES: Record<string, string> = {
  defective: "Produto com defeito",
  wrong_item: "Produto errado enviado",
  not_as_described: "Diferente da descrição",
  changed_mind: "Mudança de ideias",
  duplicate: "Encomenda duplicada",
  other: "Outro",
};

interface OrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface StoreReturnRequestFormProps {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  orderStatus: string;
  orderItems: OrderItem[];
  workspaceId: string;
}

export function StoreReturnRequestForm({
  orderId,
  orderNumber,
  orderTotal,
  orderStatus,
  orderItems,
  workspaceId,
}: StoreReturnRequestFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnType, setReturnType] = useState<"full" | "partial">("full");
  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});

  const canRequest = ["paid", "processing", "shipped", "delivered"].includes(orderStatus);
  if (!canRequest) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);

    try {
      const { data: rr, error } = await supabase
        .from("return_requests")
        .insert({
          workspace_id: workspaceId,
          order_id: orderId,
          return_type: returnType,
          reason,
          reason_category: reasonCategory || null,
          customer_notes: reason,
          refund_amount: returnType === "partial" && refundAmount ? parseFloat(refundAmount) : orderTotal,
          requested_by: "client",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items for partial returns
      if (returnType === "partial") {
        const items = orderItems
          .filter((_, i) => selectedItems[i])
          .map(item => ({
            return_request_id: rr.id,
            product_id: item.product_id || null,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }));

        if (items.length > 0) {
          await supabase.from("return_request_items").insert(items);
        }
      }

      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["store-order-history"] });
      toast.success("Pedido de devolução enviado com sucesso");
    } catch (err) {
      toast.error("Erro ao enviar pedido: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        Pedido de devolução submetido. Será contactado em breve.
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Pedir Devolução
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedir Devolução — #{orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Devolução</Label>
            <Select value={returnType} onValueChange={(v) => setReturnType(v as "full" | "partial")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Devolução Total</SelectItem>
                <SelectItem value="partial">Devolução Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {returnType === "partial" && (
            <div className="space-y-2">
              <Label>Selecione os itens a devolver</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {orderItems.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedItems[i] || false}
                      onChange={(e) => setSelectedItems(prev => ({ ...prev, [i]: e.target.checked }))}
                      className="rounded"
                    />
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{item.name} × {item.quantity}</span>
                    <span className="text-sm text-muted-foreground">€{(item.unit_price * item.quantity).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o problema com mais detalhe..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!reason.trim() || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Enviar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
