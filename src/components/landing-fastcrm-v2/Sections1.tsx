import { Section, SectionHeader, Reveal } from "./_shared";

const LOGOS = ["LusoCargo", "Nexus", "Build&Co.", "Vanguard", "Inova+", "PrimeWorks"];

export function SocialProofV2() {
  return (
    <section className="border-y border-navy-100 bg-white py-14">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-navy-300">
          Empresas que confiam no FastCRM
        </p>
        <div className="mt-7 grid grid-cols-2 items-center gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {LOGOS.map((name, i) => (
            <Reveal key={name} delay={i * 0.05}>
              <div className="group flex items-center justify-center">
                <span className="font-display text-xl font-semibold tracking-tight text-navy-300 transition-colors duration-300 group-hover:text-brand">
                  {name}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { AlertTriangle, EyeOff, Repeat, BarChart3 } from "lucide-react";

const PAINS = [
  {
    icon: AlertTriangle,
    title: "Leads sem acompanhamento",
    text: "Oportunidades entram, mas perdem-se por falta de resposta, prioridade ou processo.",
  },
  {
    icon: EyeOff,
    title: "Equipa sem visão clara",
    text: "Cada pessoa trabalha à sua maneira e a gestão perde previsibilidade.",
  },
  {
    icon: Repeat,
    title: "Tarefas repetitivas",
    text: "Tempo desperdiçado em ações que poderiam estar automatizadas.",
  },
  {
    icon: BarChart3,
    title: "Decisões sem dados",
    text: "Sem relatórios claros, a empresa reage tarde e perde margem de crescimento.",
  },
];

export function ProblemV2() {
  return (
    <Section id="problema" className="bg-brand-ice">
      <SectionHeader
        eyebrow="O problema real"
        title={
          <>
            A sua empresa não precisa de mais ferramentas.
            <br />
            <span className="text-brand">Precisa de mais controlo.</span>
          </>
        }
        subtitle="Muitas empresas perdem oportunidades porque os dados estão espalhados, os follow-ups falham e a equipa trabalha sem uma visão clara do que deve acontecer a seguir."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PAINS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <div className="group h-full rounded-2xl border border-navy-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_20px_50px_-20px_hsl(218_100%_54%/0.25)]">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

import { Layers, Workflow, LineChart } from "lucide-react";

const PILLARS = [
  {
    icon: Layers,
    title: "Organize",
    text: "Centralize contactos, leads, oportunidades, tarefas e histórico comercial.",
    tone: "brand" as const,
  },
  {
    icon: Workflow,
    title: "Automatize",
    text: "Crie follow-ups, lembretes, fluxos e ações automáticas com base no comportamento dos seus clientes.",
    tone: "cyan" as const,
  },
  {
    icon: LineChart,
    title: "Decida",
    text: "Acompanhe indicadores, receba recomendações de IA e tome decisões com mais confiança.",
    tone: "navy" as const,
  },
];

export function SolutionV2() {
  return (
    <Section id="solucao">
      <SectionHeader
        eyebrow="A solução FastCRM"
        title={
          <>
            Centralize clientes, vendas, automações e decisões{" "}
            <span className="text-brand">num só sistema.</span>
          </>
        }
        subtitle="Uma plataforma desenhada para transformar contactos em oportunidades, oportunidades em vendas e dados em decisões."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PILLARS.map((p, i) => {
          const ring =
            p.tone === "brand"
              ? "from-brand/15 to-transparent"
              : p.tone === "cyan"
              ? "from-cyan/20 to-transparent"
              : "from-navy/10 to-transparent";
          const fg =
            p.tone === "brand" ? "text-brand" : p.tone === "cyan" ? "text-cyan" : "text-navy";
          return (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-navy-100 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_hsl(218_70%_14%/0.18)]">
                <div
                  aria-hidden
                  className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${ring} opacity-70`}
                />
                <div className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ice ${fg}`}>
                  <p.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="relative mt-5 font-display text-2xl font-semibold text-navy">
                  {p.title}
                </h3>
                <p className="relative mt-3 text-base leading-relaxed text-navy-500">{p.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

import {
  LayoutDashboard,
  Users,
  Sparkles,
  Briefcase,
  GitBranch,
  CheckSquare,
  Calendar,
  Bot,
  FileBarChart,
  BrainCircuit,
  Plug,
  Settings2,
} from "lucide-react";

const MODULES = [
  { icon: LayoutDashboard, title: "Dashboard", text: "Veja o estado do negócio, métricas críticas e próximas ações num único ecrã." },
  { icon: Users, title: "Contactos", text: "Base única de pessoas e empresas com histórico, segmentação e enriquecimento." },
  { icon: Sparkles, title: "Leads", text: "Capte, qualifique e distribua leads automaticamente pela equipa certa." },
  { icon: Briefcase, title: "Oportunidades", text: "Acompanhe negócios, valor, fase e probabilidade em tempo real." },
  { icon: GitBranch, title: "Funis de venda", text: "Múltiplos funis configuráveis por equipa, produto ou tipo de cliente." },
  { icon: CheckSquare, title: "Tarefas", text: "Trabalho diário organizado, com prioridades e responsáveis claros." },
  { icon: Calendar, title: "Calendário", text: "Reuniões, follow-ups e agenda da equipa, sincronizados num só lugar." },
  { icon: Bot, title: "Automações", text: "Fluxos visuais que disparam ações com base em comportamento e regras." },
  { icon: FileBarChart, title: "Relatórios", text: "Painéis e relatórios prontos para análise comercial e de gestão." },
  { icon: BrainCircuit, title: "IA & Insights", text: "Recomendações inteligentes para priorizar oportunidades e melhorar resultados." },
  { icon: Plug, title: "Integrações", text: "Ligue WhatsApp, email, faturação, marketing e ferramentas de produtividade." },
  { icon: Settings2, title: "Backoffice", text: "Governação, permissões, auditoria e configuração avançada da plataforma." },
];

export function ModulesV2() {
  return (
    <Section id="modulos" className="bg-brand-ice">
      <SectionHeader
        eyebrow="Módulos principais"
        title={<>Todas as ferramentas. <span className="text-brand">Um só sistema.</span></>}
        subtitle="O FastCRM junta os módulos essenciais para gerir crescimento comercial, equipa e automação."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((m, i) => (
          <Reveal key={m.title} delay={Math.min(i * 0.04, 0.4)}>
            <div className="group h-full rounded-2xl border border-navy-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_16px_40px_-16px_hsl(218_100%_54%/0.25)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-cyan/10 text-brand transition-all duration-300 group-hover:from-brand group-hover:to-cyan group-hover:text-white">
                <m.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-navy">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{m.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
