import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function SystemMetricsPanel() {
  const { metrics, isLoading } = useSystemMetrics(30);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!metrics?.length) return <p className="text-xs text-muted-foreground text-center py-8">Sem métricas registadas</p>;

  const chartData = metrics.map(m => ({
    date: m.metric_date,
    health: m.health_score,
    alerts: m.alerts_generated,
    commands: m.commands_executed,
    tasks: m.tasks_created_system,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Health Score (últimos 30 dias)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="health" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      <h3 className="text-sm font-semibold">Atividade diária</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="commands" name="Comandos" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent) / 0.2)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="alerts" name="Alertas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="tasks" name="Tasks" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.1)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
