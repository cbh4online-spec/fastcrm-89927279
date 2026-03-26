import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, Eye } from "lucide-react";
import { useSeoAnalyticsData, buildAudienceSegments } from "@/hooks/useSeoAnalyticsData";

const potentialColors: Record<string, string> = {
  "very-high": "default",
  high: "secondary",
  medium: "outline",
  low: "outline",
};

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium mb-2">Sem dados de audiência</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os segmentos de audiência serão criados automaticamente à medida que visitantes interagem com as páginas SEO.
        </p>
      </CardContent>
    </Card>
  );
}

export function GrowthRetargetingDashboard() {
  const { data: events = [], isLoading } = useSeoAnalyticsData(30);

  const segments = useMemo(() => buildAudienceSegments(events), [events]);
  const totalVisitors = useMemo(() => {
    return new Set(events.filter(e => e.visitor_id).map(e => e.visitor_id!)).size;
  }, [events]);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Crescimento & Retargeting</h2>
        <p className="text-sm text-muted-foreground">
          Segmentos de audiência baseados em comportamento — {totalVisitors} visitantes únicos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitors.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Segmentos Ativos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.filter(s => s.size > 0).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alta Intenção</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.filter(s => s.conversionPotential === "very-high" || s.conversionPotential === "high").reduce((s, seg) => s + seg.size, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {segments.filter(s => s.size > 0).map((segment) => (
          <Card key={segment.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{segment.name}</h3>
                    <Badge variant={potentialColors[segment.conversionPotential] as any || "outline"}>
                      {segment.conversionPotential === "very-high" ? "Muito Alto" :
                        segment.conversionPotential === "high" ? "Alto" :
                          segment.conversionPotential === "medium" ? "Médio" : "Baixo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{segment.description}</p>
                  <p className="text-xs text-muted-foreground italic">
                    💡 {segment.suggestedAction}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{segment.size.toLocaleString()}</div>
                  <span className="text-xs text-muted-foreground">visitantes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {segments.every(s => s.size === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Todos os segmentos estão vazios. Os dados serão populados à medida que visitantes acederem às páginas.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
