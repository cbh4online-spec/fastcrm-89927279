import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/checkout/CountdownTimer";
import { TrustBadges } from "@/components/checkout/TrustBadges";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Shield, Star } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const sb = supabase as any;

export default function UpsellPage() {
  const { funnelSlug, offerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [offerId]);

  async function loadOffer() {
    try {
      const { data } = await sb.from("checkout_offers").select("*").eq("id", offerId).single();
      setOffer(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(accepted: boolean) {
    if (!sessionId || !offerId || !offer) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("checkout-process-upsell", {
        body: { sessionId, offerId, accepted, workspaceId: offer.workspace_id },
      });
      if (error) throw error;
      if (data?.nextUrl) navigate(data.nextUrl);
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!offer) return <div className="flex min-h-screen items-center justify-center"><p>Oferta não encontrada</p></div>;

  const savings = offer.compare_at_price ? offer.compare_at_price - offer.price : 0;
  const bullets = offer.bullet_points || [];
  const testimonials = offer.testimonials || [];

  return (
    <>
      <Helmet>
        <title>{offer.headline || offer.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12">
          {/* Urgency */}
          {offer.countdown_seconds && (
            <div className="mb-8">
              <CountdownTimer seconds={offer.countdown_seconds} label="Esta oferta exclusiva expira em" />
            </div>
          )}

          {/* Headline */}
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-4 text-xs uppercase">Oferta Exclusiva Pós-Compra</Badge>
            <h1 className="text-3xl font-bold md:text-4xl">{offer.headline || offer.name}</h1>
            {offer.subheadline && <p className="mt-3 text-lg text-muted-foreground">{offer.subheadline}</p>}
          </div>

          {/* Media */}
          {offer.video_url ? (
            <div className="mb-8 overflow-hidden rounded-xl">
              <iframe src={offer.video_url} className="aspect-video w-full" allowFullScreen />
            </div>
          ) : offer.image_url ? (
            <div className="mb-8 overflow-hidden rounded-xl">
              <img src={offer.image_url} alt={offer.name} className="w-full object-cover" />
            </div>
          ) : null}

          {/* Description */}
          {offer.description && <p className="mb-8 text-center text-muted-foreground">{offer.description}</p>}

          {/* Bullets */}
          {bullets.length > 0 && (
            <div className="mb-8 space-y-3">
              {bullets.map((b: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mb-8 rounded-xl border bg-card p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              {offer.compare_at_price && (
                <span className="text-2xl text-muted-foreground line-through">{offer.compare_at_price.toFixed(2)}€</span>
              )}
              <span className="text-4xl font-bold text-primary">{offer.price.toFixed(2)}€</span>
            </div>
            {savings > 0 && (
              <p className="mt-2 text-sm font-medium text-green-600">Poupas {savings.toFixed(2)}€!</p>
            )}
          </div>

          {/* Testimonials */}
          {testimonials.length > 0 && (
            <div className="mb-8 space-y-4">
              {testimonials.map((t: any, i: number) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {t.avatar && <img src={t.avatar} alt="" className="h-8 w-8 rounded-full" />}
                    <span className="font-medium">{t.name}</span>
                    <div className="flex">{[...Array(t.rating || 5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Guarantee */}
          {offer.guarantee_text && (
            <div className="mb-8 flex items-start gap-3 rounded-lg border bg-card p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm">{offer.guarantee_text}</p>
            </div>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full text-lg"
              onClick={() => handleDecision(true)}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {offer.cta_text || "Sim! Adicionar à minha encomenda"}
            </Button>
            <button
              className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => handleDecision(false)}
              disabled={processing}
            >
              {offer.decline_text || "Não, obrigado. Não quero esta oferta."}
            </button>
          </div>

          <TrustBadges />
        </div>
      </div>
    </>
  );
}
