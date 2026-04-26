import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
  Brain,
  Activity,
  Target,
  Plus,
} from "lucide-react";
import { AppShellV2 } from "@/components/app-v2/AppShellV2";
import { AnimatedNumber, Reveal } from "@/components/landing-fastcrm-v2/_shared";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function DashboardV2Page() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";
  return (
    <AppShellV2
      title={`${greeting}, João`}
      subtitle="Aqui está o resumo do desempenho do seu negócio."
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Vendas da semana" value={42180} prefix="€" delta={+12.4} tone="brand" spark="up" />
        <KpiCard label="Novas oportunidades" value={23} delta={+8.1} tone="cyan" spark="up" />
        <KpiCard label="Taxa de conversão" value={31.8} suffix="%" decimals={1} delta={+2.3} tone="navy" spark="up" />
        <KpiCard label="Receita prevista" value={1250000} prefix="€" delta={-3.2} tone="brand" spark="down" />
      </div>

      {/* Pipeline + Evolução */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineCard />
        </div>
        <SalesEvolutionCard />
      </div>

      {/* Main 3-col grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <NextBestActionCard />
          <RecentActivityCard />
        </div>
        <div className="space-y-6">
          <CriticalTasksCard />
          <AlertsCard />
          <QuickActionsCard />
        </div>
      </div>
    </AppShellV2>
  );
}

/* ───────────────────────── KPI ───────────────────────── */

function KpiCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  delta,
  tone,
  spark,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta: number;
  tone: "brand" | "cyan" | "navy";
  spark: "up" | "down";
}) {
  const positive = delta >= 0;
  const accent =
    tone === "cyan" ? "text-cyan" : tone === "navy" ? "text-navy" : "text-brand";

  return (
    <Reveal>
      <div className="group relative overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_hsl(218_70%_14%/0.16)]">
        <p className="text-xs font-medium uppercase tracking-wider text-navy-300">{label}</p>
        <div className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", accent)}>
          {prefix}
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          <Sparkline tone={tone} direction={spark} />
        </div>
      </div>
    </Reveal>
  );
}

function Sparkline({ tone, direction }: { tone: "brand" | "cyan" | "navy"; direction: "up" | "down" }) {
  const stroke =
    tone === "cyan" ? "hsl(192 100% 50%)" : tone === "navy" ? "hsl(218 70% 14%)" : "hsl(218 100% 54%)";
  const path =
    direction === "up"
      ? "M0,28 C15,24 25,22 38,18 C50,15 60,16 75,10 C85,6 92,7 100,4"
      : "M0,8 C15,12 25,15 38,18 C50,21 60,22 75,26 C85,28 92,28 100,30";
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-20">
      <motion.path
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE }}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ──────────────────── Pipeline (funnel) ──────────────────── */

const STAGES = [
  { name: "Novos", count: 124, value: 380000, color: "bg-navy-100" },
  { name: "Qualificados", count: 78, value: 510000, color: "bg-brand/30" },
  { name: "Proposta", count: 42, value: 620000, color: "bg-brand/55" },
  { name: "Negociação", count: 18, value: 410000, color: "bg-brand/80" },
  { name: "Ganhos", count: 9, value: 215000, color: "bg-success" },
];

