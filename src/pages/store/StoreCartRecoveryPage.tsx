import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowRight, Loader2, Clock, Package } from "lucide-react";
import { Helmet } from "react-helmet-async";

const sb = supabase as any;

export default function StoreCartRecoveryPage() {
  const { workspaceSlug, cartId } = useParams<{ workspaceSlug: string; cartId: string }>();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cartId) loadCart();
    else setLoading(false);
  }, [cartId]);

  async function loadCart() {
    try {
      const { data, error: fetchError } = await sb
        .from("abandoned_carts")
        .select("*")
        .eq("id", cartId)
        .single();

      if (fetchError || !data) {
        setError("Carrinho não encontrado ou expirado.");
        return;
      }

      if (data.recovery_status === "expired") {
        setError("Este carrinho já expirou.");
        return;
      }

      if (data.recovery_status === "recovered") {
        setError("Este carrinho já foi recuperado.");
        return;
      }

      setCart(data);

      // Mark as recovered
      await sb
        .from("abandoned_carts")
        .update({
          recovery_status: "recovered",
          recovered_at: new Date().toISOString(),
          recovery_channel: "direct",
        })
        .eq("id", cartId);
    } catch {
      setError("Erro ao carregar o carrinho.");
    } finally {
      setLoading(false);
    }
  }

  // Resolve workspace slug for store link
  const storeUrl = workspaceSlug ? `/store/${workspaceSlug}` : "/";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !cart) {
    return (
      <>
        <Helmet>
          <title>Carrinho não disponível</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="min-h-screen bg-background">
          {workspaceSlug && <StoreHeader workspaceSlug={workspaceSlug} />}
          <div className="mx-auto max-w-lg px-4 py-20 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h1 className="mb-2 text-xl font-semibold">{error || "Carrinho não encontrado"}</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              O seu carrinho pode ter expirado ou já ter sido processado.
            </p>
            <Button asChild>
              <a href={storeUrl}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Visitar a Loja
              </a>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const items = Array.isArray(cart.cart_items) ? cart.cart_items : [];

  return (
    <>
      <Helmet>
        <title>Recuperar Carrinho</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background">
        {workspaceSlug && <StoreHeader workspaceSlug={workspaceSlug} />}
        <div className="mx-auto max-w-lg px-4 py-12">
          <div className="mb-6 text-center">
            <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">O seu carrinho está de volta! 🎉</h1>
            <p className="text-sm text-muted-foreground">
              Recuperámos os seus produtos. Finalize a sua compra agora.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Os seus produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name || item.productName || "Produto"}</p>
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity || 1}</p>
                  </div>
                  <Badge variant="secondary">
                    {((item.price || 0) * (item.quantity || 1)).toFixed(2)}€
                  </Badge>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Total</span>
                <span>{Number(cart.cart_value || 0).toFixed(2)}€</span>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" asChild>
            <a href={`${storeUrl}/checkout`}>
              Finalizar Compra
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ao clicar, será redirecionado para o checkout seguro.
          </p>
        </div>
      </div>
    </>
  );
}
