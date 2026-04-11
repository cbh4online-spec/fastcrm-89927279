import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
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
  listingId, listingTitle, originalPrice, currency, workspaceId, sellerId, trigger,
}: C2CPublicOfferDialogProps) {
  const { t } = useTranslation('marketplace');
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
  const isValid = name.trim().length > 0 && emailRegex.test(email.trim()) && !isNaN(offeredPrice) && offeredPrice >= minPrice;

  const handleSubmit = () => {
    if (!isValid) return;
    createOffer.mutate(
      {
        workspace_id: workspaceId, listing_id: listingId, seller_id: sellerId,
        customer_name: name.trim(), customer_email: email.trim(),
        customer_phone: phone.trim() || undefined, offered_price: offeredPrice,
        original_price: originalPrice, currency, message: message.trim() || undefined,
      },
      { onSuccess: () => { setOpen(false); setName(""); setEmail(""); setPhone(""); setPrice(""); setMessage(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full gap-2 border-[#09B1BA]/30 text-[#09B1BA] hover:bg-[#09B1BA]/10 hover:text-[#078E96] h-12 text-base font-semibold">
            <HandCoins className="h-5 w-5" />
            {t('makeOffer')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-gray-200 text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <HandCoins className="h-5 w-5 text-[#09B1BA]" />
            {t('makeOffer')}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {t('yourProposal')} — <strong className="text-gray-800">{listingTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-baseline gap-2 text-sm text-gray-500">
            <span>{t('currentPrice')}:</span>
            <span className="font-semibold text-[#09B1BA] text-lg">{originalPrice.toFixed(0)}€</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-600">{t('personalInfo').split(' ')[0]} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('sellerNamePlaceholder')} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-600">Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600">{t('phone')} ({t('offerMessage').replace(t('offerMessage'), 'opcional')})</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600">{t('yourOffer')} (€) *</Label>
            <Input type="number" step="0.01" min={minPrice} max={originalPrice} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`Mínimo ${minPrice.toFixed(0)}€`} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
            {price && offeredPrice < minPrice && (
              <p className="text-xs text-red-500">Oferta mínima: {minPrice.toFixed(0)}€ (50%)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-600">{t('offerMessage')}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('offerMessagePlaceholder')} rows={2} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" />
          </div>

          <Button className="w-full bg-[#09B1BA] hover:bg-[#078E96] text-white font-semibold h-11" onClick={handleSubmit} disabled={!isValid || createOffer.isPending}>
            {createOffer.isPending ? t('submitting') : `${t('sendOffer')} — ${offeredPrice ? offeredPrice.toFixed(0) : "0"}€`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
