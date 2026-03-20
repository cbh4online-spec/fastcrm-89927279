import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eye, Target, Users, TrendingUp, Zap, HelpCircle, X,
  AlertTriangle, Lightbulb, Info, ArrowUpRight, ArrowDownRight, Minus,
  Brain, BarChart3
} from "lucide-react";
import {
  type StatsEvent, type SourceData, type AutoInsight, type KPITrend,
  INDUSTRY_BENCHMARKS, DEFAULT_BENCHMARK, KPI_TOOLTIPS,
  computeTrend, computeBounceRateTrend, generateAutoInsights, getPerformanceBadge,
} from "./statsHelpers";

interface Props {
  totalViews: number;
  totalUnique: number;
  totalSubmissions: number;
  conversionRate: number;
  bounceRate: number;
  events: StatsEvent[];
  sources: SourceData[];
  onAnalyzeAI: () => void;
  aiLoading: boolean;
  templateSlug?: string;
}

function KPICard({ title, value, subtitle, icon: Icon, tooltip, trend, belowBenchmark, onClick }: {
  title: string; value: string; subtitle?: string;
  icon: any; tooltip: string; trend: KPITrend; belowBenchmark?: boolean;
  onClick?: () => void;
}) {
  const trendColor = trend.direction === "up" ? "text-emerald-400" : trend.direction === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="border-white/[0.08] rounded-xl relative group">
      {belowBenchmark && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Abaixo do benchmark" />
      )}
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{title}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {trend.value > 0 && (
            <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}{trend.value}%
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightBanner({ insights, onAnalyzeAI, aiLoading }: { insights: AutoInsight[]; onAnalyzeAI: () => void; aiLoading: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || insights.length === 0) return null;

  const icons = { warning: AlertTriangle, opportunity: Lightbulb, info: Info };
  const colors = { warning: "text-amber-400", opportunity: "text-emerald-400", info: "text-blue-400" };

  return (
    <Card className="border-l-4 border-l-amber-500 border-white/[0.08] rounded-xl bg-card/80">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold">Análise Automática</span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Auto</Badge>
            </div>
            {insights.map((insight, i) => {
              const InsightIcon = icons[insight.icon];
              return (
                <div key={i} className="flex items-start gap-2">
                  <InsightIcon className={`h-4 w-4 mt-0.5 shrink-0 ${colors[insight.icon]}`} />
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDismissed(true)}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={onAnalyzeAI} disabled={aiLoading}>
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              Analisar com IA
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionFunnel({ totalViews, totalUnique, totalSubmissions }: { totalViews: number; totalUnique: number; totalSubmissions: number }) {
  if (totalViews === 0) return null;

  const steps = [
    { name: "Visitantes", value: totalViews },
    { name: "Únicos", value: totalUnique },
    { name: "Sessões", value: totalUnique },
    { name: "Submissões", value: totalSubmissions },
  ];

  const max = steps[0].value || 1;

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 py-2">
          {steps.map((step, i) => {
            const widthPct = Math.max((step.value / max) * 100, 8);
            const prevValue = i > 0 ? steps[i - 1].value : step.value;
            const dropCount = i > 0 ? prevValue - step.value : 0;
            const dropPct = prevValue > 0 ? Math.round((dropCount / prevValue) * 100) : 0;
            const stepPct = Math.round((step.value / max) * 100);
            // Progressively desaturate
            const opacity = 1 - (i * 0.2);

            return (
              <div key={step.name}>
                {i > 0 && dropCount > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-8">
                    <span className="text-[11px] text-red-400/70">▼ {dropCount.toLocaleString()} saíram ({dropPct}%)</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{stepPct}%</span>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: `hsla(40, 90%, 55%, ${opacity})`,
                        clipPath: i < steps.length - 1
                          ? `polygon(0 0, 100% 5%, 98% 95%, 0 100%)`
                          : `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                      }}
                    >
                      <span className="text-xs font-medium text-black/80 truncate">{step.name}</span>
                    </div>
                    {i === steps.length - 1 && (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-400/50"
                        style={{ left: `${Math.min(DEFAULT_BENCHMARK * 10, 95)}%` }}
                      >
                        <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-amber-400/70 whitespace-nowrap">
                          Benchmark: {DEFAULT_BENCHMARK}%
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-16 text-right">{step.value.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkComparison({ userRate }: { userRate: number }) {
  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          Benchmark do Setor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 relative">
          {Object.entries(INDUSTRY_BENCHMARKS).map(([key, { label, rate }]) => {
            const badge = rate > userRate ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground";
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs w-24 text-muted-foreground">{label}</span>
                <div className="flex-1 h-6 bg-muted/20 rounded-md relative overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all duration-500 ${rate > userRate ? "bg-emerald-500/30" : rate > userRate * 0.8 ? "bg-amber-500/30" : "bg-muted/40"}`}
                    style={{ width: `${Math.min(rate * 12, 100)}%` }}
                  />
                  {userRate > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                      style={{ left: `${Math.min(userRate * 12, 98)}%` }}
                    />
                  )}
                </div>
                <span className={`text-xs tabular-nums px-2 py-0.5 rounded ${badge}`}>{rate}%</span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400 rounded" />
            A tua taxa: {userRate.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsOverviewTab(props: Props) {
  const { totalViews, totalUnique, totalSubmissions, conversionRate, bounceRate, events, sources, onAnalyzeAI, aiLoading } = props;

  const viewTrend = computeTrend(events, "view");
  const convTrend = computeTrend(events, "form_submit");
  const bounceTrend = computeBounceRateTrend(events);

  const insights = generateAutoInsights(totalViews, totalSubmissions, bounceRate, conversionRate, sources);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          title="Visitantes" value={totalViews.toLocaleString()} subtitle={`${totalUnique} únicos`}
          icon={Eye} tooltip={KPI_TOOLTIPS.visitors} trend={viewTrend}
        />
        <KPICard
          title="Conversão" value={`${conversionRate.toFixed(1)}%`} subtitle={`Benchmark: ${DEFAULT_BENCHMARK}%`}
          icon={Target} tooltip={KPI_TOOLTIPS.conversion} trend={convTrend}
          belowBenchmark={conversionRate < DEFAULT_BENCHMARK && totalViews > 10}
        />
        <KPICard
          title="Submissões" value={totalSubmissions.toLocaleString()}
          icon={Users} tooltip={KPI_TOOLTIPS.submissions} trend={convTrend}
        />
        <KPICard
          title="Bounce Rate" value={`${bounceRate.toFixed(1)}%`}
          icon={TrendingUp} tooltip={KPI_TOOLTIPS.bounce}
          trend={{ ...bounceTrend, direction: bounceTrend.direction === "up" ? "down" : bounceTrend.direction === "down" ? "up" : "stable" }}
          belowBenchmark={bounceRate > 70}
        />
        <KPICard
          title="Sessões" value={totalUnique.toLocaleString()} subtitle={`${events.length} eventos`}
          icon={Zap} tooltip={KPI_TOOLTIPS.sessions} trend={viewTrend}
        />
      </div>

      {/* Insight Banner */}
      <InsightBanner insights={insights} onAnalyzeAI={onAnalyzeAI} aiLoading={aiLoading} />

      {/* Conversion Funnel */}
      <ConversionFunnel totalViews={totalViews} totalUnique={totalUnique} totalSubmissions={totalSubmissions} />

      {/* Benchmark */}
      <BenchmarkComparison userRate={conversionRate} />
    </div>
  );
}
