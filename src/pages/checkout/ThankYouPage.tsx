import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, Share2, ArrowRight, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

const sb = supabase as any;

export default function ThankYouPage() {
  const { funnelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) loadSession();
    else setLoading(false);
  }, [sessionId]);

  async function loadSession() {
    try {
      const { data } = await sb.from("checkout_sessions").select("*").eq("id", sessionId).single();
      setSession(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const cartData = session?.cart_data || {};
  const products = cartData.products || [];

  return (
    <>
      <Helmet>
        <title>Compra Concluída!</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-bold">Obrigado pela sua compra! 🎉</h1>
          <p className="mb-8 text-muted-foreground">
            Receberá um email de confirmação em breve em <strong>{session?.customer_email}</strong>
          </p>

          {session && (
            <Card className="mb-8 text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" /> Resumo da Encomenda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {products.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{p.name} × {p.quantity || 1}</span>
                    <span>{(p.price * (p.quantity || 1)).toFixed(2)}€</span>
                  </div>
                ))}

                {(session.upsells_accepted || []).length > 0 && (
                  <div className="pt-2">
                    <Badge variant="secondary" className="mb-2">Ofertas adicionais</Badge>
                    <p className="text-xs text-muted-foreground">{(session.upsells_accepted || []).length} oferta(s) aceite(s)</p>
                  </div>
                )}

                <div className="flex justify-between border-t pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>{(session.total_value || 0).toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => {
              navigator.share?.({ title: "Acabei de comprar!", url: window.location.origin }) || 
              navigator.clipboard.writeText(window.location.origin);
            }}>
              <Share2 className="mr-2 h-4 w-4" /> Partilhar
            </Button>
            <Button asChild>
              <a href="/">
                Continuar a explorar <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
