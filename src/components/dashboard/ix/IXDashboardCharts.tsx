import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEUR } from "@/lib/currency";

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const AXIS = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  stroke: "hsl(var(--muted-foreground))",
} as const;

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: 12,
} as const;

/** Paleta em tokens semânticos — segura em tema claro e escuro */
export const IX_SERIES = {
  current: "hsl(var(--primary))",
  prev1: "hsl(var(--muted-foreground) / 0.55)",
  prev2: "hsl(var(--muted-foreground) / 0.28)",
  received: "hsl(var(--primary) / 0.45)",
  notDue: "hsl(var(--warning))",
  overdue: "hsl(var(--destructive))",
  soft: "hsl(var(--primary) / 0.35)",
};

export const IX_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--warning))",
  "hsl(var(--warning) / 0.6)",
  "hsl(var(--destructive) / 0.7)",
  "hsl(var(--muted-foreground) / 0.7)",
  "hsl(var(--primary) / 0.45)",
  "hsl(var(--muted-foreground) / 0.35)",
];

const euroTick = (v: number) =>
  v >= 1000 ? `€${(v / 1000).toFixed(0)}K` : `€${Number(v || 0).toFixed(0)}`;

export function ChartFrame({
  height = 260,
  loading,
  empty,
  emptyLabel = "Sem dados para apresentar.",
  children,
}: {
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (loading) return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  if (empty) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {emptyLabel}
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- Faturação: comparação por ano ---------------- */

export function FaturacaoYearChart({
  yearly,
  loading,
}: {
  yearly: Array<{ year: number; months: number[] }>;
  loading?: boolean;
}) {
  const data = MONTH_LABELS.map((month, i) => {
    const row: Record<string, number | string> = { month };
    yearly.forEach((y) => {
      row[String(y.year)] = y.months[i] ?? 0;
    });
    return row;
  });
  const years = [...yearly].sort((a, b) => a.year - b.year);
  const colors = [IX_SERIES.prev2, IX_SERIES.prev1, IX_SERIES.current];
  const hasValues = years.some((y) => y.months.some((v) => v > 0));

  return (
    <ChartFrame height={300} loading={loading} empty={!hasValues} emptyLabel="Sem faturação registada.">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={euroTick} />
        <Tooltip formatter={(v: number) => formatEUR(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {years.map((y, i) => (
          <Bar
            key={y.year}
            dataKey={String(y.year)}
            name={String(y.year)}
            fill={colors[i] ?? IX_SERIES.current}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

/* ---------------- Cobranças: envelhecimento ---------------- */

export function AgingChart({
  aging,
  loading,
}: {
  aging: Array<{ label: string; recebido: number; naoVencido: number; vencido: number }>;
  loading?: boolean;
}) {
  const hasValues = aging.some((a) => a.recebido || a.naoVencido || a.vencido);
  return (
    <ChartFrame loading={loading} empty={!hasValues} emptyLabel="Sem movimentos nos últimos meses.">
      <BarChart data={aging}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={euroTick} />
        <Tooltip formatter={(v: number) => formatEUR(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="recebido" name="Recebido" stackId="a" fill={IX_SERIES.received} />
        <Bar dataKey="naoVencido" name="Não vencido" stackId="a" fill={IX_SERIES.notDue} />
        <Bar dataKey="vencido" name="Vencido" stackId="a" fill={IX_SERIES.overdue} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

/* ---------------- Clientes: dependência + atividade ---------------- */

export function ClientDependencyBar({
  dependency,
  loading,
}: {
  dependency: Array<{ key: string; name: string; percent: number }>;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (dependency.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes de faturação por cliente.</p>;
  }
  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full">
        {dependency.map((c, i) => (
          <div
            key={c.key}
            style={{ width: `${c.percent}%`, background: IX_PALETTE[i % IX_PALETTE.length] }}
            title={`${c.name} — ${c.percent.toFixed(2)}%`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dependency.map((c, i) => (
          <div key={c.key} className="flex items-start gap-2 text-sm">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: IX_PALETTE[i % IX_PALETTE.length] }}
            />
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground" title={c.name}>
                {c.name}
              </div>
              <div className="text-xs text-muted-foreground">{c.percent.toFixed(2)}%</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ActiveClientsChart({
  monthly,
  loading,
}: {
  monthly: Array<{ label: string; novos: number; recorrentes: number }>;
  loading?: boolean;
}) {
  const hasValues = monthly.some((m) => m.novos || m.recorrentes);
  return (
    <ChartFrame loading={loading} empty={!hasValues} emptyLabel="Sem clientes ativos no período.">
      <BarChart data={monthly}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="novos" name="Novos clientes" stackId="a" fill={IX_SERIES.soft} />
        <Bar dataKey="recorrentes" name="Recorrentes" stackId="a" fill={IX_SERIES.current} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

/* ---------------- Itens ---------------- */

export function TopItemsChart({
  items,
  loading,
}: {
  items: Array<{ name: string; units: number }>;
  loading?: boolean;
}) {
  return (
    <ChartFrame
      height={240}
      loading={loading}
      empty={items.length === 0}
      emptyLabel="Sem linhas de fatura para agregar."
    >
      <BarChart data={items} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          {...AXIS}
          tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 24)}…` : v)}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Bar dataKey="units" name="Unidades" fill={IX_SERIES.current} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ChartFrame>
  );
}

export function ItemsUnitsChart({
  monthly,
  loading,
}: {
  monthly: Array<{ label: string; units: number }>;
  loading?: boolean;
}) {
  const hasValues = monthly.some((m) => m.units > 0);
  return (
    <ChartFrame loading={loading} empty={!hasValues} emptyLabel="Sem unidades vendidas no período.">
      <BarChart data={monthly}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Bar dataKey="units" name="Unidades" fill={IX_SERIES.current} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartFrame>
  );
}

/* ---------------- Impostos ---------------- */

export function VatChart({
  monthly,
  loading,
}: {
  monthly: Array<{ label: string; total: number }>;
  loading?: boolean;
}) {
  const hasValues = monthly.some((m) => m.total > 0);
  return (
    <ChartFrame loading={loading} empty={!hasValues} emptyLabel="Sem IVA liquidado no período.">
      <BarChart data={monthly}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={euroTick} />
        <Tooltip formatter={(v: number) => formatEUR(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Bar dataKey="total" name="IVA" fill={IX_SERIES.current} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartFrame>
  );
}
