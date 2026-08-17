import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, CheckCircle2, Sparkles, Bot, Zap, TrendingUp,
  Users, Mail, ShoppingBag, BarChart3,
} from "lucide-react";
import { PILLARS } from "@/marketing/data/modules";
import { MARKETING_PLANS } from "@/marketing/data/pricingPlans";
import { TESTIMONIALS, STATS, LOGOS } from "@/marketing/data/socialProof";
import { Helmet } from "react-helmet-async";
import { MarketingFaqSection } from "@/marketing/components/MarketingFaqSection";

export default function MarketingHomePage() {
  return (
    <>
      <Helmet>
        <title>FastCRM — O CRM com IA para PME portuguesas que querem vender mais</title>
        <meta name="description" content="CRM, AI SDR, marketing, faturação e loja online numa única plataforma. Vende mais com a mesma equipa." />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 gap-2">
              <Sparkles className="h-3 w-3" />
              Método PARE · Feito em Portugal
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              O CRM com IA que faz a sua equipa <span className="text-primary">vender mais</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              CRM, AI SDR, marketing omnichannel, faturação, loja online e marketplace — tudo numa única plataforma desenhada para PME portuguesas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link to="/contacto?tipo=demo">Pedir demo grátis <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/funcionalidades">Ver funcionalidades</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              ✓ Trial de 14 dias · ✓ Sem cartão de crédito · ✓ Onboarding em 1 semana
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <section className="border-y border-border/50 bg-muted/20 py-10">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
            Mais de 800 equipas comerciais a vender melhor com FastCRM
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-60">
            {LOGOS.slice(0, 8).map((l) => (
              <div key={l} className="text-sm font-semibold text-muted-foreground">{l}</div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">O Problema</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            A sua equipa perde tempo. E perde negócios.
          </h2>
          <p className="text-lg text-muted-foreground">
            Excel, WhatsApp, email, formulários espalhados. Sem visibilidade de pipeline, sem follow-up estruturado, sem previsão de receita.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {[
            { title: "Leads perdidos", text: "60% das leads ficam sem resposta nas primeiras 24h." },
            { title: "Dados dispersos", text: "Informação espalhada entre WhatsApp, Excel e email." },
            { title: "Sem previsibilidade", text: "Pipeline pouco fiável. Decisões baseadas em sentimento." },
            { title: "Operação manual", text: "Tarefas repetitivas consomem o tempo de quem devia vender." },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUÇÃO / PILARES */}
      <section className="bg-muted/20 border-y border-border/50 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4">A Solução</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Tudo o que precisa para vender. Num só sítio.
            </h2>
            <p className="text-lg text-muted-foreground">
              4 pilares integrados, partilhando o mesmo CRM, mesma IA e os mesmos dados.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.slug}
                  to={`/funcionalidades/${p.slug}`}
                  className="group rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-2">{p.label}</Badge>
                      <h3 className="text-xl font-semibold">{p.tagline}</h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">{p.description}</p>
                  <div className="flex items-center text-sm text-primary group-hover:gap-3 gap-2 transition-all">
                    Explorar <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Como funciona</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Em 4 passos, do lead à fatura paga.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { icon: Users, title: "1. Captar", text: "Leads chegam de formulários, WhatsApp, loja, importação ou enriquecimento automático." },
            { icon: Bot, title: "2. Qualificar", text: "IA classifica, enriquece e atribui ao gestor certo conforme regras de capacidade." },
            { icon: Mail, title: "3. Engajar", text: "AI SDR envia sequências multi-canal personalizadas em Email, WhatsApp e SMS." },
            { icon: TrendingUp, title: "4. Fechar", text: "Propostas, faturas e renovações geradas em segundos — tudo registado no CRM." },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PROVA SOCIAL — TESTEMUNHOS */}
      <section className="bg-muted/20 border-y border-border/50 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4">Prova social</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Equipas que crescem connosco.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.slice(0, 4).map((t) => (
              <blockquote key={t.author} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-foreground mb-4">"{t.quote}"</p>
                <footer className="text-sm">
                  <div className="font-semibold">{t.author}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link to="/casos">Ver casos de sucesso <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Preços</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Escolha o plano que cresce consigo.
          </h2>
          <p className="text-lg text-muted-foreground">
            Sem custos escondidos. Cancele quando quiser.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {MARKETING_PLANS.map((p) => (
            <div
              key={p.slug}
              className={`rounded-2xl border p-6 ${p.highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              {p.badge && <Badge className="mb-3">{p.badge}</Badge>}
              <h3 className="text-xl font-semibold mb-1">{p.name}</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">{p.price}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{p.sub}</p>
              <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
              <ul className="space-y-2 mb-6">
                {p.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant={p.highlight ? "default" : "outline"}>
                <Link to={p.ctaHref}>{p.ctaLabel}</Link>
              </Button>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Button variant="ghost" asChild>
            <Link to="/precos">Ver comparação completa <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <MarketingFaqSection withSchema />

      {/* CTA FINAL */}
      <section className="container mx-auto px-4 pb-20 md:pb-28">
        <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-10 md:p-16 text-center max-w-5xl mx-auto">
          <Badge variant="outline" className="mb-6 gap-2">
            <Zap className="h-3 w-3" /> Pronto a acelerar?
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Comece hoje. Veja resultados em 30 dias.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Marque uma demo de 30 minutos. Mostramos como o FastCRM funciona com o seu caso real.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2">
              <Link to="/contacto?tipo=demo">Marcar demo <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/precos">Ver preços</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
