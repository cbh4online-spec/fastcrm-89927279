import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateStoreOffer } from "@/hooks/useStoreOffers";

interface StoreOfferDialogProps {
  productId: string;
  productName: string;
  originalPrice: number;
  currency: string;
  workspaceId: string;
}

export function StoreOfferDialog({
  productId,
  productName,
  originalPrice,
  currency,
  workspaceId,
}: StoreOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const createOffer = useCreateStoreOffer();

  const minPrice = originalPrice * 0.5;
  const offeredPrice = parseFloat(price);
  const isValid = name.trim() && email.trim() && !isNaN(offeredPrice) && offeredPrice >= minPrice;

  const handleSubmit = () => {
    if (!isValid) return;
    createOffer.mutate(
      {
        workspace_id: workspaceId,
        product_id: productId,
        customer_email: email.trim(),
        customer_name: name.trim(),
        offered_price: offeredPrice,
        original_price: originalPrice,
        currency,
        message: message.trim() || undefined,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
          <HandCoins className="h-4 w-4" />
          Fazer Oferta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Fazer Oferta
          </DialogTitle>
          <DialogDescription>
            Proponha o seu preço para <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
            <span>Preço atual:</span>
            <span className="font-semibold text-foreground text-lg">€{originalPrice.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>A sua oferta (€)</Label>
            <Input
              type="number"
              step="0.01"
              min={minPrice}
              max={originalPrice}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`Mínimo €${minPrice.toFixed(2)}`}
            />
            {price && offeredPrice < minPrice && (
              <p className="text-xs text-destructive">Oferta mínima: €{minPrice.toFixed(2)} (50% do preço)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique a sua oferta..."
              rows={2}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!isValid || createOffer.isPending}
          >
            {createOffer.isPending ? "A enviar..." : "Enviar Oferta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
