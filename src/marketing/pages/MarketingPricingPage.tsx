import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { MARKETING_PLANS, ENTERPRISE_PLAN } from "@/marketing/data/pricingPlans";
import { MarketingFaqSection } from "@/marketing/components/MarketingFaqSection";

export default function MarketingPricingPage() {
  return (
    <>
      <Helmet>
        <title>Preços · FastCRM</title>
        <meta name="description" content="Planos transparentes para PME portuguesas. Trial gratuito, sem cartão." />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/precos" />
        <meta property="og:title" content="Preços · FastCRM" />
        <meta property="og:description" content="Planos transparentes para PME portuguesas. Trial gratuito, sem cartão." />
        <meta property="og:image" content="https://fastcrm.metodopare.ai/og/og-precos.jpg" />
        <meta property="og:url" content="https://fastcrm.metodopare.ai/precos" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://fastcrm.metodopare.ai/og/og-precos.jpg" />
      </Helmet>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Preços</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Planos transparentes. Sem surpresas.
          </h1>
          <p className="text-lg text-muted-foreground">
            14 dias de trial. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {MARKETING_PLANS.map((p) => (
            <div
              key={p.slug}
              className={`rounded-2xl border p-8 flex flex-col ${
                p.highlight ? "border-primary bg-primary/5 relative" : "border-border bg-card"
              }`}
            >
              {p.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{p.badge}</Badge>
              )}
              <h3 className="text-2xl font-semibold mb-2">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{p.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{p.price}</span>
                <p className="text-xs text-muted-foreground mt-1">{p.sub}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "default" : "outline"}>
                <Link to={p.ctaHref}>{p.ctaLabel}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="max-w-6xl mx-auto rounded-2xl border border-border bg-card p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <Badge variant="outline" className="mb-3">Enterprise</Badge>
            <h3 className="text-2xl font-semibold mb-2">{ENTERPRISE_PLAN.description}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {ENTERPRISE_PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-center md:text-right">
            <Button size="lg" asChild>
              <Link to={ENTERPRISE_PLAN.ctaHref}>{ENTERPRISE_PLAN.ctaLabel}</Link>
            </Button>
          </div>
        </div>

        <div className="text-center mt-16 text-sm text-muted-foreground">
          <p>Todos os planos incluem suporte em português, atualizações automáticas e backup diário.</p>
        </div>
      </section>
      <MarketingFaqSection title="Perguntas frequentes sobre planos e preços" />
    </>
  );
}
