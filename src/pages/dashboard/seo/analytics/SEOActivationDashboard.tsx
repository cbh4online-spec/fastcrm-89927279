import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Eye, MousePointer, Sparkles, Target } from 'lucide-react';

// Mock data - would be replaced with real GA4 data
const timelineData = [
  { date: '01 Jan', sessions: 1200, pageViews: 1800, generateStarted: 340 },
  { date: '08 Jan', sessions: 1450, pageViews: 2100, generateStarted: 420 },
  { date: '15 Jan', sessions: 1380, pageViews: 1950, generateStarted: 380 },
  { date: '22 Jan', sessions: 1650, pageViews: 2400, generateStarted: 520 },
  { date: '29 Jan', sessions: 1820, pageViews: 2650, generateStarted: 610 },
  { date: '05 Fev', sessions: 2100, pageViews: 3100, generateStarted: 720 },
  { date: '12 Fev', sessions: 2350, pageViews: 3400, generateStarted: 850 },
];

const pageTypeData = [
  { type: 'keyword', sessions: 4200, activated: 1240, rate: 29.5 },
  { type: 'tool', sessions: 3100, activated: 1580, rate: 51.0 },
  { type: 'template', sessions: 1800, activated: 720, rate: 40.0 },
  { type: 'category', sessions: 2400, activated: 680, rate: 28.3 },
  { type: 'compare', sessions: 890, activated: 410, rate: 46.1 },
  { type: 'blog', sessions: 1650, activated: 280, rate: 17.0 },
];

const chartConfig = {
  sessions: { label: 'Sessões', color: 'hsl(var(--primary))' },
  pageViews: { label: 'Page Views', color: 'hsl(var(--muted-foreground))' },
  generateStarted: { label: 'Generate Started', color: 'hsl(142, 76%, 36%)' },
  activated: { label: 'Ativados', color: 'hsl(var(--primary))' },
};

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  description?: string;
}

function KPICard({ title, value, change, icon: Icon, description }: KPICardProps) {
  const isPositive = change >= 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isPositive ? '+' : ''}{change}%
          </Badge>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SEOActivationDashboard() {
  // Calculate totals
  const totalSessions = timelineData.reduce((sum, d) => sum + d.sessions, 0);
  const totalPageViews = timelineData.reduce((sum, d) => sum + d.pageViews, 0);
  const totalGenerated = timelineData.reduce((sum, d) => sum + d.generateStarted, 0);
  const activationRate = ((totalGenerated / totalSessions) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">SEO → Ativação</h2>
        <p className="text-sm text-muted-foreground">
          As páginas SEO estão a gerar ações ou só tráfego?
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Sessões Orgânicas"
          value={totalSessions.toLocaleString()}
          change={18.5}
          icon={Eye}
          description="vs período anterior"
        />
        <KPICard
          title="SEO Page Views"
          value={totalPageViews.toLocaleString()}
          change={22.3}
          icon={MousePointer}
        />
        <KPICard
          title="Generate Started"
          value={totalGenerated.toLocaleString()}
          change={35.2}
          icon={Sparkles}
        />
        <KPICard
          title="Taxa de Ativação"
          value={`${activationRate}%`}
          change={12.1}
          icon={Target}
          description="started / sessions"
        />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--color-sessions)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="generateStarted"
                  stroke="var(--color-generateStarted)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* By Page Type */}
      <Card>
        <CardHeader>
          <CardTitle>Ativação por Tipo de Página</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="type" type="category" className="text-xs" width={80} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sessions" fill="hsl(var(--muted))" name="Sessões" />
                <Bar dataKey="activated" fill="var(--color-activated)" name="Ativados" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Rate Table */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Ativação por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pageTypeData
              .sort((a, b) => b.rate - a.rate)
              .map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.activated.toLocaleString()} de {item.sessions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {item.rate}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
