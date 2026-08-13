import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutForm, CheckoutFormData } from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { OrderBumpCard } from "@/components/checkout/OrderBumpCard";
import { CountdownTimer } from "@/components/checkout/CountdownTimer";
import { ScarcityIndicator } from "@/components/checkout/ScarcityIndicator";
import { TrustBadges } from "@/components/checkout/TrustBadges";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

export default function CheckoutPage() {
  const { funnelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<any>(null);
  const [bumps, setBumps] = useState<any[]>([]);
  const [acceptedBumps, setAcceptedBumps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadFunnel();
  }, [funnelSlug]);

  async function loadFunnel() {
    try {
      const { data: funnelData } = await (supabase as any).from("checkout_funnels").select("*").eq("slug", funnelSlug).eq("is_active", true).single();
      if (!funnelData) { toast.error("Checkout não encontrado"); return; }
      setFunnel(funnelData);

      const { data: bumpData } = await (supabase as any).from("checkout_order_bumps")
        .select("*, offer:checkout_offers(*)")
        .eq("funnel_id", funnelData.id)
        .eq("is_active", true)
        .order("display_order");
      setBumps(bumpData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleBumpToggle(offerId: string, accepted: boolean) {
    setAcceptedBumps((prev) => {
      const next = new Set(prev);
      if (accepted) next.add(offerId); else next.delete(offerId);
      return next;
    });
  }

  async function handleSubmit(formData: CheckoutFormData) {
    if (!funnel) return;
    if (subtotal <= 0) { toast.error("O total deve ser superior a zero"); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("checkout-create-session", {
        body: {
          funnelId: funnel.id,
          workspaceId: funnel.workspace_id,
          customerEmail: formData.email,
          customerName: formData.name,
          phone: formData.phone,
          shippingAddress: formData.address ? {
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
          } : undefined,
          acceptedBumps: Array.from(acceptedBumps),
          utmSource: searchParams.get("utm_source"),
          utmMedium: searchParams.get("utm_medium"),
          utmCampaign: searchParams.get("utm_campaign"),
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else toast.error("Erro ao criar sessão de pagamento");
    } catch (e: any) {
      toast.error(e.message || "Erro no checkout");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  if (!funnel) return (
    <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Checkout não disponível</p></div>
  );

  const settings = funnel.settings || {};
  const items = (Array.isArray(settings.products) && settings.products.length
    ? settings.products
    : [{ name: funnel.name, quantity: 1, price: settings.price || 0 }]) as any[];
  const bumpItems = bumps.filter((b) => acceptedBumps.has(b.offer?.id)).map((b) => ({ name: b.offer.name, quantity: 1, price: b.offer.price }));
  const itemsTotal = items.reduce((s: number, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const subtotal = itemsTotal + bumpItems.reduce((s: number, b: any) => s + (Number(b.price) || 0), 0);

  if (itemsTotal <= 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Checkout indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este checkout ainda não tem produtos com preço definido. Contacte o vendedor.
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>{funnel.name} - Checkout</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-8 text-center text-2xl font-bold">{funnel.name}</h1>

          {settings.countdown_seconds && (
            <div className="mb-6">
              <CountdownTimer seconds={settings.countdown_seconds} />
            </div>
          )}

          {settings.scarcity_text && (
            <div className="mb-6">
              <ScarcityIndicator text={settings.scarcity_text} />
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <CheckoutForm onSubmit={handleSubmit} isLoading={processing} showShipping={settings.require_shipping !== false} />

              {bumps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">Ofertas Especiais</h3>
                  {bumps.map((bump) => bump.offer && (
                    <OrderBumpCard key={bump.id} offer={bump.offer} onToggle={handleBumpToggle} />
                  ))}
                </div>
              )}

              <TrustBadges />
            </div>

            <div className="lg:col-span-2">
              <div className="sticky top-8">
                <OrderSummary items={items} bumps={bumpItems} subtotal={subtotal} total={subtotal} currency={settings.currency || "EUR"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
