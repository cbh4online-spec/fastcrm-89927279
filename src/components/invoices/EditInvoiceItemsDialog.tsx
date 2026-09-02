import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { InvoiceProductSelector } from "./InvoiceProductSelector";
import { InvoiceItemsCart, type InvoiceCartItem } from "./InvoiceItemsCart";
import { useInvoiceItems, useUpdateInvoiceItems, type Invoice } from "@/hooks/useInvoices";
import type { Product } from "@/types/product";

interface EditInvoiceItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

import {
  computeTotals,
  distributeTargetTotal,
  round2,
  unitPriceFromLineTotal,
} from "@/lib/invoices/reverseTotals";


const formatEur = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

export function EditInvoiceItemsDialog({ open, onOpenChange, invoice }: EditInvoiceItemsDialogProps) {
  const { data: items, isLoading } = useInvoiceItems(open ? invoice.id : undefined);
  const updateItems = useUpdateInvoiceItems();

  const [cart, setCart] = useState<InvoiceCartItem[]>([]);
  const [baseline, setBaseline] = useState<InvoiceCartItem[]>([]);
  const [adjusted, setAdjusted] = useState(false);
  const [totalDraft, setTotalDraft] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [freeName, setFreeName] = useState("");
  const [freePrice, setFreePrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setDiscountAmount(invoice.discount_amount || 0);
    setFreeName("");
    setFreePrice("");
    setAdjusted(false);
    setTotalDraft(null);
  }, [open, invoice.discount_amount]);

  useEffect(() => {
    if (!open || !items) return;
    const mapped: InvoiceCartItem[] = items.map((item) => ({
      id: item.id,
      product_id: item.product_id || undefined,
      name: item.description,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount_percent: Number(item.discount_percent) || 0,
      tax_rate: Number(item.tax_rate) ?? 23,
    }));
    setCart(mapped);
    setBaseline(mapped);
  }, [open, items]);

  const selectedProductIds = useMemo(
    () => cart.map((item) => item.product_id).filter(Boolean) as string[],
    [cart]
  );

  const totals = useMemo(() => computeTotals(cart, discountAmount), [cart, discountAmount]);

  const alreadyPaid = round2(invoice.amount_paid || 0);
  const diff = round2(totals.total - (invoice.total || 0));
  const belowPaid = alreadyPaid > 0 && totals.total < alreadyPaid;

  const handleLineTotal = (id: string, lineTotalGross: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const price = unitPriceFromLineTotal(item, lineTotalGross);
        if (price === null) {
          toast.error("Não é possível deduzir o preço desta linha (quantidade ou desconto).");
          return item;
        }
        return { ...item, unit_price: price };
      })
    );
    setAdjusted(true);
  };

  const applyTargetTotal = (raw: string) => {
    setTotalDraft(null);
    const target = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(target)) return;
    if (round2(target) === totals.total) return;
    if (alreadyPaid > 0 && target < alreadyPaid) {
      toast.error("O total não pode ser inferior ao valor já pago");
      return;
    }
    const result = distributeTargetTotal(cart, discountAmount, round2(target));
    if (!result.ok) {
      toast.error(
        result.reason === "no_base"
          ? "Precisa de pelo menos uma linha com valor para distribuir o total"
          : "Indique um total válido"
      );
      return;
    }
    setCart(result.items);
    setAdjusted(true);
  };

  const handleReset = () => {
    setCart(baseline);
    setDiscountAmount(invoice.discount_amount || 0);
    setAdjusted(false);
    setTotalDraft(null);
  };


  const handleAddProduct = (product: Product) => {
    setCart((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        product_id: product.id,
        name: product.name,
        description: product.name,
        quantity: 1,
        unit_price: product.base_price || 0,
        discount_percent: 0,
        tax_rate: 23,
      },
    ]);
  };

  const handleRemoveProduct = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const handleAddFreeItem = () => {
    const price = parseFloat(freePrice.replace(",", "."));
    if (!freeName.trim()) {
      toast.error("Indique a descrição do item");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Indique um preço válido");
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        name: freeName.trim(),
        description: freeName.trim(),
        quantity: 1,
        unit_price: price,
        discount_percent: 0,
        tax_rate: 23,
      },
    ]);
    setFreeName("");
    setFreePrice("");
  };

  const patch = (id: string, changes: Partial<InvoiceCartItem>) =>
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error("A fatura tem de ter pelo menos um item");
      return;
    }
    const invalid = cart.find(
      (item) =>
        !item.description.trim() ||
        item.quantity <= 0 ||
        item.unit_price < 0 ||
        item.discount_percent < 0 ||
        item.discount_percent > 100 ||
        item.tax_rate < 0 ||
        item.tax_rate > 100
    );
    if (invalid) {
      toast.error(`Valores inválidos no item "${invalid.name || "sem descrição"}"`);
      return;
    }
    if (belowPaid) {
      toast.error("O total não pode ser inferior ao valor já pago");
      return;
    }

    await updateItems.mutateAsync({
      invoiceId: invoice.id,
      discount_amount: round2(discountAmount || 0),
      items: cart.map((item) => ({
        id: item.id.startsWith("new-") ? undefined : item.id,
        product_id: item.product_id || null,
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_rate: item.tax_rate,
      })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar itens da fatura #{invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            Adicione produtos do catálogo, corrija quantidades, preços, descontos e IVA. Os totais são
            recalculados ao gravar.
          </DialogDescription>
        </DialogHeader>

        {invoice.status !== "draft" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta fatura já foi emitida — alterar os itens muda o valor em dívida e os indicadores
              financeiros.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Catálogo de produtos
            </Label>
            <InvoiceProductSelector
              selectedProductIds={selectedProductIds}
              onAddProduct={handleAddProduct}
              onRemoveProduct={handleRemoveProduct}
            />
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Adicionar item livre
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Descrição do serviço"
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                  maxLength={300}
                />
                <Input
                  className="w-28"
                  placeholder="0,00"
                  value={freePrice}
                  onChange={(e) => setFreePrice(e.target.value)}
                  inputMode="decimal"
                />
                <Button type="button" variant="outline" onClick={handleAddFreeItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Itens da fatura
            </Label>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <InvoiceItemsCart
                items={cart}
                onUpdateQuantity={(id, quantity) => patch(id, { quantity })}
                onUpdatePrice={(id, unit_price) => patch(id, { unit_price })}
                onUpdateDiscount={(id, discount_percent) => patch(id, { discount_percent })}
                onUpdateTaxRate={(id, tax_rate) => patch(id, { tax_rate })}
                onRemoveItem={(id) => setCart((prev) => prev.filter((item) => item.id !== id))}
                onClear={() => setCart([])}
              />
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="global-discount" className="text-sm">
                  Desconto global (€)
                </Label>
                <Input
                  id="global-discount"
                  className="w-32 h-8 text-right"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal s/IVA</span>
                <span>{formatEur(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatEur(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total c/IVA</span>
                <span>{formatEur(totals.total)}</span>
              </div>
              {diff !== 0 && (
                <p className="text-xs text-muted-foreground">
                  Diferença face ao valor atual ({formatEur(invoice.total || 0)}):{" "}
                  <span className={diff > 0 ? "text-destructive" : "text-primary"}>
                    {diff > 0 ? "+" : ""}
                    {formatEur(diff)}
                  </span>
                </p>
              )}
              {alreadyPaid > 0 && (
                <p className="text-xs text-muted-foreground">Já pago: {formatEur(alreadyPaid)}</p>
              )}
              {belowPaid && (
                <p className="text-xs text-destructive">
                  O total não pode ficar abaixo do valor já pago.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateItems.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateItems.isPending || belowPaid || isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {updateItems.isPending ? "A guardar…" : "Guardar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
