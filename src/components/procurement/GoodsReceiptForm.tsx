import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { usePurchaseOrders } from "@/hooks/useProcurement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

export function GoodsReceiptForm({ open, onOpenChange, workspaceId, onSave }: Props) {
  const { t } = useTranslation("procurement");
  const { data: orders = [] } = usePurchaseOrders(workspaceId);
  const [selectedPO, setSelectedPO] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptItems, setReceiptItems] = useState<{ order_item_id: string; quantity_received: number; description: string; max: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const activePOs = (orders as any[]).filter(o => ["sent", "confirmed", "partial"].includes(o.status));

  useEffect(() => {
    if (selectedPO) {
      const po = (orders as any[]).find(o => o.id === selectedPO);
      if (po?.items) {
        setReceiptItems(po.items.map((item: any) => ({
          order_item_id: item.id,
          quantity_received: 0,
          description: item.description,
          max: item.quantity - (item.received_quantity || 0),
        })));
      }
    }
  }, [selectedPO, orders]);

  const handleSubmit = async () => {
    if (!selectedPO || !workspaceId) return;
    const validItems = receiptItems.filter(i => i.quantity_received > 0);
    if (!validItems.length) return;
    setSaving(true);
    try {
      // Use edge function for atomic receipt + stock + cost update
      const { data, error } = await supabase.functions.invoke("procurement-receive-items", {
        body: {
          workspace_id: workspaceId,
          purchase_order_id: selectedPO,
          items: validItems.map(({ order_item_id, quantity_received }) => ({ order_item_id, quantity_received })),
          notes: notes || undefined,
        },
      });
      if (error) throw error;
      toast.success("Receção registada");
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao registar receção");
    }
    setSaving(false);
    setSelectedPO("");
    setNotes("");
    setReceiptItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("newReceipt")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("selectPO")}</Label>
            <Select value={selectedPO} onValueChange={setSelectedPO}>
              <SelectTrigger><SelectValue placeholder={t("selectPO")} /></SelectTrigger>
              <SelectContent>
                {activePOs.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.po_number} — {o.supplier?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {receiptItems.length > 0 && (
            <div className="space-y-2">
              <Label>{t("items")}</Label>
              {receiptItems.map((item, i) => (
                <div key={item.order_item_id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate">{item.description}</span>
                  <span className="text-muted-foreground text-xs">max: {item.max}</span>
                  <Input
                    type="number"
                    className="w-20"
                    min={0}
                    max={item.max}
                    value={item.quantity_received}
                    onChange={(e) => {
                      const updated = [...receiptItems];
                      updated[i].quantity_received = Math.min(Number(e.target.value), item.max);
                      setReceiptItems(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div><Label>{t("notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !selectedPO}>
            {saving ? "A registar..." : t("newReceipt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
