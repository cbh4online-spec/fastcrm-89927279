import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CASES, TESTIMONIALS } from "@/marketing/data/socialProof";

export default function MarketingCasesPage() {
  return (
    <>
      <Helmet>
        <title>Casos de sucesso · FastCRM</title>
        <meta name="description" content="Equipas que transformaram a sua operação comercial com FastCRM." />
      </Helmet>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Casos de sucesso</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Resultados reais. Em equipas reais.
          </h1>
        </div>

        <div className="space-y-12 max-w-5xl mx-auto">
          {CASES.map((c) => (
            <article key={c.slug} className="rounded-2xl border border-border bg-card p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary">{c.sector}</Badge>
                <Badge variant="outline">{c.size}</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{c.company}</h2>
              <blockquote className="text-lg text-foreground border-l-4 border-primary pl-4 mb-6">
                "{c.quote}"
                <footer className="text-sm text-muted-foreground mt-2 font-normal">
                  — {c.author}, {c.authorRole}
                </footer>
              </blockquote>
              <p className="text-muted-foreground mb-6">{c.story}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
                {c.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="text-2xl font-bold text-primary">{m.value}</div>
                    <div className="text-sm text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-16">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.author} className="rounded-xl border border-border bg-card p-6">
              <p className="mb-3">"{t.quote}"</p>
              <footer className="text-sm">
                <div className="font-semibold">{t.author}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </footer>
            </blockquote>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild>
            <Link to="/contacto?tipo=demo">Quero resultados como estes</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
