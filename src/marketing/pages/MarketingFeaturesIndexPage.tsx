import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { PILLARS } from "@/marketing/data/modules";

export default function MarketingFeaturesIndexPage() {
  return (
    <>
      <Helmet>
        <title>Funcionalidades · FastCRM</title>
        <meta name="description" content="CRM, AI SDR, Marketing e Comércio — tudo integrado numa única plataforma." />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/funcionalidades" />
        <meta property="og:title" content="Funcionalidades FastCRM — 4 pilares numa plataforma" />
        <meta property="og:description" content="CRM, AI SDR, Marketing e Comércio integrados. Explore os módulos que automatizam a sua operação comercial." />
        <meta property="og:url" content="https://fastcrm.metodopare.ai/funcionalidades" />
        <meta property="og:type" content="website" />
      </Helmet>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            4 pilares. Uma plataforma. Zero ferramentas dispersas.
          </h1>
          <p className="text-lg text-muted-foreground">
            Tudo o que a sua equipa precisa para captar, qualificar, vender e renovar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.slug}
                to={`/funcionalidades/${p.slug}`}
                className="group rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{p.label}</Badge>
                </div>
                <h2 className="text-xl font-semibold mb-2">{p.tagline}</h2>
                <p className="text-muted-foreground mb-6">{p.description}</p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {p.modules.slice(0, 4).map((m) => (
                    <div key={m.title} className="text-sm text-muted-foreground">• {m.title}</div>
                  ))}
                </div>
                <div className="flex items-center text-sm text-primary group-hover:gap-3 gap-2 transition-all">
                  Explorar pilar <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild>
            <Link to="/contacto?tipo=demo">Pedir demo personalizada</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
