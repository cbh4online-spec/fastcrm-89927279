import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSessionTimeLogs } from "@/hooks/useSessionTimeLogs";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function SessionTimeChart({ days = 7 }: { days?: number }) {
  const { logs } = useSessionTimeLogs(days);

  const chartData = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({
      date: format(parseISO(l.date), "dd/MM", { locale: pt }),
      ativo: Math.round(l.active_seconds / 60),
      idle: Math.round(l.idle_seconds / 60),
    }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis label={{ value: "min", angle: -90, position: "insideLeft" }} />
          <Tooltip
            formatter={(value: number, name: string) =>
              [formatSeconds(value * 60), name === "ativo" ? "Ativo" : "Inativo"]
            }
          />
          <Legend />
          <Bar dataKey="ativo" fill="hsl(var(--primary))" stackId="a" name="Ativo" radius={[4, 4, 0, 0]} />
          <Bar dataKey="idle" fill="hsl(var(--muted-foreground))" stackId="a" name="Inativo" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
