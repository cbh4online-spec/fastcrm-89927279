import { motion } from "framer-motion";
import {
  Building2, Users, CreditCard, Brain, TrendingUp, TrendingDown,
  AlertTriangle, Activity, Zap, ArrowUpRight, Sparkles, ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBackofficeKpis } from "@/hooks/useBackofficeKpis";
import { cn } from "@/lib/utils";

const fmtN = (n: number) => new Intl.NumberFormat("pt-PT").format(n);
const fmtEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const EASE = [0.16, 1, 0.3, 1] as const;

// Mock series (até consolidação histórica)
const mrrSeries = [42, 45, 47, 52, 58, 61, 64, 70, 73, 78, 82, 88];
const wsSeries  = [3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10];
const usersSeries = [4, 5, 6, 7, 8, 9, 9, 10, 11, 11, 12, 12];
const aiSeries  = [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7];

type SparkColor = "brand" | "cyan" | "emerald" | "amber" | "violet";
const SPARK_COLOR: Record<SparkColor, string> = {
  brand: "hsl(218 100% 54%)",     // brand
  cyan: "hsl(192 100% 50%)",      // cyan
  emerald: "hsl(160 84% 39%)",
  amber: "hsl(38 92% 50%)",
  violet: "hsl(262 83% 58%)",
};

