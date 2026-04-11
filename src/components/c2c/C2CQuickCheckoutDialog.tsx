import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ShoppingBag, Loader2, Truck, MapPin, Package, ShieldCheck, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimate: string;
}

interface C2CQuickCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    photos?: string[] | null;
    delivery_mode?: string;
  };
  workspaceId: string;
  userEmail?: string;
  userName?: string;
  isAuthenticated?: boolean;
}

export function C2CQuickCheckoutDialog({
  open, onOpenChange, listing, workspaceId, userEmail, userName, isAuthenticated,
}: C2CQuickCheckoutDialogProps) {
  const [step, setStep] = useState<"info" | "shipping">(isAuthenticated ? "shipping" : "info");
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [meetupLocation, setMeetupLocation] = useState("");
  const [shippingTab, setShippingTab] = useState<"shipping" | "in_person">(
    listing.delivery_mode === "in_person" ? "in_person" : "shipping"
  );
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deliveryMode = listing.delivery_mode || "both";
  const showShipping = deliveryMode !== "in_person";
  const showMeetup = deliveryMode !== "shipping";

  useEffect(() => {
    if (open && showShipping) {
      setLoadingShipping(true);
      supabase.functions.invoke("calculate-shipping", { body: { totalWeightKg: 0.5 } })
        .then(({ data }) => {
          if (data?.options) setShippingOptions(data.options);
        })
        .catch(() => {})
        .finally(() => setLoadingShipping(false));
    }
  }, [open, showShipping]);

  useEffect(() => {
    if (!open) {
      setStep(isAuthenticated ? "shipping" : "info");
      setSelectedShipping(null);
      setMeetupLocation("");
      setShippingTab(listing.delivery_mode === "in_person" ? "in_person" : "shipping");
    }
  }, [open, isAuthenticated, listing.delivery_mode]);

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
  const shippingCost = shippingTab === "in_person" ? 0 : (selectedOption?.price || 0);
  const total = listing.price + shippingCost;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const infoValid = name.trim().length > 0 && emailRegex.test(email.trim());
  const shippingValid = shippingTab === "in_person" || !!selectedShipping;

  const handleCheckout = async () => {
    if (!shippingValid) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        listingId: listing.id,
        workspaceId,
        buyerEmail: email.trim(),
        buyerName: name.trim(),
        shippingMethod: shippingTab === "in_person" ? "in_person" : selectedShipping,
        shippingPrice: shippingCost,
        shippingCarrier: selectedOption?.name || "",
        meetupLocation: shippingTab === "in_person" ? meetupLocation : undefined,
      };

      const { data, error } = await supabase.functions.invoke("create-c2c-checkout", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto border-gray-200 bg-white text-gray-900 rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <ShoppingBag className="h-5 w-5 text-[#09B1BA]" />
            Comprar Agora
          </DialogTitle>
          <DialogDescription className="truncate text-gray-500">
            {listing.title}
          </DialogDescription>
        </DialogHeader>

        {/* Order summary */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5">
          <div className="flex items-center gap-3">
            {listing.photos?.[0] && (
              <img src={listing.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">{listing.title}</p>
              <p className="text-lg font-bold text-[#09B1BA]">{listing.price.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        {/* Step 1: Buyer info */}
        {step === "info" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-gray-600">Nome *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="O teu nome"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-600">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <Button className="w-full bg-[#09B1BA] hover:bg-[#078E96] text-white" onClick={() => setStep("shipping")} disabled={!infoValid}>
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2: Shipping */}
        {step === "shipping" && (
          <div className="space-y-3">
            {showShipping && showMeetup && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setShippingTab("shipping"); setSelectedShipping(null); }}
                  className={`flex-1 text-xs py-2.5 px-3 rounded-lg border transition-all font-medium ${shippingTab === "shipping" ? "bg-[#09B1BA]/10 border-[#09B1BA] text-[#09B1BA]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <Package className="h-4 w-4 inline mr-1.5" /> Envio
                </button>
                <button
                  onClick={() => { setShippingTab("in_person"); setSelectedShipping(null); }}
                  className={`flex-1 text-xs py-2.5 px-3 rounded-lg border transition-all font-medium ${shippingTab === "in_person" ? "bg-[#09B1BA]/10 border-[#09B1BA] text-[#09B1BA]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  <MapPin className="h-4 w-4 inline mr-1.5" /> Entrega em mão
                </button>
              </div>
            )}

            {shippingTab === "shipping" && showShipping && (
              loadingShipping ? (
                <div className="flex items-center justify-center py-6 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> A carregar opções...
                </div>
              ) : (
                <RadioGroup value={selectedShipping || ""} onValueChange={setSelectedShipping}>
                  {shippingOptions.map(opt => (
                    <div
                      key={opt.id}
                      className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${selectedShipping === opt.id ? "border-[#09B1BA] bg-[#09B1BA]/5 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <RadioGroupItem value={opt.id} id={`co-${opt.id}`} />
                      <Label htmlFor={`co-${opt.id}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{opt.name}</p>
                            <p className="text-xs text-gray-400">{opt.estimate}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-800">{opt.price.toFixed(2)}€</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )
            )}

            {shippingTab === "in_person" && showMeetup && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Combina o local de entrega com o vendedor.</p>
                <Input
                  placeholder="Local sugerido (ex: Lisboa, estação X...)"
                  value={meetupLocation}
                  onChange={e => setMeetupLocation(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                />
                <div className="flex items-center gap-1.5 text-xs text-[#09B1BA] font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Entrega gratuita
                </div>
              </div>
            )}

            {/* Total */}
            <div className="rounded-lg border border-gray-200 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Artigo</span>
                <span className="text-gray-800">{listing.price.toFixed(2)}€</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Envio</span>
                  <span className="text-gray-800">{shippingCost.toFixed(2)}€</span>
                </div>
              )}
              {shippingTab === "in_person" && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Envio</span>
                  <span className="text-[#09B1BA] font-medium">Grátis</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-1 flex justify-between font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-[#09B1BA]">{total.toFixed(2)}€</span>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-[#09B1BA]" /> Pagamento seguro</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-[#09B1BA]" /> Stripe</span>
            </div>

            {/* Back + Buy */}
            <div className="flex gap-2">
              {!isAuthenticated && (
                <Button variant="outline" onClick={() => setStep("info")} className="flex-shrink-0 border-gray-200 text-gray-800 hover:bg-gray-100">
                  Voltar
                </Button>
              )}
              <Button
                className="flex-1 h-12 text-base font-semibold bg-[#09B1BA] hover:bg-[#078E96] text-white"
                onClick={handleCheckout}
                disabled={submitting || !shippingValid}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ShoppingBag className="h-5 w-5 mr-2" />
                )}
                Pagar {total.toFixed(2)}€
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
