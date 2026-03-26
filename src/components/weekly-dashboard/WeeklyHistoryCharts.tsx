import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
  Legend,
} from "recharts";

const METRICS_CONFIG = [
  { key: "revenue", label: "Receita", format: "currency" as const },
  { key: "leads", label: "Leads", format: "number" as const },
  { key: "meetings", label: "Reuniões", format: "number" as const },
  { key: "proposals", label: "Propostas", format: "number" as const },
  { key: "deals", label: "Deals", format: "number" as const },
];

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  if (diff === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600"><TrendingUp className="h-3 w-3" />+{diff}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive"><TrendingDown className="h-3 w-3" />{diff}%</span>;
}

function fmt(value: number, format: "currency" | "number") {
  return format === "currency" ? formatCurrency(value) : formatNumber(value);
}

function BarLabel({ x, y, width, value, format: f }: any) {
  if (!value) return null;
  const label = f === "currency" ? formatCurrency(value) : formatNumber(value);
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))" fontWeight={500}>
      {label}
    </text>
  );
}

function MiniChart({ metricKey, label, format, data }: {
  metricKey: string;
  label: string;
  format: "currency" | "number";
  data: WeekHistoryEntry[];
}) {
  const chartData = data.map((w) => ({
    name: w.weekLabel,
    Atingido: w.metrics[metricKey]?.actual ?? 0,
    Meta: w.metrics[metricKey]?.target ?? 0,
  }));

  const currentActual = data[data.length - 1]?.metrics[metricKey]?.actual ?? 0;
  const prevActual = data.length >= 2 ? (data[data.length - 2]?.metrics[metricKey]?.actual ?? 0) : 0;

  return (
    <Card className="border-border/60">
      <CardContent className="pt-4 pb-3 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <span className="text-[11px] font-medium text-muted-foreground">— {fmt(currentActual, format)}</span>
          </div>
          <TrendBadge current={currentActual} previous={prevActual} />
        </div>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barCategoryGap="20%" margin={{ top: 16, right: 4, bottom: 0, left: -12 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => format === "currency" ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                formatter={(value: number) => fmt(value, format)}
              />
              <Bar dataKey="Meta" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Atingido" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={22} label={<BarLabel format={format} />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyHistoryCharts() {
  const { data, isLoading } = useWeeklyHistory();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Evolução Semanal</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="h-[160px] flex items-center justify-center">
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
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Evolução Semanal</h3>
        <span className="text-[10px] text-muted-foreground">(últimas 4 semanas)</span>
      </div>
      <div className="flex items-center gap-3 px-1 mb-1">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--primary))" }} /> Atingido
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--muted))" }} /> Meta
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {METRICS_CONFIG.map((m) => (
          <MiniChart key={m.key} metricKey={m.key} label={m.label} format={m.format} data={data} />
        ))}
      </div>
    </div>
  );
}
