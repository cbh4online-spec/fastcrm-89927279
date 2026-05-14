import { Helmet } from "react-helmet-async";
import { LandingStickyHeader } from "@/components/landing-fastcrm/LandingStickyHeader";
import { LandingFooter } from "@/components/landing-fastcrm/LandingFooter";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type ChangeType = "feature" | "improvement" | "fix";

interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  type: ChangeType;
  description: string;
}

const badgeStyles: Record<ChangeType, string> = {
  feature: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  improvement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fix: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const badgeLabels: Record<ChangeType, string> = {
  feature: "Nova Funcionalidade",
  improvement: "Melhoria",
  fix: "Correção",
};

const fallbackEntries: ChangelogEntry[] = [
  {
    date: "2026-03-28",
    version: "1.6.0",
    title: "Página de Pricing pública",
    type: "feature",
    description:
      "Nova página /pricing standalone com SEO completo, secção de FAQ e CTA final. Acessível sem autenticação.",
  },
  {
    date: "2026-03-20",
    version: "1.5.0",
    title: "Account Brief — Análise em lote",
    type: "feature",
    description:
      "Possibilidade de lançar análises de conta em batch, com fila de jobs, progresso em tempo real e relatório de erros detalhado.",
  },
  {
    date: "2026-03-14",
    version: "1.4.2",
    title: "Melhoria de performance no Objects MVP",
    type: "improvement",
    description:
      "Redução de 40% no tempo de carregamento das listas de objetos com paginação server-side e cache otimizado.",
  },
  {
    date: "2026-03-07",
    version: "1.4.1",
    title: "Correção no fluxo de onboarding",
    type: "fix",
    description:
      "Resolvido problema onde o passo de configuração do workspace ficava em loop em dispositivos móveis.",
  },
  {
    date: "2026-02-28",
    version: "1.4.0",
    title: "Revenue Radar — Painel de receita preditiva",
    type: "feature",
    description:
      "Novo dashboard de Revenue Radar com previsões de receita baseadas em pipeline, scores de conta e tendências históricas.",
  },
  {
    date: "2026-02-15",
    version: "1.3.0",
    title: "Sistema de notificações e alertas",
    type: "feature",
    description:
      "Centro de notificações com alertas de mudança em contas monitorizadas, preferências por canal e prioridade configurável.",
  },
];

export default function ChangelogPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Changelog — FastCRM Product Updates</title>
        <meta
          name="description"
          content="See what's new in FastCRM. Latest features, improvements and fixes for your CRM workflow."
        />
        <meta property="og:title" content="FastCRM Changelog" />
        <meta
          property="og:description"
          content="Latest product updates, new features and improvements in FastCRM."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/changelog" />
      </Helmet>

      <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)] overflow-x-hidden">
        <LandingStickyHeader />
        <main className="pt-20 pb-24">
          <section className="max-w-3xl mx-auto px-6 py-16">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Changelog
            </h1>
            <p className="text-lg text-[hsl(215,20%,65%)] mb-16">
              Todas as atualizações, novas funcionalidades e correções do FastCRM.
            </p>

            <div className="relative border-l-2 border-[hsl(217,33%,17%)] pl-8 space-y-12">
              {fallbackEntries.map((entry, i) => (
                <article key={i} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[calc(2rem+5px)] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-[hsl(222,47%,4%)]" />

                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <time className="text-xs font-mono text-[hsl(215,20%,55%)]">
                      {new Date(entry.date).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                    <span className="text-xs font-mono text-[hsl(215,20%,55%)]">
                      v{entry.version}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyles[entry.type]}`}
                    >
                      {badgeLabels[entry.type]}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                    {entry.title}
                  </h2>
                  <p className="text-sm text-[hsl(215,20%,65%)] leading-relaxed">
                    {entry.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
