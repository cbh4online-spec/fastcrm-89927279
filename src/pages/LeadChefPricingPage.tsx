import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ChefHat,
  Check,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  LEADCHEF_PLANS,
  WHATSAPP_ADDON,
  ANNUAL_FREE_MONTHS,
  annualPrice,
  effectiveMonthlyOnAnnual,
  formatEuro,
} from "@/config/leadchef/pricing";

export default function LeadChefPricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Preços LeadChef — Plataforma para Embaixadoras</title>
        <meta
          name="description"
          content="Planos LeadChef: Starter 4,99€/mês até 50 clientes, Growth 6,99€/mês ilimitado. Pagamento anual com 2 meses grátis. Integração WhatsApp opcional 29,99€/mês."
        />
        <link rel="canonical" href="/leadchef/precos" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/leadchef" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-600 text-white">
              <ChefHat className="h-5 w-5" />
            </span>
            <span>LeadChef</span>
          </Link>
          <Link to="/leadchef" className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="container py-12 md:py-16">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" /> Preços simples, sem surpresas
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Pagas conforme o teu número de clientes
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Começa em <strong>{formatEuro(LEADCHEF_PLANS[0].monthlyPrice)}/mês</strong> até 50 clientes.
            Quando ultrapassares 50, a tua conta passa automaticamente para{" "}
            <strong>{formatEuro(LEADCHEF_PLANS[1].monthlyPrice)}/mês</strong>. Sem fidelizações.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border bg-card px-4 py-2">
            <span className={!annual ? "font-medium" : "text-muted-foreground"}>Mensal</span>
            <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Alternar pagamento anual" />
            <span className={annual ? "font-medium" : "text-muted-foreground"}>Anual</span>
            <Badge className="ml-1 bg-emerald-600 text-white hover:bg-emerald-600">
              {ANNUAL_FREE_MONTHS} meses grátis
            </Badge>
          </div>
        </section>

        {/* Plans */}
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          {LEADCHEF_PLANS.map((plan) => {
            const displayPrice = annual
              ? effectiveMonthlyOnAnnual(plan.monthlyPrice)
              : plan.monthlyPrice;
            return (
              <Card
                key={plan.slug}
                className={
                  plan.highlighted
                    ? "relative border-emerald-500 shadow-lg shadow-emerald-100"
                    : "relative"
                }
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white hover:bg-emerald-600">
                    Mais escolhido
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums">
                      {formatEuro(displayPrice)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ mês</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {annual ? (
                      <>
                        Cobrado anualmente {formatEuro(annualPrice(plan.monthlyPrice))} ·
                        equivale a {ANNUAL_FREE_MONTHS} meses grátis
                      </>
                    ) : (
                      <>Cobrado mensalmente · {formatEuro(plan.monthlyPrice)} / mês</>
                    )}
                  </p>

                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={
                      plan.highlighted
                        ? "mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "mt-6 w-full"
                    }
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link to={`/leadchef?plano=${plan.slug}`}>
                      Começar agora <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Auto-upgrade note */}
        <section className="mx-auto mt-8 max-w-3xl rounded-2xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          ℹ️ Começas no <strong>Starter</strong>. Quando ultrapassares 50 clientes ativos, a tua
          conta migra automaticamente para o <strong>Growth</strong> — sem interrupções e sem
          contratos novos para assinar.
        </section>

        {/* WhatsApp add-on */}
        <section className="mt-14">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Add-on opcional
          </h2>
          <p className="mt-2 text-center text-muted-foreground">
            Liga o WhatsApp ao LeadChef para automatizares envios, lembretes e respostas.
          </p>

          <Card className="mx-auto mt-6 max-w-2xl border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{WHATSAPP_ADDON.name}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums">
                        {formatEuro(WHATSAPP_ADDON.monthlyPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">/ mês</div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {WHATSAPP_ADDON.description}
                  </p>
                  <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {WHATSAPP_ADDON.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Cobrado por número ligado. Independente do plano LeadChef.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer */}
        <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
          Preços em euros, IVA não incluído. Pagamento mensal ou anual; o pagamento anual aplica
          {" "}{ANNUAL_FREE_MONTHS} meses grátis (equivale a 10 meses pagos × valor mensal). Cancela
          quando quiseres.
        </p>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" /> LeadChef
          </span>
          <Link to="/leadchef" className="hover:text-foreground">
            Voltar à página inicial
          </Link>
        </div>
      </footer>
    </div>
  );
}
