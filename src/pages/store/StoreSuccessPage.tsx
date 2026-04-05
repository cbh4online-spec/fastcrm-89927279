import { useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck } from "lucide-react";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { trackEvent } from "@/lib/analytics";

export default function StoreSuccessPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const wsSlug = workspaceSlug || "";
  const orderId = searchParams.get("order_id") || undefined;
  const { trackCheckoutCompleted } = useCRMAnalytics();

  useEffect(() => {
    trackCheckoutCompleted({
      plan_type: searchParams.get('plan') || 'store_purchase',
      billing_cycle: searchParams.get('billing') || 'one_time',
    });
    trackEvent("purchase_success_page_view", { workspaceSlug: wsSlug, orderId });
  }, []);

  const { data: order } = useQuery({
    queryKey: ["success-order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, order_number, status")
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return (
    <>
      <Helmet>
        <title>Compra Confirmada | Loja</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Compra Confirmada!</h1>
          <p className="text-muted-foreground mb-2">
            Obrigado pela sua compra. Receberá um email com os detalhes da encomenda.
          </p>

          {order && (
            <div className="my-6 rounded-lg border bg-card p-4 text-left space-y-2">
              <p className="text-sm text-muted-foreground">
                Encomenda nº <span className="font-semibold text-foreground">{order.order_number}</span>
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-8">
            Se tiver alguma dúvida, entre em contacto connosco.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {order && (
              <Link to={`/store/${wsSlug}/order/${order.id}`}>
                <Button className="gap-2 w-full sm:w-auto">
                  <Truck className="h-4 w-4" />
                  Acompanhar Encomenda
                </Button>
              </Link>
            )}
            <Link to={`/store/${wsSlug}`}>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Package className="h-4 w-4" />
                Continuar a Comprar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
