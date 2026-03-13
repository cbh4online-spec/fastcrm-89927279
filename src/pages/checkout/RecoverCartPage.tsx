import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

const sb = supabase as any;

export default function RecoverCartPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadCart();
  }, [token]);

  async function loadCart() {
    try {
      const { data } = await sb.from("checkout_abandoned_carts")
        .select("*, funnel:checkout_funnels(slug)")
        .eq("recovery_token", token)
        .single();
      setCart(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!cart) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Link de recuperação inválido ou expirado</p>
      <Button onClick={() => navigate("/")}>Voltar ao início</Button>
    </div>
  );

  const funnelSlug = cart.funnel?.slug;
  const discountInfo = cart.discount_code ? ` (Desconto: ${cart.discount_code} — ${cart.discount_amount?.toFixed(2)}€)` : "";

  return (
    <>
      <Helmet><title>Recuperar Carrinho</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShoppingCart className="mx-auto mb-2 h-10 w-10 text-primary" />
            <CardTitle>O teu carrinho está à tua espera!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Valor: <strong>{(cart.total_value || 0).toFixed(2)}€</strong>{discountInfo}
            </p>
            <Button className="w-full" size="lg" onClick={() => {
              const url = funnelSlug ? `/checkout/${funnelSlug}?recover=${token}` : "/";
              navigate(url);
            }}>
              Continuar Compra
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
