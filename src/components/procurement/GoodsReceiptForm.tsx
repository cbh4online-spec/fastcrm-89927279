import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useCallback } from "react";
import { usePurchaseOrders, useGoodsReceipts } from "@/hooks/useProcurement";
import { useQueryClient } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { BarcodeScannerModal } from "@/components/barcode/BarcodeScannerModal";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string;
  onSave: (values: any) => Promise<void>;
}

export function GoodsReceiptForm({ open, onOpenChange, workspaceId }: Props) {
  const { t } = useTranslation("procurement");
  const { data: orders = [] } = usePurchaseOrders(workspaceId);
  const { create: createReceipt } = useGoodsReceipts(workspaceId);
  const qc = useQueryClient();
  const [selectedPO, setSelectedPO] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptItems, setReceiptItems] = useState<{ order_item_id: string; quantity_received: number; description: string; max: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleBarcodeScan = useCallback((barcode: string) => {
    // Find matching item in receipt by checking PO items descriptions or product barcodes
    const matchIdx = receiptItems.findIndex(
      (item) => item.description?.toLowerCase().includes(barcode.toLowerCase())
    );
    if (matchIdx >= 0) {
      const updated = [...receiptItems];
      updated[matchIdx].quantity_received = Math.min(
        updated[matchIdx].quantity_received + 1,
        updated[matchIdx].max
      );
      setReceiptItems(updated);
      toast.success(`+1 ${updated[matchIdx].description}`);
    } else {
      toast.warning(`Código ${barcode} não encontrado nos items desta PO`);
    }
  }, [receiptItems]);

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
      await createReceipt({
        purchase_order_id: selectedPO,
        items: validItems.map(({ order_item_id, quantity_received }) => ({ order_item_id, quantity_received })),
        notes: notes || undefined,
      });
      onOpenChange(false);
    } catch {
      // error handled by hook
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
              <Button size="sm" variant="outline" onClick={() => setScannerOpen(true)} className="ml-2">
                <ScanLine className="h-3 w-3 mr-1" /> Scan
              </Button>
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
        <BarcodeScannerModal
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleBarcodeScan}
        />
      </DialogContent>
    </Dialog>
  );
}
