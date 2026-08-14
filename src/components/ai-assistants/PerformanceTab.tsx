/**
 * Performance Tab — desempenho real dos assistentes IA (Fase 1)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  Inbox,
  MessageSquare,
  Timer,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  useAIAssistantsPerformance,
  type PerformancePeriod,
} from "@/hooks/useAIAssistantsPerformance";

const PERIODS: { value: PerformancePeriod; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

function KPI({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
  tone?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-green-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
            )}
            {hint && !loading && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>
            )}
          </div>
          <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceTab() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PerformancePeriod>(30);
  const { data, isLoading, error } = useAIAssistantsPerformance(period);

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="h-6 w-6 mx-auto text-destructive" />
          <p className="text-sm font-medium">Não foi possível carregar o desempenho</p>
          <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  const fmtPct = (v?: number) => `${(v ?? 0).toFixed(0)}%`;
  const fmtCost = (v?: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "USD" }).format(v ?? 0);

  const hasUsage = (data?.totalRequests ?? 0) > 0;
  const hasConversations = (data?.aiConversations ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Período */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Desempenho real dos assistentes no período selecionado.
        </p>
        <Tabs value={String(period)} onValueChange={(v) => setPeriod(Number(v) as PerformancePeriod)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={String(p.value)}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="Pedidos IA"
          value={String(data?.totalRequests ?? 0)}
          icon={Zap}
          loading={isLoading}
          hint={`${data?.botMessages ?? 0} respostas geradas`}
        />
        <KPI
          label="Custo IA"
          value={fmtCost(data?.totalCostUsd)}
          icon={Coins}
          loading={isLoading}
          hint={`Cache ${fmtPct(data?.cacheHitRate)}`}
        />
        <KPI
          label="Latência média"
          value={data?.avgLatencyMs ? `${(data.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
          icon={Timer}
          loading={isLoading}
        />
        <KPI
          label="Taxa de erro"
          value={fmtPct(data?.errorRate)}
          icon={AlertTriangle}
          tone={(data?.errorRate ?? 0) > 5 ? "danger" : "success"}
          loading={isLoading}
        />
        <KPI
          label="Conversas com IA"
          value={String(data?.aiConversations ?? 0)}
          icon={MessageSquare}
          loading={isLoading}
        />
        <KPI
          label="Resolvidas sem humano"
          value={String(data?.resolvedWithoutHuman ?? 0)}
          hint={`${fmtPct(data?.resolutionRate)} das conversas`}
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
        />
        <KPI
          label="Passadas a humano"
          value={String(data?.handoffs ?? 0)}
          hint={`${fmtPct(data?.handoffRate)} das conversas`}
          icon={ArrowRightLeft}
          tone={(data?.handoffRate ?? 0) > 50 ? "warning" : "default"}
          loading={isLoading}
        />
        <KPI
          label="Média diária"
          value={
            data ? (data.totalRequests / Math.max(period, 1)).toFixed(1) : "0"
          }
          hint="pedidos/dia"
          icon={Activity}
          loading={isLoading}
        />
      </div>

      {/* Evolução */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução de utilização</CardTitle>
          <CardDescription>Pedidos de IA por dia</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasUsage ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-1">
              <Activity className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sem utilização de IA no período</p>
              <p className="text-xs text-muted-foreground">
                Ative um agente ou teste a IA para começar a recolher dados.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.daily ?? []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 11 }}
                  minTickGap={16}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value}`, "Pedidos"]}
                  labelFormatter={(l: string) => new Date(l).toLocaleDateString("pt-PT")}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Por funcionalidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Onde a IA é usada</CardTitle>
            <CardDescription>Top funcionalidades por número de pedidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : !hasUsage ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
            ) : (
              data?.byFeature.map((f) => {
                const max = data.byFeature[0]?.requests || 1;
                return (
                  <div key={f.feature} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{f.feature}</span>
                      <span className="text-muted-foreground shrink-0">
                        {f.requests} · {fmtCost(f.cost)}
                        {f.errors > 0 && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            {f.errors} erros
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(4, (f.requests / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Conversas recentes */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Conversas recentes com IA</CardTitle>
              <CardDescription>Últimas conversas analisadas ou respondidas pela IA</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/inbox")}>
              <Inbox className="h-4 w-4 mr-1.5" />
              Inbox
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : !hasConversations ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Ainda não há conversas com intervenção de IA.
              </p>
            ) : (
              data?.recentConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/dashboard/inbox?conversation=${c.id}`)}
                  className="w-full text-left rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.channel || "—"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.handoffAt || c.requiresHuman ? (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                          Handoff
                        </Badge>
                      ) : c.resolvedAt ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/40">
                          Resolvida
                        </Badge>
                      ) : null}
                      <span className="text-[11px] text-muted-foreground">
                        {c.lastMessageAt
                          ? new Date(c.lastMessageAt).toLocaleDateString("pt-PT")
                          : ""}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mt-1 line-clamp-1">
                    {c.preview || "Sem pré-visualização"}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