function PipelineCard() {
  const max = Math.max(...STAGES.map((s) => s.count));
  return (
    <Reveal>
      <Card title="Funil de vendas" subtitle="Estado atual por fase" action="Ver detalhe">
        <div className="space-y-3">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
              className="flex items-center gap-4"
            >
              <span className="w-28 shrink-0 text-sm font-medium text-navy">{s.name}</span>
              <div className="relative flex-1">
                <div className="h-7 overflow-hidden rounded-lg bg-brand-ice">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(s.count / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.08 }}
                    className={cn("h-full rounded-lg", s.color)}
                  />
                </div>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white mix-blend-difference">
                  {s.count} negócios
                </span>
              </div>
              <span className="w-24 shrink-0 text-right font-display text-sm font-semibold tabular-nums text-navy">
                €{(s.value / 1000).toFixed(0)}k
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ──────────────────── Sales Evolution (line chart) ──────────────────── */

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const CURRENT = [4200, 5800, 5100, 7300, 8900, 6400, 4480];
const PREVIOUS = [3800, 4900, 5400, 5800, 6200, 5300, 3700];

function buildPath(data: number[], width: number, height: number, max: number) {
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${height - (v / max) * height}`);
  return `M${points.join(" L")}`;
}

function SalesEvolutionCard() {
  const max = Math.max(...CURRENT, ...PREVIOUS) * 1.1;
  const W = 360;
  const H = 140;
  const currentPath = buildPath(CURRENT, W, H, max);
  const previousPath = buildPath(PREVIOUS, W, H, max);
  const total = CURRENT.reduce((a, b) => a + b, 0);
  const totalPrev = PREVIOUS.reduce((a, b) => a + b, 0);
  const delta = ((total - totalPrev) / totalPrev) * 100;
  return (
    <Reveal>
      <div className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Evolução de vendas</p>
            <h3 className="mt-1 font-display text-lg font-semibold text-navy">Esta semana vs anterior</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            <TrendingUp className="h-3 w-3" />+{delta.toFixed(1)}%
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-navy tabular-nums">
            €{(total / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-navy-300 tabular-nums">vs €{(totalPrev / 1000).toFixed(1)}k</span>
        </div>

        <div className="mt-4 flex-1">
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-32 w-full overflow-visible">
            <defs>
              <linearGradient id="evo-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(216 100% 52%)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="hsl(216 100% 52%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* grid */}
            {[0, 0.5, 1].map((p) => (
              <line key={p} x1="0" y1={H * p} x2={W} y2={H * p} stroke="hsl(217 35% 92%)" strokeWidth="1" strokeDasharray="3 4" />
            ))}
            {/* previous (dashed) */}
            <motion.path
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE }}
              d={previousPath}
              fill="none"
              stroke="hsl(215 22% 62%)"
              strokeWidth="1.6"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
            {/* current area */}
            <motion.path
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              d={`${currentPath} L${W},${H} L0,${H} Z`}
              fill="url(#evo-fill)"
            />
            {/* current line */}
            <motion.path
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
              d={currentPath}
              fill="none"
              stroke="hsl(216 100% 52%)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* points on current */}
            {CURRENT.map((v, i) => {
              const stepX = W / (CURRENT.length - 1);
              const x = i * stepX;
              const y = H - (v / max) * H;
              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="white"
                  stroke="hsl(216 100% 52%)"
                  strokeWidth="2"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.3, ease: EASE }}
                />
              );
            })}
            {/* x labels */}
            {WEEK_DAYS.map((d, i) => {
              const stepX = W / (WEEK_DAYS.length - 1);
              return (
                <text
                  key={d}
                  x={i * stepX}
                  y={H + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="hsl(215 22% 62%)"
                  fontFamily="Inter, sans-serif"
                >
                  {d}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] text-navy-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" /> Esta semana
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-navy-300" /> Anterior
          </span>
        </div>
      </div>
    </Reveal>
  );
}

/* ──────────────────── AI Next Best Action ──────────────────── */

const SUGGESTIONS = [
  { name: "João Ferreira", company: "Acme Lda.", action: "Enviar proposta", prob: 87, value: "€24.500" },
  { name: "Marta Lopes", company: "Nexus", action: "Agendar follow-up", prob: 72, value: "€12.000" },
  { name: "Rui Santos", company: "Build&Co.", action: "Confirmar reunião", prob: 65, value: "€38.000" },
];

function NextBestActionCard() {
  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-2xl border border-cyan/25 bg-white p-6 shadow-[0_20px_50px_-25px_hsl(192_100%_50%/0.3)]">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-cyan/15 to-brand/10 blur-2xl"
        />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-cyan/15 text-cyan">
              <motion.span
                aria-hidden
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-xl bg-cyan/30"
              />
              <Brain className="relative h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan">
                AI Next Best Action
              </p>
              <h3 className="font-display text-lg font-semibold text-navy">
                3 ações recomendadas para hoje
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="hidden items-center gap-1 text-xs font-semibold text-brand hover:text-brand-vivid sm:inline-flex"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <ul className="relative mt-5 space-y-3">
          {SUGGESTIONS.map((s) => (
            <li
              key={s.name}
              className="group flex items-center gap-4 rounded-xl border border-navy-100 bg-white p-3 transition-all hover:border-cyan/40 hover:shadow-[0_12px_30px_-15px_hsl(192_100%_50%/0.3)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-cyan text-xs font-semibold text-white">
                {s.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{s.name}</p>
                <p className="truncate text-xs text-navy-500">
                  {s.company} · <span className="text-navy-300">{s.value}</span>
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-navy-300">Probabilidade</p>
                <p className="font-display text-sm font-semibold text-success">{s.prob}%</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-brand"
              >
                <Zap className="h-3 w-3" /> {s.action}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/* ──────────────────── Activity ──────────────────── */

const ACTIVITY = [
  { who: "Marta L.", what: "fechou o negócio", target: "Acme · €24.500", time: "há 12 min", tone: "success" },
  { who: "Sistema", what: "criou tarefa", target: "Follow-up Nexus", time: "há 35 min", tone: "brand" },
  { who: "André S.", what: "enviou proposta", target: "Build&Co.", time: "há 1 h", tone: "navy" },
  { who: "AI Agent", what: "qualificou lead", target: "Vanguard Lda.", time: "há 2 h", tone: "cyan" },
] as const;

function RecentActivityCard() {
  return (
    <Reveal>
      <Card title="Atividade recente" subtitle="O que aconteceu na operação" action="Ver tudo">
        <ul className="space-y-3">
          {ACTIVITY.map((a, i) => {
            const dot =
              a.tone === "success"
                ? "bg-success"
                : a.tone === "cyan"
                ? "bg-cyan"
                : a.tone === "navy"
                ? "bg-navy"
                : "bg-brand";
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
                className="flex items-center gap-3"
              >
                <span className={cn("inline-flex h-2 w-2 shrink-0 rounded-full", dot)} />
                <p className="flex-1 truncate text-sm text-navy">
                  <span className="font-semibold">{a.who}</span>{" "}
                  <span className="text-navy-500">{a.what}</span>{" "}
                  <span className="font-medium text-navy">{a.target}</span>
                </p>
                <span className="shrink-0 text-xs text-navy-300">{a.time}</span>
              </motion.li>
            );
          })}
        </ul>
      </Card>
    </Reveal>
  );
}

/* ──────────────────── Right column ──────────────────── */

const TASKS = [
  { title: "Enviar proposta — Acme", due: "Hoje, 16h", priority: "alta" },
  { title: "Reunião com Marta L.", due: "Amanhã, 10h", priority: "media" },
  { title: "Follow-up Nexus", due: "Sex, 14h", priority: "alta" },
  { title: "Rever pipeline Q2", due: "Próx. semana", priority: "baixa" },
];

function CriticalTasksCard() {
  const tone = (p: string) =>
    p === "alta"
      ? "bg-destructive/10 text-destructive"
      : p === "media"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-navy-100 text-navy-500";
  return (
    <Reveal>
      <Card title="Tarefas críticas" subtitle="Hoje e amanhã" action="Ver todas" icon={Clock}>
        <ul className="space-y-2.5">
          {TASKS.map((t, i) => (
            <li
              key={i}
              className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-navy-100 hover:bg-brand-ice/60"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-navy-200 text-brand focus:ring-brand/30"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy">{t.title}</p>
                <p className="truncate text-[11px] text-navy-300">{t.due}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone(t.priority))}>
                {t.priority}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  );
}

const ALERTS = [
  { tone: "destructive", icon: AlertTriangle, msg: "3 oportunidades sem atividade há +7 dias", action: "Rever" },
  { tone: "warning", icon: Clock, msg: "5 tarefas em atraso na sua equipa", action: "Ver" },
  { tone: "success", icon: CheckCircle2, msg: "Meta mensal a 92% — falta €4.200", action: "Detalhe" },
] as const;

function AlertsCard() {
  return (
    <Reveal>
      <Card title="Alertas importantes" subtitle="Necessitam de atenção" icon={Activity}>
        <ul className="space-y-2.5">
          {ALERTS.map((a, i) => {
            const bg =
              a.tone === "destructive"
                ? "bg-destructive/10 text-destructive"
                : a.tone === "warning"
                ? "bg-warning/15 text-warning-foreground"
                : "bg-success/10 text-success";
            return (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-navy-100 bg-white p-3">
                <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <a.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-navy">{a.msg}</p>
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-semibold text-brand hover:text-brand-vivid"
                  >
                    {a.action} →
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </Reveal>
  );
}

const SHORTCUTS = [
  { label: "Novo contacto", icon: Plus },
  { label: "Nova oportunidade", icon: Target },
  { label: "Criar automação", icon: Zap },
  { label: "Pedir insight IA", icon: Brain },
];

function QuickActionsCard() {
  return (
    <Reveal>
      <Card title="Atalhos rápidos" icon={Sparkles}>
        <div className="grid grid-cols-2 gap-2">
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="group flex flex-col items-start gap-2 rounded-xl border border-navy-100 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_10px_24px_-12px_hsl(218_100%_54%/0.3)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <s.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-navy">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ──────────────────── Card primitive ──────────────────── */

function Card({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="font-display text-base font-semibold text-navy">{title}</h2>
            {subtitle && <p className="text-xs text-navy-300">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <button
            type="button"
            className="text-xs font-semibold text-brand hover:text-brand-vivid"
          >
            {action} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
