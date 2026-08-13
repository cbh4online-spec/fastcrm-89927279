import { useCheckoutOffers } from "@/hooks/useCheckoutOffers";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Gift, Package } from "lucide-react";
import { toast } from "sonner";
import { ProductPickerDialog, catalogGrossPrice } from "@/components/checkout/admin/ProductPickerDialog";

const OFFER_TYPES = [
  { value: "upsell", label: "Upsell" },
  { value: "downsell", label: "Downsell" },
  { value: "cross_sell", label: "Cross-sell" },
  { value: "order_bump", label: "Order Bump" },
  { value: "bundle", label: "Bundle" },
];

export default function CheckoutOffersPage() {
  const { offers, createOffer, deleteOffer } = useCheckoutOffers();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const emptyForm = { name: "", offer_type: "upsell", price: "", headline: "", description: "", cta_text: "Sim! Quero isto!", decline_text: "Não, obrigado", product_id: null as string | null, image_url: null as string | null };
  const [form, setForm] = useState(emptyForm);

  function handleCreate() {
    if (!form.name || !form.price) { toast.error("Preencha nome e preço"); return; }
    createOffer.mutate({ ...form, price: parseFloat(form.price) }, {
      onSuccess: () => { setOpen(false); setForm(emptyForm); },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ofertas</h1>
          <p className="text-muted-foreground">Upsells, downsells, bumps e bundles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Oferta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Oferta</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
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
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.offer_type} onValueChange={(v) => setForm((p) => ({ ...p, offer_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OFFER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preço (€)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={form.headline} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <Button onClick={handleCreate} disabled={createOffer.isPending} className="w-full">
                {createOffer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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

      {offers.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !offers.data?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Gift className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma oferta criada</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offers.data.map((o: any) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{o.name}</CardTitle>
                  <Badge variant="outline">{OFFER_TYPES.find((t) => t.value === o.offer_type)?.label || o.offer_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {o.headline && <p className="text-sm text-muted-foreground">{o.headline}</p>}
                <p className="text-lg font-bold text-primary">{o.price?.toFixed(2)}€</p>
                <div className="flex gap-2">
                  <Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Ativo" : "Inativo"}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => deleteOffer.mutate(o.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
