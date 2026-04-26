import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Target, Activity, Brain } from "lucide-react";
import { BrandGlow } from "./_shared";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroV2() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,hsl(218_100%_54%/0.06),transparent_55%),linear-gradient(180deg,hsl(0_0%_100%),hsl(214_40%_97%))] pb-24 pt-12 md:pb-32 md:pt-20">
      {/* Decorative grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(218 70% 14% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(218 70% 14% / 0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center top, black 0%, transparent 70%)",
        }}
      />
      <BrandGlow className="left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2" variant="mix" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 md:px-10 lg:grid-cols-12">
        {/* Left: copy */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-xs font-medium text-brand shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            A plataforma CRM inteligente para empresas que querem crescer com método
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
            className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-navy md:text-6xl lg:text-[68px]"
          >
            Venda melhor.
            <br />
            Automatize mais.
            <br />
            <span className="bg-gradient-to-r from-brand via-brand-vivid to-cyan bg-clip-text text-transparent">
              Decida mais rápido.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500 md:text-xl"
          >
            O FastCRM combina CRM, automação, dados e inteligência artificial para dar à sua
            empresa mais controlo, mais velocidade e mais previsibilidade comercial.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="#cta"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_-10px_hsl(218_100%_54%/0.45)] transition-all hover:-translate-y-0.5 hover:bg-navy-900"
            >
              Agendar demonstração
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#modulos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-100 bg-white px-6 py-3.5 text-base font-semibold text-navy transition-all hover:border-brand/40 hover:text-brand"
            >
              Explorar módulos
            </a>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-navy-500"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              Pronto em horas, não em semanas
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand" />
              IA integrada nativamente
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-cyan" />
              Suporte em português
            </div>
          </motion.div>
        </div>

        {/* Right: floating mini-dashboard */}
        <div className="relative lg:col-span-6">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <div className="relative mx-auto max-w-[560px]">
      {/* Halo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-brand/20 via-cyan/15 to-transparent blur-2xl"
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        className="relative rounded-[28px] border border-navy-100 bg-white p-6 shadow-[0_30px_80px_-20px_hsl(218_70%_14%/0.18)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">
              Pipeline ativo
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-navy">
              €950.000
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <TrendingUp className="h-3 w-3" /> +12,4%
          </span>
        </div>

        {/* Sparkline */}
        <svg viewBox="0 0 320 80" className="mt-4 h-20 w-full">
          <defs>
            <linearGradient id="hero-spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(218 100% 54%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(218 100% 54%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.6 }}
            d="M0,60 C40,55 60,50 90,42 C120,34 145,38 175,28 C205,18 240,22 270,14 C290,9 305,12 320,8"
            fill="none"
            stroke="hsl(218 100% 54%)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0,60 C40,55 60,50 90,42 C120,34 145,38 175,28 C205,18 240,22 270,14 C290,9 305,12 320,8 L320,80 L0,80 Z"
            fill="url(#hero-spark)"
          />
        </svg>

        {/* KPI row */}
        <div className="mt-2 grid grid-cols-3 gap-3">
          <MiniStat label="Conversão" value="31,8%" tone="brand" />
          <MiniStat label="Negócios" value="142" tone="navy" />
          <MiniStat label="Receita prev." value="€1,25M" tone="cyan" />
        </div>
      </motion.div>

      {/* Floating card: AI */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
        className="absolute -left-6 top-32 hidden w-[260px] rounded-2xl border border-cyan/30 bg-white p-4 shadow-[0_20px_60px_-15px_hsl(192_100%_50%/0.35)] sm:block"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan">
            <Brain className="h-3.5 w-3.5" />
            AI Next Best Action
          </div>
          <p className="mt-2 text-sm font-medium leading-snug text-navy">
            Contactar João Ferreira hoje
          </p>
          <p className="mt-1 text-xs text-navy-500">
            Probabilidade de conversão: <span className="font-semibold text-success">87%</span>
          </p>
        </motion.div>
      </motion.div>

      {/* Floating card: tasks */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.85 }}
        className="absolute -right-4 -bottom-4 hidden w-[230px] rounded-2xl border border-navy-100 bg-white p-4 shadow-[0_20px_60px_-15px_hsl(218_70%_14%/0.18)] sm:block"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
            <Activity className="h-3.5 w-3.5" /> Atividade
          </div>
          <ul className="mt-2 space-y-2 text-sm text-navy">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Proposta enviada · Acme
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Reunião marcada · 14h
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Follow-up em atraso
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "navy" | "cyan";
}) {
  const dot =
    tone === "brand" ? "bg-brand" : tone === "cyan" ? "bg-cyan" : "bg-navy";
  return (
    <div className="rounded-xl border border-navy-100 bg-brand-ice/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-navy-300">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <p className="mt-0.5 font-display text-base font-semibold text-navy">{value}</p>
    </div>
  );
}
