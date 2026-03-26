import { BarChart3, TrendingUp, TrendingDown, Minus, Target, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWeeklyHistory, WeekHistoryEntry } from "@/hooks/useWeeklyHistory";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const METRICS_CONFIG = [
  { key: "revenue", label: "Receita", format: "currency" as const, icon: "💰" },
  { key: "leads", label: "Leads", format: "number" as const, icon: "🎯" },
  { key: "meetings", label: "Reuniões", format: "number" as const, icon: "📅" },
  { key: "proposals", label: "Propostas", format: "number" as const, icon: "📄" },
  { key: "deals", label: "Deals Criados", format: "number" as const, icon: "🤝" },
];

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  if (diff === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
      <Minus className="h-2.5 w-2.5" />0%
    </span>
  );
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
      <TrendingUp className="h-2.5 w-2.5" />+{diff}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-full">
      <TrendingDown className="h-2.5 w-2.5" />{diff}%
    </span>
  );
}

function fmt(value: number, format: "currency" | "number") {
  return format === "currency" ? formatCurrency(value) : formatNumber(value);
}

function getBarColor(actual: number, target: number): string {
  if (target <= 0) return "hsl(var(--primary))";
  const ratio = actual / target;
  if (ratio >= 1) return "hsl(142 71% 45%)"; // green — hit target
  if (ratio >= 0.7) return "hsl(38 92% 50%)"; // amber — close
  return "hsl(0 84% 60%)"; // red — behind
}

function BarLabel({ x, y, width, value, format: f }: any) {
  if (!value) return null;
  const label = f === "currency" ? formatCurrency(value) : formatNumber(value);
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="hsl(var(--foreground))" fontWeight={600}>
      {label}
    </text>
  );
}

function CustomTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  const actual = payload[0]?.value ?? 0;
  const target = payload[0]?.payload?.Meta ?? 0;
  const pct = target > 0 ? Math.round((actual / target) * 100) : null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 space-y-1">
      <p className="text-[11px] font-semibold text-foreground">Sem. {label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] text-muted-foreground">Atingido</span>
        <span className="text-[11px] font-bold text-foreground">{fmt(actual, format)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] text-muted-foreground">Meta</span>
        <span className="text-[11px] font-medium text-muted-foreground">{fmt(target, format)}</span>
      </div>
      {pct !== null && (
        <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Execução</span>
          <span className={`text-[11px] font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-500"}`}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}

function MiniChart({ metricKey, label, format, data, icon }: {
  metricKey: string;
  label: string;
  format: "currency" | "number";
  data: WeekHistoryEntry[];
  icon: string;
}) {
  const chartData = data.map((w) => ({
    name: w.weekLabel,
    Atingido: w.metrics[metricKey]?.actual ?? 0,
    Meta: w.metrics[metricKey]?.target ?? 0,
  }));

  const currentActual = data[data.length - 1]?.metrics[metricKey]?.actual ?? 0;
  const currentTarget = data[data.length - 1]?.metrics[metricKey]?.target ?? 0;
  const prevActual = data.length >= 2 ? (data[data.length - 2]?.metrics[metricKey]?.actual ?? 0) : 0;

  const hitRate = currentTarget > 0 ? Math.round((currentActual / currentTarget) * 100) : null;

  // Average target line
  const avgTarget = chartData.reduce((s, d) => s + d.Meta, 0) / chartData.length;

  return (
    <Card className="border-border/60 hover:border-primary/30 transition-colors group">
      <CardContent className="pt-4 pb-3 px-4 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{icon}</span>
              <p className="text-xs font-semibold text-foreground">{label}</p>
            </div>
            <p className="text-lg font-bold text-foreground tracking-tight leading-none">
              {fmt(currentActual, format)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TrendBadge current={currentActual} previous={prevActual} />
            {hitRate !== null && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                hitRate >= 100
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                  : hitRate >= 70
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                  : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"
              }`}>
                {hitRate}% da meta
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 20, right: 4, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v: number) =>
                  format === "currency" ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                content={<CustomTooltip format={format} />}
                cursor={{ fill: "hsl(var(--muted) / 0.3)", radius: 4 }}
              />
              {avgTarget > 0 && (
                <ReferenceLine
                  y={avgTarget}
                  stroke="hsl(var(--primary) / 0.35)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Meta ${fmt(avgTarget, format)}`,
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "hsl(var(--muted-foreground))",
                    fontWeight: 500,
                  }}
                />
              )}
              <Bar
                dataKey="Atingido"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                label={<BarLabel format={format} />}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getBarColor(entry.Atingido, entry.Meta)}
                    opacity={index === chartData.length - 1 ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer: target context */}
        {currentTarget > 0 && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Meta semanal: <span className="font-semibold text-foreground">{fmt(currentTarget, format)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WeeklyHistoryCharts() {
  const { data, isLoading } = useWeeklyHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Evolução Semanal</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="h-[220px] flex items-center justify-center">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Evolução Semanal</h3>
          <span className="text-[10px] text-muted-foreground ml-1">(últimas 4 semanas)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> ≥ Meta
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> ≥ 70%
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> &lt; 70%
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-block w-3 border-t border-dashed border-primary/40" /> Meta
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {METRICS_CONFIG.map((m) => (
          <MiniChart key={m.key} metricKey={m.key} label={m.label} format={m.format} data={data} icon={m.icon} />
        ))}
      </div>
    </div>
  );
}
