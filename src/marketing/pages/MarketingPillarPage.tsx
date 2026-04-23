import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { getPillar } from "@/marketing/data/modules";

export default function MarketingPillarPage() {
  const { slug } = useParams<{ slug: string }>();
  const pillar = slug ? getPillar(slug) : undefined;
  if (!pillar) return <Navigate to="/funcionalidades" replace />;
  const Icon = pillar.icon;

  return (
    <>
      <Helmet>
        <title>{pillar.label} · FastCRM</title>
        <meta name="description" content={pillar.description} />
      </Helmet>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/funcionalidades"><ArrowLeft className="mr-2 h-4 w-4" />Funcionalidades</Link>
        </Button>

        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Icon className="h-7 w-7" />
          </div>
          <Badge variant="outline" className="mb-4">{pillar.label}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{pillar.hero}</h1>
          <p className="text-lg text-muted-foreground">{pillar.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {pillar.modules.map((m) => {
            const ModIcon = m.icon;
            return (
              <div key={m.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <ModIcon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{m.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{m.description}</p>
                {m.bullets && (
                  <ul className="space-y-1.5">
                    {m.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild className="gap-2">
            <Link to="/contacto?tipo=demo">Quero ver isto a funcionar <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
