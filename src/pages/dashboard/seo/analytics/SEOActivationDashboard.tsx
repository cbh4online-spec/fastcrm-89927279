import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Eye, MousePointer, Sparkles, Target } from "lucide-react";
import { useSeoAnalyticsData, groupByWeek, groupByPageType } from "@/hooks/useSeoAnalyticsData";

const chartConfig = {
  sessions: { label: "Sessões", color: "hsl(var(--primary))" },
  pageViews: { label: "Page Views", color: "hsl(var(--muted-foreground))" },
  generateStarted: { label: "CTA Clicks", color: "hsl(142, 76%, 36%)" },
  activated: { label: "Ativados", color: "hsl(var(--primary))" },
};

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}

function KPICard({ title, value, icon: Icon, description, isLoading }: KPICardProps) {
  if (isLoading) return <Skeleton className="h-[120px]" />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium mb-2">Sem dados de analytics ainda</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          O tracking está ativo nas páginas públicas SEO. Os dados começarão a aparecer
          assim que visitantes acederem às suas páginas publicadas.
        </p>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-4 max-w-sm space-y-2">
          <p className="font-medium text-foreground">Como funciona:</p>
          <ol className="list-decimal list-inside space-y-1 text-left">
            <li>Crie e publique conteúdo SEO (Keywords, Templates, etc.)</li>
            <li>Partilhe os links ou aguarde indexação nos motores de busca</li>
            <li>Os dados de visitas, scrolls e cliques aparecem automaticamente</li>
          </ol>
        </div>
        <Badge variant="outline" className="mt-4 gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Tracking ativo
        </Badge>
      </CardContent>
    </Card>
  );
}

export function SEOActivationDashboard() {
  const { data: events = [], isLoading } = useSeoAnalyticsData(30);

  const timelineData = useMemo(() => groupByWeek(events), [events]);
  const pageTypeData = useMemo(() => groupByPageType(events), [events]);

  const totalSessions = useMemo(() => {
    const s = new Set(events.filter(e => e.session_id).map(e => e.session_id!));
    return s.size;
  }, [events]);

  const totalPageViews = events.filter(e => e.event_type === "page_view").length;
  const totalCta = events.filter(e => e.event_type === "cta_click").length;
  const activationRate = totalSessions > 0 ? ((totalCta / totalSessions) * 100).toFixed(1) : "0";

  if (!isLoading && events.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">SEO → Ativação</h2>
        <p className="text-sm text-muted-foreground">
          As páginas SEO estão a gerar ações ou só tráfego?
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KPICard title="Sessões" value={totalSessions.toLocaleString()} icon={Eye} isLoading={isLoading} />
        <KPICard title="Page Views" value={totalPageViews.toLocaleString()} icon={MousePointer} isLoading={isLoading} />
        <KPICard title="CTA Clicks" value={totalCta.toLocaleString()} icon={Sparkles} isLoading={isLoading} />
        <KPICard title="Taxa de Ativação" value={`${activationRate}%`} icon={Target} description="cliques / sessões" isLoading={isLoading} />
      </div>

      {timelineData.length > 0 && (
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
                  <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="generateStarted" stroke="var(--color-generateStarted)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {pageTypeData.length > 0 && (
        <>
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
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.activated} de {item.sessions}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(item.rate, 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{item.rate}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
