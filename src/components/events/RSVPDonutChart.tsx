import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface RSVPDonutChartProps {
  counts: { invited: number; confirmed: number; declined: number; attended: number };
}

const COLORS = {
  invited: "hsl(215, 60%, 55%)",
  confirmed: "hsl(142, 60%, 45%)",
  declined: "hsl(0, 65%, 55%)",
  attended: "hsl(38, 80%, 55%)",
};

const LABELS: Record<string, string> = {
  invited: "Convidados",
  confirmed: "Confirmados",
  declined: "Recusados",
  attended: "Presentes",
};

export function RSVPDonutChart({ counts }: RSVPDonutChartProps) {
  const total = counts.invited + counts.confirmed + counts.declined + counts.attended;
  if (total === 0) return null;

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de RSVPs</h3>
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value}`, name]}
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2.5 flex-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-muted-foreground">{d.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{d.value}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
