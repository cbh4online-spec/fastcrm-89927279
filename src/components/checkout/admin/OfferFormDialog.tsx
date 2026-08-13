import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useCheckoutOffers } from "@/hooks/useCheckoutOffers";
import { ProductPickerDialog, catalogGrossPrice } from "@/components/checkout/admin/ProductPickerDialog";

export const OFFER_TYPES = [
  { value: "upsell", label: "Upsell" },
  { value: "downsell", label: "Downsell" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "order_bump", label: "Order Bump" },
  { value: "bundle", label: "Bundle" },
];

function emptyForm(offerType: string) {
  return {
    name: "",
    offer_type: offerType,
    price: "",
    headline: "",
    description: "",
    cta_text: "Sim! Quero isto!",
    decline_text: "Não, obrigado",
    product_id: null as string | null,
    image_url: null as string | null,
  };
}

interface OfferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOfferType?: string;
  onCreated?: (offer: any) => void;
}

export function OfferFormDialog({ open, onOpenChange, defaultOfferType = "upsell", onCreated }: OfferFormDialogProps) {
  const { createOffer } = useCheckoutOffers();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(defaultOfferType));

  useEffect(() => {
    if (open) setForm(emptyForm(defaultOfferType));
  }, [open, defaultOfferType]);

  function handleCreate() {
    if (!form.name.trim()) { toast.error("Indique o nome da oferta"); return; }
    const price = parseFloat(form.price);
    if (!Number.isFinite(price) || price < 0) { toast.error("Indique um preço válido"); return; }
    createOffer.mutate(
      { ...form, name: form.name.trim(), price },
      {
        onSuccess: (offer: any) => {
          onOpenChange(false);
          onCreated?.(offer);
        },
      },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar oferta</DialogTitle>
            <DialogDescription>
              Uma oferta é um produto adicional apresentado ao cliente: no próprio checkout (order bump) ou depois do
              pagamento (upsell e, se recusar, downsell).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {form.product_id ? `Ligado ao catálogo: ${form.name}` : "Sem produto do catálogo"}
                </p>
                <p className="text-xs text-muted-foreground">Herda nome, preço com IVA e imagem.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                <Package className="mr-2 h-4 w-4" /> Escolher
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="offer-name">Nome</Label>
                <Input id="offer-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-type">Tipo</Label>
                <Select value={form.offer_type} onValueChange={(v) => setForm((p) => ({ ...p, offer_type: v }))}>
                  <SelectTrigger id="offer-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-price">Preço (€)</Label>
              <Input
                id="offer-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-headline">Headline</Label>
              <Input id="offer-headline" value={form.headline} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-description">Descrição</Label>
              <Textarea id="offer-description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <Button onClick={handleCreate} disabled={createOffer.isPending} className="w-full">
              {createOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Associar produto à oferta"
        onSelect={(product) => setForm((p) => ({
          ...p,
          name: p.name || product.name,
          price: String(catalogGrossPrice(product)),
          description: p.description || product.short_description || "",
          product_id: product.id,
          image_url: product.image_url,
        }))}
      />
    </>
  );
}
