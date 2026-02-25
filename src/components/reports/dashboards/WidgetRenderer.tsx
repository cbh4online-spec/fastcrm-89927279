import { WidgetDataPoint } from "@/hooks/useWidgetData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell } from "recharts";
import { useMemo } from "react";

interface WidgetRendererProps {
  chartType: string;
  data: WidgetDataPoint[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 150 60% 45%))",
  "hsl(var(--chart-4, 30 80% 55%))",
  "hsl(var(--chart-5, 280 65% 60%))",
];

const FUNNEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.25)",
];

export function WidgetRenderer({ chartType, data }: WidgetRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Sem dados disponíveis
      </div>
    );
  }

  switch (chartType) {
    case "bar":
      return <SimpleBarChart data={data} />;
    case "bar_stacked":
      return <StackedBarChart data={data} />;
    case "line":
      return <SimpleLineChart data={data} />;
    case "funnel":
      return <FunnelChart data={data} />;
    default:
      return <SimpleBarChart data={data} />;
  }
}

function SimpleBarChart({ data }: { data: WidgetDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StackedBarChart({ data }: { data: WidgetDataPoint[] }) {
  const { chartData, groups } = useMemo(() => {
    const allGroups = [...new Set(data.map(d => d.group || "Total"))];
    const labels = [...new Set(data.map(d => d.label))].sort();
    const chartData = labels.map(label => {
      const entry: any = { label };
      for (const g of allGroups) {
        const point = data.find(d => d.label === label && d.group === g);
        entry[g] = point?.value || 0;
      }
      return entry;
    });
    return { chartData, groups: allGroups };
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {groups.map((g, i) => (
          <Bar key={g} dataKey={g} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === groups.length - 1 ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimpleLineChart({ data }: { data: WidgetDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function FunnelChart({ data }: { data: WidgetDataPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="flex flex-col gap-2 h-full justify-center px-2">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 text-right truncate">{d.label}</span>
            <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
              <div
                className="h-full rounded flex items-center px-2 text-xs font-medium text-primary-foreground transition-all"
                style={{
                  width: `${Math.max(pct, 8)}%`,
                  backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                }}
              >
                {d.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
