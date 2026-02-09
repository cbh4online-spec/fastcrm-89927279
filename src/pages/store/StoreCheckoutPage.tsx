import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Lock, Package, ShoppingBag, Loader2, User, Phone, Mail, ChevronRight, CheckCircle2, Ticket, X, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useActiveShippingMethods } from "@/hooks/useShippingMethods";

export default function StoreCheckoutPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { items, subtotal, clearCart } = useStoreCart();
  const wsSlug = workspaceSlug || "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<string>("");
  const { data: shippingMethods = [] } = useActiveShippingMethods(wsSlug);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const isStep1Valid = () => {
    if (!formData.name.trim() || !formData.phone.trim()) return false;
    const phoneClean = formData.phone.replace(/\s/g, "");
    return phoneClean.length >= 9;
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Preencha o nome");
      return;
    }
    const phoneClean = formData.phone.replace(/\s/g, "");
    if (phoneClean.length < 9) {
      toast.error("Número de telefone inválido");
      return;
    }
    setStep(2);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_coupons")
        .select("code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_until, is_active")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        toast.error("Cupão inválido");
        return;
      }
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("Cupão esgotado");
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast.error("Cupão expirado");
        return;
      }
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        toast.error(`Encomenda mínima de €${data.min_order_amount.toFixed(2)}`);
        return;
      }
      setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
      setCouponCode("");
      toast.success("Cupão aplicado!");
    } finally {
      setCouponLoading(false);
    }
  };

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? subtotal * (appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;
  
  const selectedShipping = shippingMethods.find((m) => m.id === selectedShippingId);
  const shippingCost = selectedShipping?.base_price ?? 0;
  // Free shipping threshold check
  const effectiveShippingCost = selectedShipping?.free_shipping_threshold && subtotal >= selectedShipping.free_shipping_threshold ? 0 : shippingCost;
  const finalTotal = subtotal - discountAmount + effectiveShippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      toast.error("Preencha o email");
      return;
    }
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-store-checkout", {
        body: {
          workspaceId: wsSlug,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
          })),
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone || undefined,
          couponCode: appliedCoupon?.code || undefined,
          shippingMethodId: selectedShippingId || undefined,
          shippingCost: effectiveShippingCost,
          shippingMethodName: selectedShipping?.name || undefined,
          successUrl: `${window.location.origin}/store/${wsSlug}/success`,
          cancelUrl: `${window.location.origin}/store/${wsSlug}/cancel`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar checkout";
      toast.error(message);
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Carrinho vazio</h2>
          <p className="text-muted-foreground mb-4">Adicione produtos antes de finalizar.</p>
          <Link to={`/store/${wsSlug}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à Loja
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout | Loja</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to={`/store/${wsSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Voltar à Loja
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              step === 1 ? "text-primary" : "text-muted-foreground"
            )}>
              {step > 1 ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              )}
              <button type="button" onClick={() => step === 2 && setStep(1)} className={step === 2 ? "hover:underline cursor-pointer" : ""}>
                Dados pessoais
              </button>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              step === 2 ? "text-primary" : "text-muted-foreground"
            )}>
              <span className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>2</span>
              Pagamento
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Step content */}
            <div className="md:col-span-3">
              {step === 1 ? (
                <form onSubmit={handleStep1Continue} className="space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Identificação</h2>
                    <p className="text-sm text-muted-foreground">Precisamos do seu contacto para atualizações da encomenda</p>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Nome completo *
                        </Label>
                        <Input
                          id="name"
                          placeholder="O seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          Telefone *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+351 912 345 678"
                          value={formData.phone}
                          onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Para podermos contactar sobre a sua encomenda</p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2" disabled={!isStep1Valid()}>
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Summary of step 1 data */}
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Os seus dados</h3>
                      <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Editar</button>
                    </div>
                    <p className="text-sm">{formData.name}</p>
                    <p className="text-sm text-muted-foreground">{formData.phone}</p>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Email para recibo</h2>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="o-seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        required
                        autoFocus
                      />
                  </div>

                  {/* Shipping method selection */}
                  {shippingMethods.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Truck className="h-5 w-5" /> Método de Envio
                      </h2>
                      <RadioGroup value={selectedShippingId} onValueChange={setSelectedShippingId}>
                        {shippingMethods.map((method) => {
                          const isFree = method.free_shipping_threshold && subtotal >= method.free_shipping_threshold;
                          return (
                            <div key={method.id} className={cn(
                              "flex items-center justify-between border rounded-lg p-3 cursor-pointer transition-colors",
                              selectedShippingId === method.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                            )} onClick={() => setSelectedShippingId(method.id)}>
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={method.id} />
                                <div>
                                  <p className="text-sm font-medium">{method.name}</p>
                                  {method.estimated_delivery && (
                                    <p className="text-xs text-muted-foreground">{method.estimated_delivery}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium">
                                {isFree ? (
                                  <span className="text-green-600">Grátis</span>
                                ) : (
                                  <span>€{method.base_price.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2"
                    disabled={isProcessing || !formData.email.trim()}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {isProcessing ? "A redirecionar para o Stripe..." : "Pagar com Stripe"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" />
                    Pagamento seguro processado pelo Stripe
                  </p>
                </form>
              )}
            </div>

            {/* Order Summary */}
            <div className="md:col-span-2">
              <div className="border rounded-xl p-5 space-y-4 sticky top-24">
                <h2 className="font-semibold">Resumo da encomenda</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3">
                      <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <Separator />

                {/* Coupon */}
                {step === 2 && (
                  <div className="space-y-2">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">{appliedCoupon.code}</span>
                          <Badge variant="secondary" className="text-xs">
                            -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `€${appliedCoupon.discount_value.toFixed(2)}`}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAppliedCoupon(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código de cupão"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="text-sm"
                        />
                        <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                          Aplicar
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {(appliedCoupon || effectiveShippingCost > 0) && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto</span>
                        <span>-€{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {effectiveShippingCost > 0 && selectedShipping && (
                      <div className="flex justify-between text-sm">
                        <span>Envio ({selectedShipping.name})</span>
                        <span>€{effectiveShippingCost.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedShipping && effectiveShippingCost === 0 && shippingCost > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Envio</span>
                        <span>Grátis</span>
                      </div>
                    )}
                  </>
                )}

                <Separator />
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">€{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
