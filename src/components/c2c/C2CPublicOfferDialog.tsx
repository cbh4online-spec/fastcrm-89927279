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
import { useCreateC2CPublicOffer } from "@/hooks/useC2CPublicOffers";

interface C2CPublicOfferDialogProps {
  listingId: string;
  listingTitle: string;
  originalPrice: number;
  currency: string;
  workspaceId: string;
  sellerId: string;
  trigger?: React.ReactNode;
}

export function C2CPublicOfferDialog({
  listingId,
  listingTitle,
  originalPrice,
  currency,
  workspaceId,
  sellerId,
  trigger,
}: C2CPublicOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const createOffer = useCreateC2CPublicOffer();

  const minPrice = originalPrice * 0.5;
  const offeredPrice = parseFloat(price);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid =
    name.trim().length > 0 &&
    emailRegex.test(email.trim()) &&
    !isNaN(offeredPrice) &&
    offeredPrice >= minPrice;

  const handleSubmit = () => {
    if (!isValid) return;
    createOffer.mutate(
      {
        workspace_id: workspaceId,
        listing_id: listingId,
        seller_id: sellerId,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        offered_price: offeredPrice,
        original_price: originalPrice,
        currency,
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setEmail("");
          setPhone("");
          setPrice("");
          setMessage("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="w-full gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 h-12 text-base font-semibold"
          >
            <HandCoins className="h-5 w-5" />
            Fazer Oferta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <HandCoins className="h-5 w-5 text-amber-400" />
            Fazer Oferta
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Proponha o seu preço para <strong className="text-zinc-200">{listingTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-baseline gap-2 text-sm text-zinc-400">
            <span>Preço atual:</span>
            <span className="font-semibold text-amber-400 text-lg">{originalPrice.toFixed(0)}€</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O seu nome"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Telefone (opcional)</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 912 345 678"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">A sua oferta (€) *</Label>
            <Input
              type="number"
              step="0.01"
              min={minPrice}
              max={originalPrice}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`Mínimo ${minPrice.toFixed(0)}€`}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            {price && offeredPrice < minPrice && (
              <p className="text-xs text-red-400">Oferta mínima: {minPrice.toFixed(0)}€ (50% do preço)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Mensagem (opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique a sua oferta..."
              rows={2}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-semibold h-11"
            onClick={handleSubmit}
            disabled={!isValid || createOffer.isPending}
          >
            {createOffer.isPending ? "A enviar..." : `Enviar Oferta — ${offeredPrice ? offeredPrice.toFixed(0) : "0"}€`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
