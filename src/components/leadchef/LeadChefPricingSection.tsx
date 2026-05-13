import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LEADCHEF_PLANS,
  WHATSAPP_ADDON,
  ANNUAL_PAID_MONTHS,
  formatEuro,
  type LeadChefPlan,
} from "@/config/leadchef/pricing";

type Interval = "month" | "year";

const PENDING_KEY = "leadchef_pending_checkout";

export interface PendingCheckout {
  plan: "starter" | "growth";
  interval: Interval;
  withWhatsapp: boolean;
}

/**
 * Secção de preços pública para a landing LeadChef.
 * CTA → se autenticado, inicia checkout Stripe diretamente;
 *       se não, guarda intenção em sessionStorage e envia para /auth.
 */
export function LeadChefPricingSection({
  id = "precos",
  className = "",
}: {
  id?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<Interval>("year");
  const [withWhatsapp, setWithWhatsapp] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCta = async (plan: LeadChefPlan) => {
    try {
      setLoadingPlan(plan.slug);
      const { data: sessionData } = await supabase.auth.getSession();
      const pending: PendingCheckout = {
        plan: plan.slug,
        interval,
        withWhatsapp,
      };

      if (!sessionData.session) {
        // Guarda intenção e envia para signup
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        } catch {
          /* storage indisponível — segue na mesma */
        }
        navigate(
          `/auth?mode=signup&plan=leadchef&next=${encodeURIComponent(
            "/dashboard/leadchef/billing?autostart=1"
          )}`
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "leadchef-create-checkout",
        {
          body: {
            plan: plan.slug,
            interval,
            withWhatsapp,
          },
        }
      );
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Sem URL de checkout");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id={id} className={`py-20 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="mr-1 h-3 w-3" /> Preços simples
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Pagas conforme cresces
          </h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            Começa em{" "}
            <strong>{formatEuro(LEADCHEF_PLANS[0].monthlyPrice)}/mês</strong> até
            50 clientes. Quando ultrapassares, passa automaticamente para{" "}
            <strong>{formatEuro(LEADCHEF_PLANS[1].monthlyPrice)}/mês</strong>.
            Sem fidelizações.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Tabs
              value={interval}
              onValueChange={(v) => setInterval(v as Interval)}
            >
              <TabsList>
                <TabsTrigger value="month">Mensal</TabsTrigger>
                <TabsTrigger value="year">
                  Anual{" "}
                  <Badge variant="secondary" className="ml-2">
                    2 meses grátis
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
              <Switch
                id="wa-toggle"
                checked={withWhatsapp}
                onCheckedChange={setWithWhatsapp}
              />
              <Label
                htmlFor="wa-toggle"
                className="cursor-pointer flex items-center gap-1 text-sm"
              >
                <MessageCircle className="h-4 w-4 text-primary" />
                WhatsApp{" "}
                <span className="text-muted-foreground">
                  (+{formatEuro(WHATSAPP_ADDON.monthlyPrice)}/mês)
                </span>
              </Label>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {LEADCHEF_PLANS.map((plan) => {
            const monthly = plan.monthlyPrice;
            const total =
              interval === "year" ? monthly * ANNUAL_PAID_MONTHS : monthly;
            const wa = withWhatsapp
              ? interval === "year"
                ? WHATSAPP_ADDON.monthlyPrice * ANNUAL_PAID_MONTHS
                : WHATSAPP_ADDON.monthlyPrice
              : 0;
            const grandTotal = total + wa;
            const isLoading = loadingPlan === plan.slug;

            return (
              <Card
                key={plan.slug}
                className={
                  plan.highlighted
                    ? "relative border-primary shadow-lg"
                    : "relative"
                }
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Mais escolhido
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums">
                      {formatEuro(monthly)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ mês</span>
                  </div>
                  {interval === "year" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Faturado anualmente:{" "}
                      {formatEuro(monthly * ANNUAL_PAID_MONTHS)} (2 meses grátis)
                    </p>
                  )}
                  {withWhatsapp && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      + WhatsApp: {formatEuro(WHATSAPP_ADDON.monthlyPrice)}/mês
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium">
                    Total {interval === "year" ? "anual" : "mensal"}:{" "}
                    {formatEuro(grandTotal)}{" "}
                    <span className="text-muted-foreground">(s/IVA)</span>
                  </p>

                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => handleCta(plan)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A
                        iniciar checkout…
                      </>
                    ) : (
                      <>Subscrever {plan.name.replace("LeadChef ", "")}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
          Pagamento seguro processado por Stripe. Preços em euros, IVA não
          incluído. Cancela quando quiseres no portal de subscrição.
        </p>
      </div>
    </section>
  );
}

export const LEADCHEF_PENDING_CHECKOUT_KEY = PENDING_KEY;
