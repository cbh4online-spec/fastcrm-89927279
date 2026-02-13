import { useState } from 'react';
import { useFlowAnalytics, AnalyticsPeriod } from '@/hooks/useFlowAnalytics';
import { KPICard, KPIGrid } from '@/components/design-system/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, CheckCircle, Target, Clock, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

interface FlowAnalyticsPanelProps {
  flowId: string;
}

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
];

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(var(--warning, 45 93% 47%))',
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function FlowAnalyticsPanel({ flowId }: FlowAnalyticsPanelProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { dailyData, totals, isLoading } = useFlowAnalytics(flowId, period);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const hasData = dailyData.length > 0;

  const pieData = [
    { name: 'Completadas', value: totals.completed },
    { name: 'Abandonadas', value: totals.abandoned },
    { name: 'Handoff', value: totals.handedOff },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Período:</span>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          title="Sessões iniciadas"
          value={totals.started}
          icon={<Play className="h-4 w-4" />}
          variant="primary"
        />
        <KPICard
          title="Taxa de conclusão"
          value={`${totals.completionRate}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          variant={totals.completionRate >= 70 ? 'success' : totals.completionRate >= 30 ? 'warning' : 'destructive'}
        />
        <KPICard
          title="Goals alcançados"
          value={totals.goals}
          icon={<Target className="h-4 w-4" />}
          variant="success"
        />
        <KPICard
          title="Duração média"
          value={formatDuration(totals.avgDuration)}
          icon={<Clock className="h-4 w-4" />}
        />
      </KPIGrid>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Sem dados de analytics para este período</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sessões por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(parseISO(v), 'd MMM', { locale: pt })}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    labelFormatter={(v) => format(parseISO(v as string), "d 'de' MMMM", { locale: pt })}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="started" name="Iniciadas" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="completed" name="Completadas" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="hsl(var(--chart-2, 142 71% 45%))" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="abandoned" name="Abandonadas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribuição de resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
