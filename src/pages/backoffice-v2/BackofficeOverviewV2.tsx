import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Users, CreditCard, Brain, TrendingUp, TrendingDown,
  AlertTriangle, Activity, Zap, ArrowUpRight, Sparkles, ShieldCheck,
  Loader2, ShieldAlert,
} from "lucide-react";
import { BackofficeShellV2 } from "@/components/backoffice-v2/BackofficeShellV2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBackofficeKpis } from "@/hooks/useBackofficeKpis";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const fmtN = (n: number) => new Intl.NumberFormat("pt-PT").format(n);
const fmtEUR = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// Mock sparkline series (used until we have historic data)
const mrrSeries = [42, 45, 47, 52, 58, 61, 64, 70, 73, 78, 82, 88];
const wsSeries  = [3, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10];
const usersSeries = [4, 5, 6, 7, 8, 9, 9, 10, 11, 11, 12, 12];
const aiSeries  = [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120, h = 36, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => `${pad + i * step},${h - pad - ((v - min) / range) * (h - pad * 2)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sp-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sp-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface KpiProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: any;
  accent: string;
  series: number[];
  loading?: boolean;
}

function KpiCard({ label, value, delta, hint, icon: Icon, accent, series, loading }: KpiProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {delta !== undefined && (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border-0 px-2 py-0.5 text-[11px] font-medium",
              positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}{delta}%
          </Badge>
        )}
      </div>
      <div className="mt-4 text-[12.5px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" /> : value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      <div className="mt-3 -mx-1">
        <Sparkline data={series} color={accent.includes("emerald") ? "#10b981" : accent.includes("violet") ? "#8b5cf6" : accent.includes("amber") ? "#f59e0b" : "#2563eb"} />
      </div>
    </motion.div>
  );
}

function PanelHeader({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

const planMix = [
  { label: "Starter", value: 38, color: "bg-sky-500" },
  { label: "Pro", value: 47, color: "bg-[hsl(220,90%,56%)]" },
  { label: "Business", value: 12, color: "bg-violet-500" },
  { label: "Enterprise", value: 3, color: "bg-amber-500" },
];

const recentEvents = [
  { kind: "subscription", title: "Novo Pro · Clínica Norte", time: "há 12 min", color: "text-emerald-600 bg-emerald-50" },
  { kind: "alert", title: "Workspace Alfa: 92% de uso de IA", time: "há 38 min", color: "text-amber-600 bg-amber-50" },
  { kind: "moderation", title: "3 anúncios pendentes de revisão", time: "há 1 h", color: "text-violet-600 bg-violet-50" },
  { kind: "billing", title: "Falha de pagamento · Imob Sul", time: "há 2 h", color: "text-rose-600 bg-rose-50" },
  { kind: "system", title: "Edge function ai-router redeployed", time: "há 4 h", color: "text-slate-600 bg-slate-100" },
];

const aiTopWorkspaces = [
  { name: "Clínica Norte", calls: 4280, pct: 92 },
  { name: "Imob Premium", calls: 3120, pct: 71 },
  { name: "Agência Lumen", calls: 2540, pct: 58 },
  { name: "Formação+", calls: 1890, pct: 43 },
  { name: "Condomínios PT", calls: 1110, pct: 25 },
];

export default function BackofficeOverviewV2() {
  const { data, isLoading } = useBackofficeKpis();

  return (
    <BackofficeShellV2>
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 md:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3 gap-1.5 border-slate-200 bg-white text-[11px] font-medium text-slate-600">
              <ShieldCheck className="h-3 w-3 text-[hsl(220,90%,56%)]" /> Backoffice · Super Admin
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Visão Geral SaaS</h1>
            <p className="mt-1 text-sm text-slate-500">
              Indicadores em tempo real do FastCRM · {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 border-slate-200 text-slate-700">Exportar relatório</Button>
            <Button className="h-9 gap-2 bg-gradient-to-r from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)] text-white">
              <Sparkles className="h-4 w-4" /> Auditoria rápida
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="MRR consolidado"
            value={fmtEUR(data?.mrr ?? 0)}
            delta={12.4}
            hint="Receita mensal recorrente · subscrições ativas"
            icon={CreditCard}
            accent="bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)]"
            series={mrrSeries}
            loading={isLoading}
          />
          <KpiCard
            label="Workspaces ativos"
            value={fmtN(data?.workspaces ?? 0)}
            delta={data?.workspacesNew30d ? +((data.workspacesNew30d / Math.max(data.workspaces, 1)) * 100).toFixed(1) : 0}
            hint={`${data?.workspacesNew30d ?? 0} novos nos últimos 30 dias`}
            icon={Building2}
            accent="bg-gradient-to-br from-emerald-500 to-emerald-400"
            series={wsSeries}
            loading={isLoading}
          />
          <KpiCard
            label="Utilizadores"
            value={fmtN(data?.users ?? 0)}
            delta={8.1}
            hint={`${data?.activeSubs ?? 0} subscrições ativas`}
            icon={Users}
            accent="bg-gradient-to-br from-violet-500 to-fuchsia-500"
            series={usersSeries}
            loading={isLoading}
          />
          <KpiCard
            label="Chamadas IA · 30d"
            value={fmtN(data?.aiCalls30d ?? 0)}
            delta={24.7}
            hint="Inferências através do Lovable AI Gateway"
            icon={Brain}
            accent="bg-gradient-to-br from-amber-500 to-orange-500"
            series={aiSeries}
            loading={isLoading}
          />
        </div>

        {/* Row 1: Revenue chart + Plan mix */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
            <PanelHeader
              title="Evolução de receita"
              hint="MRR mensal · últimos 12 meses (mock até consolidação histórica)"
              action={
                <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  {["3M", "6M", "12M"].map((p, i) => (
                    <button
                      key={p}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition",
                        i === 2 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="relative h-56 w-full">
              <svg viewBox="0 0 600 220" className="h-full w-full">
                <defs>
                  <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(220,90%,56%)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(220,90%,56%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* grid */}
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" x2="600" y1={40 + i * 50} y2={40 + i * 50} stroke="#f1f5f9" strokeWidth="1" />
                ))}
                {(() => {
                  const data = mrrSeries;
                  const min = 30, max = 95;
                  const step = 600 / (data.length - 1);
                  const pts = data.map((v, i) => `${i * step},${190 - ((v - min) / (max - min)) * 150}`).join(" ");
                  const area = `0,190 ${pts} 600,190`;
                  return (
                    <>
                      <polygon points={area} fill="url(#rev-grad)" />
                      <polyline points={pts} fill="none" stroke="hsl(220,90%,56%)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                      {data.map((v, i) => (
                        <circle key={i} cx={i * step} cy={190 - ((v - min) / (max - min)) * 150} r="3" fill="white" stroke="hsl(220,90%,56%)" strokeWidth="2" />
                      ))}
                    </>
                  );
                })()}
              </svg>
              <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {["Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr"].map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <PanelHeader title="Mix de planos" hint="Distribuição das subscrições ativas" />
            <div className="space-y-4">
              {planMix.map((p) => (
                <div key={p.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{p.label}</span>
                    <span className="text-slate-500">{p.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.value}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={cn("h-full rounded-full", p.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Insight
              </div>
              <p className="mt-1.5 text-sm text-slate-700">
                <strong>Pro</strong> representa 47% da base. Considera campanha de upgrade para Business.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: AI usage + Activity feed */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
            <PanelHeader
              title="Top consumo de IA"
              hint="Workspaces com maior consumo nos últimos 30 dias"
              action={<Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-[hsl(220,90%,56%)]">Ver tudo <ArrowUpRight className="h-3 w-3" /></Button>}
            />
            <div className="space-y-4">
              {aiTopWorkspaces.map((w, i) => (
                <div key={w.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500">
                    {i + 1}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{w.name}</span>
                      <span className="text-xs text-slate-500">{fmtN(w.calls)} chamadas</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${w.pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                        className={cn(
                          "h-full rounded-full",
                          w.pct > 85 ? "bg-rose-500" : w.pct > 60 ? "bg-amber-500" : "bg-[hsl(220,90%,56%)]"
                        )}
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-0 text-[11px]",
                      w.pct > 85 ? "bg-rose-50 text-rose-700" : w.pct > 60 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
                    )}
                  >
                    {w.pct}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <PanelHeader title="Eventos recentes" hint="Atividade do sistema" />
            <ul className="space-y-3">
              {recentEvents.map((e, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", e.color)}>
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{e.title}</div>
                    <div className="text-xs text-slate-500">{e.time}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 3: Alerts banner */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/60 p-5">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-amber-900">
                  {data?.alertsOpen ?? 0} alertas em aberto
                </div>
                <div className="text-xs text-amber-800/80">
                  Verifica falhas de pagamento, limites de plano e workspaces inativos.
                </div>
              </div>
            </div>
            <Button className="h-9 gap-2 bg-amber-600 text-white hover:bg-amber-700">
              Abrir centro de alertas <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </BackofficeShellV2>
  );
}
