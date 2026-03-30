import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import type { CSATMetrics } from "@/hooks/useCSATDashboard";

const COLORS = ["hsl(var(--destructive))", "hsl(var(--destructive)/0.7)", "hsl(var(--muted-foreground))", "hsl(var(--primary)/0.7)", "hsl(var(--primary))"];
const STAR_LABELS = ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"];

interface Props {
  metrics: CSATMetrics;
}

export function CSATTrendChart({ metrics }: Props) {
  const data = metrics.trend.map((t) => ({
    ...t,
    label: format(parseISO(t.date), "dd MMM", { locale: pt }),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [v.toFixed(2), "Média"]} />
        <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CSATDistributionChart({ metrics }: Props) {
  const data = metrics.distribution.map((d) => ({
    name: STAR_LABELS[d.star - 1],
    count: d.count,
    fill: COLORS[d.star - 1],
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={40} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CSATByTypeChart({ metrics }: Props) {
  const data = metrics.byType.map((t) => ({
    name: t.type,
    value: t.count,
    avg: t.avg,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, name: string, entry: any) => [`${v} avaliações (${entry.payload.avg.toFixed(1)} ★)`, entry.payload.name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CSATByAgentChart({ metrics }: Props) {
  const data = metrics.byAgent.slice(0, 10).map((a) => ({
    name: a.agent_id.slice(0, 8),
    avg: Math.round(a.avg * 100) / 100,
    count: a.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [v.toFixed(2), "Média"]} />
        <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
