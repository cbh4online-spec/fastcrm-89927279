import { useCheckoutOffers } from "@/hooks/useCheckoutOffers";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2, Gift } from "lucide-react";
import { OfferFormDialog, OFFER_TYPES } from "@/components/checkout/admin/OfferFormDialog";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

export default function CheckoutOffersPage() {
  const { offers, deleteOffer } = useCheckoutOffers();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <CheckoutBackHeader title="Ofertas" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ofertas</h1>
          <p className="text-muted-foreground">Upsells, downsells, bumps e bundles</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Oferta
        </Button>
      </div>

      <OfferFormDialog open={open} onOpenChange={setOpen} />

      {offers.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !offers.data?.length ? (
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Gift className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma oferta criada</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar primeira oferta
          </Button>
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
                <p className="text-lg font-bold text-primary">{Number(o.price ?? 0).toFixed(2)}€</p>
                <div className="flex gap-2">
                  <Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Ativo" : "Inativo"}</Badge>
                  <Button size="sm" variant="ghost" aria-label="Eliminar oferta" onClick={() => deleteOffer.mutate(o.id)}>
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
