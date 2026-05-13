import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Sparkles, MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LEADCHEF_PLANS,
  WHATSAPP_ADDON,
  ANNUAL_PAID_MONTHS,
  formatEuro,
  type LeadChefPlan,
} from "@/config/leadchef/pricing";
import { LEADCHEF_PENDING_CHECKOUT_KEY, type PendingCheckout } from "@/components/leadchef/LeadChefPricingSection";

type Interval = "month" | "year";

export default function LeadChefBillingPage() {
  const [interval, setInterval] = useState<Interval>("month");
  const [withWhatsapp, setWithWhatsapp] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Subscrição ativada com sucesso. Bem-vindo ao LeadChef!");
      const np = new URLSearchParams(searchParams);
      np.delete("status"); np.delete("session_id");
      setSearchParams(np, { replace: true });
    } else if (status === "cancel") {
      toast.info("Checkout cancelado. Podes voltar a tentar a qualquer momento.");
      const np = new URLSearchParams(searchParams);
      np.delete("status");
      setSearchParams(np, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-start checkout vindo da landing pública (?autostart=1 + sessionStorage)
  useEffect(() => {
    if (searchParams.get("autostart") !== "1") return;
    let pending: PendingCheckout | null = null;
    try {
      const raw = sessionStorage.getItem(LEADCHEF_PENDING_CHECKOUT_KEY);
      if (raw) pending = JSON.parse(raw) as PendingCheckout;
    } catch {
      /* noop */
    }
    if (!pending) {
      const np = new URLSearchParams(searchParams);
      np.delete("autostart");
      setSearchParams(np, { replace: true });
      return;
    }
    const plan = LEADCHEF_PLANS.find((p) => p.slug === pending!.plan);
    if (!plan) return;
    setInterval(pending.interval);
    setWithWhatsapp(pending.withWhatsapp);
    sessionStorage.removeItem(LEADCHEF_PENDING_CHECKOUT_KEY);
    const np = new URLSearchParams(searchParams);
    np.delete("autostart");
    setSearchParams(np, { replace: true });
    // Pequeno delay para garantir state aplicado
    setTimeout(() => handleCheckout(plan), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (plan: LeadChefPlan) => {
    try {
      setLoadingPlan(plan.slug);
      const { data, error } = await supabase.functions.invoke("leadchef-create-checkout", {
        body: { plan: plan.slug, interval, withWhatsapp },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Sem URL de checkout");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePortal = async () => {
    try {
      setLoadingPortal(true);
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: {} });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Sem URL do portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <LeadChefMobileShell title="Mensalidade" subtitle="Escolhe o teu plano LeadChef">
      <div className="space-y-6 pb-24">
        {/* Toggle mensal/anual + addon */}
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={interval} onValueChange={(v) => setInterval(v as Interval)}>
              <TabsList>
                <TabsTrigger value="month">Mensal</TabsTrigger>
                <TabsTrigger value="year">
                  Anual <Badge variant="secondary" className="ml-2">2 meses grátis</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Switch id="wa" checked={withWhatsapp} onCheckedChange={setWithWhatsapp} />
              <Label htmlFor="wa" className="cursor-pointer flex items-center gap-1">
                <MessageCircle className="h-4 w-4 text-primary" />
                Add-on WhatsApp <span className="text-muted-foreground">({formatEuro(WHATSAPP_ADDON.monthlyPrice)}/mês)</span>
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Planos */}
        <div className="grid gap-4 md:grid-cols-2">
          {LEADCHEF_PLANS.map((plan) => {
            const monthly = plan.monthlyPrice;
            const total = interval === "year" ? monthly * ANNUAL_PAID_MONTHS : monthly;
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
                className={plan.highlighted ? "border-primary shadow-lg relative" : "relative"}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-2 right-4">
                    <Sparkles className="h-3 w-3 mr-1" /> Recomendado
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatEuro(monthly)}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </div>
                    {interval === "year" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Faturado anualmente: {formatEuro(monthly * ANNUAL_PAID_MONTHS)}
                      </p>
                    )}
                    {withWhatsapp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        + WhatsApp: {formatEuro(WHATSAPP_ADDON.monthlyPrice)}/mês
                      </p>
                    )}
                    <p className="text-xs font-medium mt-2">
                      Total {interval === "year" ? "anual" : "mensal"}: {formatEuro(grandTotal)} <span className="text-muted-foreground">(s/IVA)</span>
                    </p>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => handleCheckout(plan)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A redirecionar…
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

        {/* Gerir subscrição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Já tens subscrição?</CardTitle>
            <CardDescription>
              Acede ao portal seguro para alterar plano, atualizar cartão, ver faturas ou cancelar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handlePortal} disabled={loadingPortal}>
              {loadingPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Gerir subscrição
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Pagamento processado de forma segura por Stripe. Preços sem IVA.
        </p>
      </div>
    </LeadChefMobileShell>
  );
}