function Sparkline({ data, color }: { data: number[]; color: SparkColor }) {
  const w = 132, h = 40, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${pad + i * step},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  const stroke = SPARK_COLOR[color];
  const id = `sp-${color}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <motion.polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </svg>
  );
}

interface KpiProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: any;
  iconBg: string;
  iconShadow: string;
  spark: SparkColor;
  series: number[];
  loading?: boolean;
  index?: number;
}

function KpiCard({ label, value, delta, hint, icon: Icon, iconBg, iconShadow, spark, series, loading, index = 0 }: KpiProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-white p-6 shadow-[0_1px_2px_rgba(11,29,61,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_32px_-12px_rgba(11,29,61,0.12)]"
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl text-white transition-transform duration-300 group-hover:scale-105",
            iconBg
          )}
          style={{ boxShadow: iconShadow }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        {delta !== undefined && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border-0 px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}{delta}%
          </Badge>
        )}
      </div>
      <div className="mt-5 text-[12px] font-medium uppercase tracking-wider text-navy/50">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-navy tabular-nums">
        {loading ? <span className="inline-block h-8 w-28 animate-pulse rounded-md bg-brand-ice" /> : value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-navy/55">{hint}</div>}
      <div className="mt-4 -mx-1">
        <Sparkline data={series} color={spark} />
      </div>
    </motion.div>
  );
}

function PanelHeader({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h3 className="font-display text-[16px] font-semibold tracking-tight text-navy">{title}</h3>
        {hint && <p className="mt-1 text-xs text-navy/55">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

const planMix = [
  { label: "Starter", value: 38, color: "bg-cyan" },
  { label: "Pro", value: 47, color: "bg-brand" },
  { label: "Business", value: 12, color: "bg-violet-500" },
  { label: "Enterprise", value: 3, color: "bg-amber-500" },
];

const recentEvents = [
  { kind: "subscription", title: "Novo Pro · Clínica Norte", time: "há 12 min", color: "text-emerald-700 bg-emerald-50" },
  { kind: "alert", title: "Workspace Alfa: 92% de uso de IA", time: "há 38 min", color: "text-amber-700 bg-amber-50" },
  { kind: "moderation", title: "3 anúncios pendentes de revisão", time: "há 1 h", color: "text-violet-700 bg-violet-50" },
  { kind: "billing", title: "Falha de pagamento · Imob Sul", time: "há 2 h", color: "text-rose-700 bg-rose-50" },
  { kind: "system", title: "Edge function ai-router redeployed", time: "há 4 h", color: "text-navy/70 bg-brand-ice" },
];

const aiTopWorkspaces = [
  { name: "Clínica Norte", calls: 4280, pct: 92 },
  { name: "Imob Premium", calls: 3120, pct: 71 },
  { name: "Agência Lumen", calls: 2540, pct: 58 },
  { name: "Formação+", calls: 1890, pct: 43 },
  { name: "Condomínios PT", calls: 1110, pct: 25 },
];

export default function BackofficeOverviewV2() {
  const { data, isLoading, isError, error } = useBackofficeKpis();

  return (
    <BackofficeShellV2>
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 md:px-8">
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Falha ao carregar indicadores</div>
              <div className="text-xs text-rose-700/80">
                {(error as any)?.message ?? "Tenta novamente mais tarde."}
              </div>
            </div>
          </motion.div>
        )}
        {data?.partialErrors && data.partialErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Alguns indicadores ficaram em fallback</div>
              <div className="text-xs text-amber-800/80">
                Sem acesso a: {data.partialErrors.join(", ")}. Verifica RLS / permissões.
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <Badge variant="outline" className="mb-3 gap-1.5 border-navy/10 bg-white text-[11px] font-medium text-navy/70">
              <ShieldCheck className="h-3 w-3 text-brand" /> Backoffice · Super Admin
            </Badge>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-navy md:text-[34px]">
              Visão Geral SaaS
            </h1>
            <p className="mt-1.5 text-sm text-navy/60">
              Indicadores em tempo real do FastCRM · {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-10 border-navy/12 text-navy/80 hover:bg-brand-ice hover:text-navy">
              Exportar relatório
            </Button>
            <Button
              className="h-10 gap-2 bg-gradient-to-r from-brand to-cyan text-white shadow-[0_8px_24px_-8px_hsl(218_100%_54%/0.45)] hover:shadow-[0_12px_28px_-8px_hsl(218_100%_54%/0.55)] transition-shadow"
            >
              <Sparkles className="h-4 w-4" /> Auditoria rápida
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            index={0}
            label="MRR consolidado"
            value={fmtEUR(data?.mrr ?? 0)}
            hint="Receita mensal recorrente · subscrições ativas"
            icon={CreditCard}
            iconBg="bg-gradient-to-br from-brand to-cyan"
            iconShadow="0 10px 24px -10px hsl(218 100% 54% / 0.55)"
            spark="brand"
            series={mrrSeries}
            loading={isLoading}
          />
          <KpiCard
            index={1}
            label="Workspaces ativos"
            value={fmtN(data?.workspaces ?? 0)}
            delta={data?.workspacesNew30d ? +((data.workspacesNew30d / Math.max(data.workspaces, 1)) * 100).toFixed(1) : 0}
            hint={`${data?.workspacesNew30d ?? 0} novos nos últimos 30 dias`}
            icon={Building2}
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-400"
            iconShadow="0 10px 24px -10px hsl(160 84% 39% / 0.5)"
            spark="emerald"
            series={wsSeries}
            loading={isLoading}
          />
          <KpiCard
            index={2}
            label="Utilizadores"
            value={fmtN(data?.users ?? 0)}
            hint={`${data?.activeSubs ?? 0} subscrições ativas`}
            icon={Users}
            iconBg="bg-gradient-to-br from-violet-500 to-fuchsia-500"
            iconShadow="0 10px 24px -10px hsl(262 83% 58% / 0.5)"
            spark="violet"
            series={usersSeries}
            loading={isLoading}
          />
          <KpiCard
            index={3}
            label="Chamadas IA · 30d"
            value={fmtN(data?.aiCalls30d ?? 0)}
            hint="Inferências através do Lovable AI Gateway"
            icon={Brain}
            iconBg="bg-gradient-to-br from-amber-500 to-orange-500"
            iconShadow="0 10px 24px -10px hsl(38 92% 50% / 0.5)"
            spark="amber"
            series={aiSeries}
            loading={isLoading}
          />
        </div>

        {/* Row 1: Revenue chart + Plan mix */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="lg:col-span-2 rounded-2xl border border-navy/8 bg-white p-7 shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
          >
            <PanelHeader
              title="Evolução de receita"
              hint="MRR mensal · últimos 12 meses (mock até consolidação histórica)"
              action={
                <div className="flex gap-1 rounded-lg border border-navy/10 bg-brand-ice p-0.5 text-xs">
                  {["3M", "6M", "12M"].map((p, i) => (
                    <button
                      key={p}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition",
                        i === 2 ? "bg-white text-navy shadow-sm" : "text-navy/55 hover:text-navy/80"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="relative h-60 w-full">
              <svg viewBox="0 0 600 220" className="h-full w-full">
                <defs>
                  <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(218 100% 54%)" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="hsl(218 100% 54%)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="rev-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="hsl(218 100% 54%)" />
                    <stop offset="100%" stopColor="hsl(192 100% 50%)" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" x2="600" y1={40 + i * 50} y2={40 + i * 50} stroke="hsl(218 30% 92%)" strokeWidth="1" />
                ))}
                {(() => {
                  const data = mrrSeries;
                  const min = 30, max = 95;
                  const step = 600 / (data.length - 1);
                  const pts = data.map((v, i) => `${i * step},${190 - ((v - min) / (max - min)) * 150}`).join(" ");
                  const area = `0,190 ${pts} 600,190`;
                  return (
                    <>
                      <motion.polygon
                        points={area}
                        fill="url(#rev-grad)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.4 }}
                      />
                      <motion.polyline
                        points={pts}
                        fill="none"
                        stroke="url(#rev-stroke)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
                      />
                      {data.map((v, i) => (
                        <motion.circle
                          key={i}
                          cx={i * step}
                          cy={190 - ((v - min) / (max - min)) * 150}
                          r="3"
                          fill="white"
                          stroke="hsl(218 100% 54%)"
                          strokeWidth="2"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.6 + i * 0.04 }}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
              <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-navy/40">
                {["Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            className="rounded-2xl border border-navy/8 bg-white p-7 shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
          >
            <PanelHeader title="Mix de planos" hint="Distribuição das subscrições ativas" />
            <div className="space-y-4">
              {planMix.map((p, i) => (
                <div key={p.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-navy/85">{p.label}</span>
                    <span className="tabular-nums text-navy/55">{p.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-ice">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.value}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.08 }}
                      className={cn("h-full rounded-full", p.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-gradient-to-br from-brand-ice to-white p-4 ring-1 ring-navy/8">
              <div className="flex items-center gap-2 text-xs font-medium text-navy/60">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Insight
              </div>
              <p className="mt-1.5 text-sm text-navy/85">
                <strong className="text-navy">Pro</strong> representa 47% da base. Considera campanha de upgrade para Business.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Row 2: AI usage + Activity feed */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
            className="lg:col-span-2 rounded-2xl border border-navy/8 bg-white p-7 shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
          >
            <PanelHeader
              title="Top consumo de IA"
              hint="Workspaces com maior consumo nos últimos 30 dias"
              action={
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-brand hover:bg-brand-ice hover:text-brand">
                  Ver tudo <ArrowUpRight className="h-3 w-3" />
                </Button>
              }
            />
            <div className="space-y-4">
              {aiTopWorkspaces.map((w, i) => (
                <motion.div
                  key={w.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.05 }}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-3"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-brand-ice text-[11px] font-semibold tabular-nums text-navy/70">
                    {i + 1}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-navy">{w.name}</span>
                      <span className="text-xs tabular-nums text-navy/55">{fmtN(w.calls)} chamadas</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-ice">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${w.pct}%` }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.05 }}
                        className={cn(
                          "h-full rounded-full",
                          w.pct > 85 ? "bg-rose-500" : w.pct > 60 ? "bg-amber-500" : "bg-brand"
                        )}
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-0 text-[11px] tabular-nums",
                      w.pct > 85 ? "bg-rose-50 text-rose-700" : w.pct > 60 ? "bg-amber-50 text-amber-700" : "bg-brand-ice text-navy/70"
                    )}
                  >
                    {w.pct}%
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
            className="rounded-2xl border border-navy/8 bg-white p-7 shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
          >
            <PanelHeader title="Eventos recentes" hint="Atividade do sistema" />
            <ul className="space-y-3.5">
              {recentEvents.map((e, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", e.color)}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-navy">{e.title}</div>
                    <div className="text-xs text-navy/55">{e.time}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Row 3: Alerts banner */}
        {(data?.alertsOpen ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
            className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/70 p-6 shadow-[0_1px_2px_rgba(11,29,61,0.04)]"
          >
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-white shadow-[0_10px_24px_-10px_rgb(245_158_11_/_0.7)]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-semibold text-amber-900">
                    {data?.alertsOpen ?? 0} alertas em aberto
                  </div>
                  <div className="text-xs text-amber-800/80">
                    Verifica falhas de pagamento, limites de plano e workspaces inativos.
                  </div>
                </div>
              </div>
              <Button className="h-10 gap-2 bg-amber-600 text-white hover:bg-amber-700">
                Abrir centro de alertas <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </BackofficeShellV2>
  );
}
