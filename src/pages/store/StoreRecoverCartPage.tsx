import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart, AlertTriangle, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { getStoreCartStore } from "@/stores/useStoreCartStore";
import { toast } from "sonner";

export default function StoreRecoverCartPage() {
  const { workspaceSlug, token } = useParams<{ workspaceSlug: string; token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (token && workspaceSlug) loadCart();
  }, [token, workspaceSlug]);

  async function loadCart() {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("store-recover-cart", {
        body: { token, workspaceSlug },
      });
      if (fnError) throw fnError;
      if (result?.error) {
        setError(result.error);
        if (result.expired) setExpired(true);
        return;
      }
      setData(result);
    } catch (e: any) {
      setError(e?.message || "Erro ao recuperar carrinho");
    } finally {
      setLoading(false);
    }
  }

  const handleRestore = async () => {
    if (!data?.items?.length || !workspaceSlug) return;
    setRestoring(true);

    try {
      const store = getStoreCartStore(workspaceSlug);
      const state = store.getState();

      // Clear existing cart and add recovered items
      state.clearCart();

      for (const item of data.items) {
        state.addItem(
          {
            productId: item.productId,
            name: item.name,
            price: item.price,
            currency: data.currency || "EUR",
            image: item.image,
            sku: item.sku,
          },
          item.quantity,
        );
      }

      // Record cart_restored event (non-blocking)
      supabase.functions.invoke("store-recover-cart", {
        body: { token, workspaceSlug, action: "restored" },
      }).catch(() => {});

      if (data.unavailable_items?.length > 0) {
        toast.warning(`${data.unavailable_items.length} produto(s) já não estão disponíveis`);
      } else {
        toast.success("Carrinho recuperado!");
      }

      navigate(`/store/${workspaceSlug}/checkout?abandoned_cart_id=${data.cart_id}`);
    } catch {
      toast.error("Erro ao restaurar carrinho");
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet><title>Recuperar Carrinho</title><meta name="robots" content="noindex, nofollow" /></Helmet>
        <div className="min-h-screen bg-background">
          <StoreHeader workspaceSlug={workspaceSlug || ""} />
          <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium text-center">{error}</p>
            {expired && (
              <p className="text-sm text-muted-foreground text-center">
                Este link de recuperação expirou. Contacte-nos se precisar de ajuda.
              </p>
            )}
            <Button variant="outline" onClick={() => navigate(`/store/${workspaceSlug}`)}>
              Voltar à Loja
            </Button>
          </div>
        </div>
      </>
    );
  }

  const items = data?.items || [];
  const unavailable = data?.unavailable_items || [];
  const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);

  return (
    <>
      <Helmet><title>Recuperar Carrinho</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={workspaceSlug || ""} />
        <div className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <ShoppingCart className="mx-auto mb-2 h-10 w-10 text-primary" />
              <CardTitle>O teu carrinho está à tua espera!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 border rounded-lg p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Unavailable items warning */}
              {unavailable.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <PackageX className="h-4 w-4" />
                    {unavailable.length} produto(s) indisponível(eis)
                  </div>
                  {unavailable.map((item: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground ml-6">{item.name}</p>
                  ))}
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">€{subtotal.toFixed(2)}</span>
              </div>

              {/* Restore button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleRestore}
                disabled={restoring || items.length === 0}
              >
                {restoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Continuar Compra
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
