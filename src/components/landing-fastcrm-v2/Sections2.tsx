import { Section, SectionHeader, Reveal, AnimatedNumber, BrandGlow } from "./_shared";
import { motion } from "framer-motion";
import { Zap, Bell, MessageSquare, Sparkles } from "lucide-react";

const METRICS = [
  { value: 28, prefix: "+", suffix: "%", label: "Aumento médio de vendas", tone: "brand" },
  { value: 35, prefix: "−", suffix: "%", label: "Tempo gasto em tarefas", tone: "cyan" },
  { value: 42, prefix: "+", suffix: "%", label: "Conversão de oportunidades", tone: "brand" },
  { value: 98, prefix: "", suffix: "%", label: "Satisfação dos clientes", tone: "navy" },
] as const;

export function MetricsV2() {
  return (
    <Section id="metricas">
      <SectionHeader
        eyebrow="Resultados"
        title={
          <>
            Mais velocidade. Mais previsibilidade.
            <br />
            <span className="text-brand">Mais resultados.</span>
          </>
        }
        subtitle="Indicadores que demonstram o impacto operacional típico de equipas que implementam o FastCRM com método."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRICS.map((m, i) => (
          <Reveal key={m.label} delay={i * 0.08}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-navy-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_hsl(218_70%_14%/0.18)]">
              <div
                className={`font-display text-5xl font-semibold tabular-nums ${
                  m.tone === "cyan" ? "text-cyan" : m.tone === "navy" ? "text-navy" : "text-brand"
                }`}
              >
                {m.prefix}
                <AnimatedNumber value={m.value} suffix={m.suffix} />
              </div>
              <p className="mt-3 text-sm font-medium leading-snug text-navy-500">{m.label}</p>
              <Sparkline tone={m.tone} />
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-navy-300">
        Valores ilustrativos baseados em padrões de implementação típicos.
      </p>
    </Section>
  );
}

function Sparkline({ tone }: { tone: "brand" | "cyan" | "navy" }) {
  const stroke =
    tone === "cyan" ? "hsl(192 100% 50%)" : tone === "navy" ? "hsl(218 70% 14%)" : "hsl(218 100% 54%)";
  return (
    <svg viewBox="0 0 200 40" className="mt-4 h-10 w-full opacity-70">
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        d="M0,32 C25,28 45,24 70,20 C95,16 120,18 145,12 C170,6 185,8 200,4"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const AI_CARDS = [
  {
    icon: Zap,
    title: "AI Next Best Action",
    text: "Sugestões inteligentes sobre o próximo passo comercial certo, no momento certo.",
  },
  {
    icon: MessageSquare,
    title: "Follow-ups automáticos",
    text: "Nunca mais deixe um lead importante sem resposta atempada.",
  },
  {
    icon: Bell,
    title: "Alertas inteligentes",
    text: "Identifique oportunidades em risco, tarefas atrasadas e clientes prioritários.",
  },
  {
    icon: Sparkles,
    title: "Resumos e insights",
    text: "Transforme dados dispersos em recomendações úteis para a gestão.",
  },
];

export function AIV2() {
  return (
    <Section id="ia" className="relative overflow-hidden bg-brand-ice">
      <BrandGlow className="left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2" variant="cyan" />
      <SectionHeader
        eyebrow="IA & Automação"
        title={
          <>
            A inteligência artificial trabalha consigo,
            <br />
            <span className="text-brand">não no seu lugar.</span>
          </>
        }
        subtitle="O FastCRM ajuda a identificar prioridades, sugerir próximas ações e automatizar tarefas repetitivas, mantendo a equipa no controlo."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {AI_CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <div className="group relative h-full overflow-hidden rounded-2xl border border-cyan/20 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_20px_50px_-20px_hsl(192_100%_50%/0.35)]">
              <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/15 to-brand/10 text-cyan">
                <motion.span
                  aria-hidden
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-xl bg-cyan/30"
                />
                <c.icon className="relative h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-navy">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{c.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const PARE = [
  { letter: "P", title: "Planeamento", text: "Defina objetivos, processos e prioridades." },
  { letter: "A", title: "Automação", text: "Reduza tarefas repetitivas e mantenha consistência." },
  { letter: "R", title: "Resultados", text: "Acompanhe métricas, vendas e evolução." },
  { letter: "E", title: "Eficiência", text: "Melhore processos com dados e aprendizagem contínua." },
];

export function MethodPareV2() {
  return (
    <Section id="metodo">
      <SectionHeader
        eyebrow="Método PARE"
        title={<>O Método PARE aplicado ao <span className="text-brand">CRM.</span></>}
        subtitle="O FastCRM transforma planeamento, automação, resultados e eficiência numa forma prática de gerir crescimento."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PARE.map((p, i) => (
          <Reveal key={p.letter} delay={i * 0.1}>
            <div className="group relative flex h-full flex-col rounded-3xl border border-navy-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_hsl(218_70%_14%/0.18)]">
              <div className="relative">
                <div className="font-display text-7xl font-semibold leading-none text-navy-100 transition-colors duration-300 group-hover:text-brand/30">
                  {p.letter}
                </div>
                <div className="absolute left-0 top-0 h-1.5 w-12 rounded-full bg-gradient-to-r from-brand to-cyan" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <a
          href="/metodo-pare"
          className="inline-flex items-center gap-2 rounded-xl border border-navy-100 bg-white px-5 py-3 text-sm font-semibold text-navy transition-all hover:border-brand/40 hover:text-brand"
        >
          Conhecer o Método PARE →
        </a>
      </div>
    </Section>
  );
}

import { Stethoscope, GraduationCap, UserCheck, Target as TargetIcon, Store, Briefcase as BriefcaseIcon } from "lucide-react";

const CASES = [
  { icon: Stethoscope, title: "Clínicas", text: "Organize leads, pacientes, marcações, follow-ups e campanhas." },
  { icon: GraduationCap, title: "Empresas de formação", text: "Gerir alunos, inscrições, turmas, pagamentos e relacionamento." },
  { icon: UserCheck, title: "Consultores", text: "Acompanhe oportunidades, propostas, reuniões e clientes." },
  { icon: TargetIcon, title: "Equipas comerciais", text: "Centralize pipeline, tarefas, metas e previsões de receita." },
  { icon: Store, title: "Negócios locais", text: "Digitalize contactos, campanhas e processos comerciais." },
  { icon: BriefcaseIcon, title: "Agências e prestadores de serviço", text: "Organize clientes, projetos, propostas e recorrência." },
];

export function CasesV2() {
  return (
    <Section id="casos" className="bg-brand-ice">
      <SectionHeader
        eyebrow="Casos de uso"
        title={<>Criado para empresas que precisam de <span className="text-brand">vender, acompanhar e crescer.</span></>}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CASES.map((c, i) => (
          <Reveal key={c.title} delay={(i % 3) * 0.08}>
            <div className="group flex h-full items-start gap-4 rounded-2xl border border-navy-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_20px_50px_-20px_hsl(218_100%_54%/0.2)]">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-navy-500">{c.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
