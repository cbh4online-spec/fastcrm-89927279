import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Globe2, Workflow,
  Receipt, FileSpreadsheet, MessageSquare, CreditCard, Mail, Calendar, Bot, Database,
} from "lucide-react";
import { PILLARS } from "@/marketing/data/modules";
import { Section, SectionHeader, Reveal, Eyebrow } from "@/components/landing-fastcrm-v2/_shared";
import { cn } from "@/lib/utils";

const STATS = [
  { value: "4", label: "Pilares integrados" },
  { value: `${PILLARS.reduce((n, p) => n + p.modules.length, 0)}+`, label: "Módulos principais" },
  { value: "6", label: "Canais de comunicação" },
  { value: "100%", label: "Em português de Portugal" },
];

const PLATFORM = [
  { icon: ShieldCheck, title: "Segurança por workspace", text: "Dados isolados por empresa, permissões por perfil e registo de atividade." },
  { icon: Smartphone, title: "App no telemóvel", text: "Instalável em Android e iOS, pensada para trabalho no terreno." },
  { icon: Workflow, title: "Automações", text: "Gatilhos, condições e ações com histórico de cada execução." },
  { icon: Bot, title: "IA em todo o lado", text: "Copilot, próximas ações, resumos e mensagens sugeridas." },
  { icon: Globe2, title: "Multi-idioma", text: "Português, inglês, espanhol e francês." },
  { icon: Database, title: "Importações", text: "CSV, Excel e SAF-T PT com deteção de duplicados por NIF e email." },
];

const INTEGRATIONS = [
  { icon: MessageSquare, name: "WhatsApp" },
  { icon: Mail, name: "Email" },
  { icon: CreditCard, name: "Stripe e MB WAY" },
  { icon: Receipt, name: "InvoiceXpress" },
  { icon: FileSpreadsheet, name: "SAF-T PT" },
  { icon: Calendar, name: "Google Calendar" },
];

export default function MarketingFeaturesIndexPage() {
  const [active, setActive] = useState(PILLARS[0].slug);
  const pillar = PILLARS.find((p) => p.slug === active) ?? PILLARS[0];

  return (
    <>
      <Helmet>
        <title>Funcionalidades · FastCRM</title>
        <meta name="description" content="CRM, AI SDR, Marketing, Comércio, Faturação e WhatsApp integrados numa única plataforma para PME portuguesas." />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/funcionalidades" />
        <meta property="og:title" content="Funcionalidades FastCRM — tudo numa plataforma" />
        <meta property="og:description" content="Explore todos os módulos do FastCRM: vendas, prospeção com IA, marketing, loja online, faturação e cobranças." />
        <meta property="og:url" content="https://fastcrm.metodopare.ai/funcionalidades" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(hsl(218_70%_14%/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(218_70%_14%/0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center"><Eyebrow>Funcionalidades</Eyebrow></div>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-navy md:text-6xl">
            Tudo o que a sua empresa precisa para vender.
            <br />
            <span className="text-brand">Numa só plataforma.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-500">
            Do primeiro contacto à fatura paga: prospeção com IA, pipeline, WhatsApp, marketing,
            loja online, faturação, cobranças e relatórios — ligados entre si.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contacto?tipo=demo" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(218_100%_54%/0.6)] transition hover:-translate-y-0.5">
              Agendar demonstração <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#modulos" className="inline-flex items-center rounded-full border border-navy-100 bg-background px-6 py-3 text-sm font-semibold text-navy transition hover:border-brand/40">
              Ver todos os módulos
            </a>
          </div>
        </div>
        <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-navy-100 bg-background p-5 text-center">
              <div className="font-display text-3xl font-semibold text-brand">{s.value}</div>
              <div className="mt-1 text-sm text-navy-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Explorador por pilar */}
      <Section id="modulos" className="bg-brand-ice">
        <SectionHeader eyebrow="Módulos" title="Explore por área" subtitle="Escolha uma área para ver todos os módulos e o que cada um faz." />
        <div role="tablist" aria-label="Áreas do FastCRM" className="mb-10 flex gap-2 overflow-x-auto pb-2 md:justify-center">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const isActive = p.slug === active;
            return (
              <button
                key={p.slug}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(p.slug)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isActive ? "border-brand bg-brand text-primary-foreground" : "border-navy-100 bg-background text-navy hover:border-brand/40",
                )}
              >
                <Icon className="h-4 w-4" /> {p.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h3 className="font-display text-2xl font-semibold text-navy md:text-3xl">{pillar.tagline}</h3>
              <p className="mt-2 text-navy-500">{pillar.description}</p>
            </div>
            <Link to={`/funcionalidades/${pillar.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:gap-3 transition-all">
              Página completa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pillar.modules.map((m, i) => {
              const Icon = m.icon;
              return (
                <Reveal key={`${pillar.slug}-${m.title}`} delay={i * 0.04}>
                  <div className="h-full rounded-2xl border border-navy-100 bg-background p-6 transition hover:-translate-y-1 hover:border-brand/30">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="mt-4 font-display text-lg font-semibold text-navy">{m.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-navy-500">{m.description}</p>
                    {m.bullets && (
                      <ul className="mt-4 space-y-1.5">
                        {m.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm text-navy-500">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Base da plataforma */}
      <Section>
        <SectionHeader eyebrow="Plataforma" title="Incluído em todos os módulos" subtitle="A base que torna o FastCRM seguro, rápido e pronto para crescer consigo." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="flex h-full gap-4 rounded-2xl border border-navy-100 bg-background p-6">
                <f.icon className="h-6 w-6 shrink-0 text-brand" />
                <div>
                  <h3 className="font-display font-semibold text-navy">{f.title}</h3>
                  <p className="mt-1 text-sm text-navy-500">{f.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Integrações */}
      <Section className="bg-brand-ice">
        <SectionHeader eyebrow="Integrações" title="Liga-se às ferramentas que já usa" />
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
          {INTEGRATIONS.map((it) => (
            <div key={it.name} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-background px-5 py-4">
              <it.icon className="h-5 w-5 text-brand" />
              <span className="font-medium text-navy">{it.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="mx-auto max-w-3xl rounded-3xl border border-navy-100 bg-brand-ice p-10 text-center md:p-14">
          <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">Veja o FastCRM aplicado ao seu negócio</h2>
          <p className="mt-4 text-navy-500">Demonstração gratuita de 30 minutos, com os seus processos reais.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contacto?tipo=demo" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-primary-foreground">
              Pedir demo personalizada <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/precos" className="inline-flex items-center rounded-full border border-navy-100 bg-background px-6 py-3 text-sm font-semibold text-navy">
              Ver preços
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
