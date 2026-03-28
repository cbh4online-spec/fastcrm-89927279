import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarCheck, 
  CalendarX, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { useSchedulingAnalytics } from '@/hooks/useSchedulingAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

export function SchedulingAnalytics() {
  const { kpis, isLoading } = useSchedulingAnalytics();

  const hourlyData = useMemo(() => {
    const data = [];
    for (let h = 7; h <= 21; h++) {
      const found = kpis.popularHours.find(p => p.hour === h);
      data.push({ hour: `${String(h).padStart(2, '0')}h`, count: found?.count || 0 });
    }
    return data;
  }, [kpis.popularHours]);

  const dayData = useMemo(() => {
    return DAY_LABELS.map((label, idx) => {
      const found = kpis.popularDays.find(d => d.day === idx);
      return { day: label, count: found?.count || 0 };
    });
  }, [kpis.popularDays]);

  const statusData = useMemo(() => {
    const map: Record<string, string> = {
      confirmed: 'Confirmado',
      completed: 'Concluído',
      scheduled: 'Agendado',
      cancelled: 'Cancelado',
      pending: 'Pendente',
    };
    return kpis.statusBreakdown.map(s => ({
      name: map[s.status] || s.status,
      value: s.count,
    }));
  }, [kpis.statusBreakdown]);

  // Heatmap grid
  const heatmapGrid = useMemo(() => {
    const maxCount = Math.max(...kpis.heatmapData.map(d => d.count), 1);
    const grid: { day: number; hour: number; count: number; intensity: number }[][] = [];
    for (let d = 1; d <= 5; d++) { // Mon-Fri
      const row = [];
      for (let h = 8; h <= 19; h++) {
        const found = kpis.heatmapData.find(item => item.day === d && item.hour === h);
        const count = found?.count || 0;
        row.push({ day: d, hour: h, count, intensity: count / maxCount });
      }
      grid.push(row);
    }
    return grid;
  }, [kpis.heatmapData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Agendamentos"
          value={kpis.totalBookings}
          icon={<CalendarCheck className="h-5 w-5" />}
          color="text-primary"
        />
        <KPICard
          label="Este Mês"
          value={kpis.bookingsThisMonth}
          icon={kpis.monthlyGrowth >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={kpis.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}
          badge={kpis.monthlyGrowth !== 0 ? `${kpis.monthlyGrowth > 0 ? '+' : ''}${kpis.monthlyGrowth}%` : undefined}
          badgeVariant={kpis.monthlyGrowth >= 0 ? 'default' : 'destructive'}
        />
        <KPICard
          label="No-Show Rate"
          value={`${kpis.noShowRate}%`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={kpis.noShowRate > 15 ? 'text-red-500' : kpis.noShowRate > 5 ? 'text-yellow-500' : 'text-green-500'}
          subtitle={`${kpis.noShowCount} faltas`}
        />
        <KPICard
          label="Antecedência Média"
          value={`${kpis.avgLeadTimeDays}d`}
          icon={<Clock className="h-5 w-5" />}
          color="text-blue-500"
          subtitle="entre marcação e evento"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Tendência Mensal
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={kpis.monthlyTrend}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#colorCount)" strokeWidth={2} name="Agendamentos" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Breakdown */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Distribuição por Estado
          </h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Sem dados suficientes
            </div>
          )}
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Popular Hours */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Horários Mais Procurados</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="hour" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Popular Days */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Dias da Semana</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Mapa de Calor — Popularidade por Hora/Dia</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-12">
              {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
                  {h}h
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {heatmapGrid.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-xs text-muted-foreground text-right pr-2">
                  {DAY_LABELS[dayIdx + 1]}
                </span>
                {row.map((cell, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="flex-1 h-7 rounded-sm transition-colors cursor-default"
                    style={{
                      backgroundColor: cell.count === 0
                        ? 'hsl(var(--muted))'
                        : `hsl(var(--primary) / ${0.15 + cell.intensity * 0.85})`,
                    }}
                    title={`${DAY_LABELS[cell.day]} ${cell.hour}h — ${cell.count} agendamento(s)`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 ml-12">
              <span className="text-[10px] text-muted-foreground">Menos</span>
              {[0.1, 0.3, 0.5, 0.7, 1].map((intensity, i) => (
                <div
                  key={i}
                  className="w-5 h-3 rounded-sm"
                  style={{ backgroundColor: `hsl(var(--primary) / ${intensity})` }}
                />
              ))}
              <span className="text-[10px] text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
  badge,
  badgeVariant,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeVariant?: 'default' | 'destructive';
  subtitle?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {badge && (
              <Badge variant={badgeVariant || 'default'} className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted/50', color)}>{icon}</div>
      </div>
    </Card>
  );
}
