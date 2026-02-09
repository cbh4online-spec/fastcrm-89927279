import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Lock, Package, ShoppingBag, Loader2, User, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function StoreCheckoutPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { items, subtotal, clearCart } = useStoreCart();
  const wsSlug = workspaceSlug || "";
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    // Basic phone validation
    const phoneClean = formData.phone.replace(/\s/g, "");
    if (phoneClean.length < 9) {
      toast.error("Número de telefone inválido");
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

          <h1 className="text-2xl font-bold mb-8">Checkout</h1>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Form */}
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Informações de contacto</h2>
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
                  </div>
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
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={isProcessing}
              >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {isProcessing ? "A redirecionar para o Stripe..." : "Pagar com Stripe"}
              </Button>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" />
                Pagamento seguro processado pelo Stripe
              </p>
            </form>

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
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">€{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
