import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, Eye } from "lucide-react";
import { useSeoAnalyticsData, buildFunnelFromEvents, groupByPageType } from "@/hooks/useSeoAnalyticsData";

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium mb-2">Sem dados de funnel</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          O funil será construído automaticamente à medida que visitantes interagem com as páginas SEO.
        </p>
      </CardContent>
    </Card>
  );
}

export function SEOFunnelDashboard() {
  const { data: events = [], isLoading } = useSeoAnalyticsData(30);

  const funnelSteps = useMemo(() => buildFunnelFromEvents(events), [events]);
  const byPageType = useMemo(() => groupByPageType(events), [events]);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (events.length === 0) return <EmptyState />;

  const totalVisitors = funnelSteps[0]?.count || 0;
  const totalConverted = funnelSteps[funnelSteps.length - 1]?.count || 0;
  const overallRate = totalVisitors > 0 ? ((totalConverted / totalVisitors) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Funnel SEO → Conversão</h2>
        <p className="text-sm text-muted-foreground">
          Taxa de conversão global: <strong>{overallRate}%</strong>
        </p>
      </div>

      {/* Funnel Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Etapas do Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {funnelSteps.map((step, i) => {
              const widthPct = totalVisitors > 0 ? Math.max((step.count / totalVisitors) * 100, 5) : 100;
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{step.name}</span>
                    <span className="text-muted-foreground">{step.count.toLocaleString()}</span>
                  </div>
                  <div className="h-8 bg-muted rounded-md overflow-hidden mb-1">
                    <div
                      className="h-full bg-primary/80 rounded-md flex items-center justify-end px-2 transition-all"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs text-primary-foreground font-medium">
                        {step.count}
                      </span>
                    </div>
                  </div>
                  {i < funnelSteps.length - 1 && step.dropoff > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 pl-2">
                      <ArrowDown className="h-3 w-3" />
                      Drop-off: {step.dropoff}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by page type */}
      {byPageType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversão por Tipo de Página</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byPageType
                .sort((a, b) => b.rate - a.rate)
                .map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">{item.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.activated} de {item.sessions} sessões
                      </span>
                    </div>
                    <Badge variant={item.rate > 20 ? "default" : "outline"}>{item.rate}%</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
