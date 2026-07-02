import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableItem {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price_net: number;
  vat_rate: number;
  _delete?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  items: Array<any>;
  onSuccess: () => void;
}

export function EditOrderItemsDialog({ open, onOpenChange, orderId, items, onSuccess }: Props) {
  const [rows, setRows] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [overrideGross, setOverrideGross] = useState<number | null>(null);
  const [editingTotal, setEditingTotal] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(
        (items || []).map((it) => ({
          id: it.id,
          product_name: it.product_name,
          product_sku: it.product_sku,
          quantity: Number(it.quantity) || 0,
          unit_price_net: Number(it.unit_price_net) || 0,
          vat_rate: Number(it.vat_rate ?? 23),
        }))
      );
      setOverrideGross(null);
      setEditingTotal(false);
    }
  }, [open, items]);

  const activeRows = rows.filter((r) => !r._delete);
  // Compute two totals: "unrounded" (matches dialog global sum) and "line-rounded" (matches invoice/detail)
  const totals = activeRows.reduce(
    (acc, r) => {
      const net = r.quantity * r.unit_price_net;
      const vat = net * (r.vat_rate / 100);
      const lineNet = +(r.quantity * r.unit_price_net).toFixed(2);
      const lineVat = +(lineNet * (r.vat_rate / 100)).toFixed(2);
      acc.net += net;
      acc.vat += vat;
      acc.lineNet += lineNet;
      acc.lineVat += lineVat;
      acc.lineGross += +(lineNet + lineVat).toFixed(2);
      return acc;
    },
    { net: 0, vat: 0, lineNet: 0, lineVat: 0, lineGross: 0 }
  );
  const computedGross = +(totals.net + totals.vat).toFixed(2);
  const gross = overrideGross ?? computedGross;
  const hasRoundingDiff = Math.abs(totals.lineGross - computedGross) >= 0.01;

  const update = (id: string, patch: Partial<EditableItem>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Deletes
      const toDelete = rows.filter((r) => r._delete).map((r) => r.id);
      if (toDelete.length) {
        const { error } = await supabase.from("order_note_items").delete().in("id", toDelete);
        if (error) throw error;
      }

      // Updates
      for (const r of activeRows) {
        const line_total_net = +(r.quantity * r.unit_price_net).toFixed(2);
        const vat_amount = +(line_total_net * (r.vat_rate / 100)).toFixed(2);
        const line_total_gross = +(line_total_net + vat_amount).toFixed(2);
        const { error } = await supabase
          .from("order_note_items")
          .update({
            quantity: r.quantity,
            unit_price_net: r.unit_price_net,
            vat_rate: r.vat_rate,
            vat_amount,
            line_total_net,
            line_total_gross,
          })
          .eq("id", r.id);
        if (error) throw error;
      }

      // Order totals — use override if defined, else the summed (unrounded) totals
      const finalGross = overrideGross ?? +(totals.net + totals.vat).toFixed(2);
      const finalNet = +totals.net.toFixed(2);
      const finalVat = +(finalGross - finalNet).toFixed(2);
      const { error: orderErr } = await supabase
        .from("order_notes")
        .update({
          total_net: finalNet,
          total_vat: finalVat,
          total_gross: finalGross,
        })
        .eq("id", orderId);
      if (orderErr) throw orderErr;

      toast.success("Valores atualizados com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating order items", err);
      toast.error(err?.message || "Erro ao atualizar valores");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar valores da encomenda</DialogTitle>
          <DialogDescription>
            Ajuste quantidades, preços unitários (s/ IVA) e taxa de IVA. Os totais recalculam automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {activeRows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sem itens. Cancele para manter a encomenda atual.
            </p>
          )}
          {rows.map((r) =>
            r._delete ? null : (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 items-end border border-border rounded-lg p-3"
              >
                <div className="col-span-12 md:col-span-5">
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <p className="text-sm font-medium truncate">{r.product_name}</p>
                  {r.product_sku && (
                    <p className="text-xs text-muted-foreground">SKU: {r.product_sku}</p>
                  )}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={r.quantity}
                    onChange={(e) => update(r.id, { quantity: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Preço s/ IVA</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.unit_price_net}
                    onChange={(e) =>
                      update(r.id, { unit_price_net: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs">IVA %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={r.vat_rate}
                    onChange={(e) => update(r.id, { vat_rate: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => update(r.id, { _delete: true })}
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="col-span-12 text-right text-xs text-muted-foreground">
                  Linha: €{(r.quantity * r.unit_price_net).toFixed(2)} +{" "}
                  €{(r.quantity * r.unit_price_net * (r.vat_rate / 100)).toFixed(2)} IVA
                </div>
              </div>
            )
          )}
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
            <span>€{totals.net.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA</span>
            <span>€{totals.vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1">
            <span>Total</span>
            <span className="text-primary">€{gross.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
