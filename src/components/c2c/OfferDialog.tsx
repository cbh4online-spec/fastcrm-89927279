import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateOffer } from "@/hooks/useC2COffers";
import { HandCoins, Loader2 } from "lucide-react";

interface OfferDialogProps {
  listingId: string;
  sellerId: string;
  currentPrice: number;
  currency: string;
  workspaceId: string;
  trigger?: React.ReactNode;
}

export function OfferDialog({ listingId, sellerId, currentPrice, currency, workspaceId, trigger }: OfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState(String(Math.round(currentPrice * 0.85)));
  const [message, setMessage] = useState("");
  const createOffer = useCreateOffer(workspaceId);

  const handleSubmit = async () => {
    const price = Number(offerPrice);
    if (!price || price <= 0) return;
    await createOffer.mutateAsync({ listingId, sellerId, offerPrice: price, message: message || undefined });
    setOpen(false);
    setOfferPrice(String(Math.round(currentPrice * 0.85)));
    setMessage("");
  };

  const discount = currentPrice > 0 ? Math.round((1 - Number(offerPrice) / currentPrice) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full gap-2" size="lg">
            <HandCoins className="h-4 w-4" />
            Fazer Oferta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Fazer uma Oferta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground">
            Preço atual: <span className="font-bold text-foreground">{currentPrice.toFixed(2)} {currency}</span>
          </div>

          <div>
            <Label htmlFor="offer-price">A tua oferta ({currency})</Label>
            <Input
              id="offer-price"
              type="number"
              min="1"
              step="0.01"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              className="mt-1"
            />
            {discount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {discount}% abaixo do preço pedido
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="offer-message">Mensagem (opcional)</Label>
            <Textarea
              id="offer-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Adiciona uma mensagem ao vendedor..."
              rows={3}
              className="mt-1"
            />
          </div>

          <Button onClick={handleSubmit} disabled={createOffer.isPending || !Number(offerPrice)} className="w-full">
            {createOffer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar Oferta — {Number(offerPrice).toFixed(2)} {currency}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
