import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle, MousePointer, Scroll, AlertCircle, Eye, ArrowDown, Info } from "lucide-react";

const chartConfig = {
  keyword: { label: "Keyword", color: "hsl(var(--primary))" },
  tool: { label: "Tool", color: "hsl(142, 76%, 36%)" },
  template: { label: "Template", color: "hsl(262, 83%, 58%)" },
  category: { label: "Category", color: "hsl(25, 95%, 53%)" },
  compare: { label: "Compare", color: "hsl(199, 89%, 48%)" },
};

interface FrictionEvent {
  event_type: string;
  event_data: Record<string, unknown>;
  page_type: string | null;
  created_at: string;
}

function useUxAnalytics(workspaceId?: string) {
  return useQuery({
    queryKey: ["ux-friction-analytics", workspaceId],
    queryFn: async () => {
      // Get events from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("seo_page_analytics")
        .select("event_type, event_data, page_type, created_at")
        .eq("workspace_id", workspaceId!)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data || []) as unknown as FrictionEvent[];
    },
    enabled: !!workspaceId,
  });
}

export function UXFrictionDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { data: events = [], isLoading } = useUxAnalytics(currentWorkspace?.id);

  const hasData = events.length > 0;

  // Aggregate friction counts by type
  const frictionData = useMemo(() => {
    const counts: Record<string, number> = {
      error_shown: 0,
      empty_state: 0,
      rage_click: 0,
      dead_click: 0,
      scroll_abandon: 0,
    };
    for (const e of events) {
      if (counts[e.event_type] !== undefined) {
        counts[e.event_type]++;
      }
    }
    return [
      { type: "error_shown", label: "Erros Exibidos", count: counts.error_shown, severity: "high" as const },
      { type: "empty_state", label: "Estados Vazios", count: counts.empty_state, severity: "medium" as const },
      { type: "rage_click", label: "Rage Clicks", count: counts.rage_click, severity: "high" as const },
      { type: "dead_click", label: "Dead Clicks", count: counts.dead_click, severity: "medium" as const },
      { type: "scroll_abandon", label: "Abandono antes de Generate", count: counts.scroll_abandon, severity: "high" as const },
    ];
  }, [events]);

  const highSeverityCount = useMemo(
    () => frictionData.filter((f) => f.severity === "high").reduce((sum, f) => sum + f.count, 0),
    [frictionData]
  );

  // Scroll depth stats
  const scrollStats = useMemo(() => {
    const scrollEvents = events.filter((e) => e.event_type === "scroll_depth");
    const reached50 = scrollEvents.filter((e) => (e.event_data as any)?.depth >= 50).length;
    const total = scrollEvents.length || 1;
    return { pct50: Math.round((reached50 / total) * 100) || 0 };
  }, [events]);

  // CTA click stats
  const ctaData = useMemo(() => {
    const ctaEvents = events.filter((e) => e.event_type === "cta_click");
    const pageViews = events.filter((e) => e.event_type === "page_view").length || 1;
    const byPlacement: Record<string, number> = {};
    for (const e of ctaEvents) {
      const placement = (e.event_data as any)?.placement || "Unknown";
      byPlacement[placement] = (byPlacement[placement] || 0) + 1;
    }
    return Object.entries(byPlacement)
      .map(([placement, clicks]) => ({
        placement,
        clicks,
        impressions: pageViews,
        ctr: Math.round((clicks / pageViews) * 1000) / 10,
      }))
      .sort((a, b) => b.ctr - a.ctr);
  }, [events]);

  const avgCtr = useMemo(() => {
    if (ctaData.length === 0) return 0;
    return Math.round((ctaData.reduce((s, c) => s + c.ctr, 0) / ctaData.length) * 10) / 10;
  }, [ctaData]);

  // Scroll depth by page type for chart
  const scrollDepthByPageType = useMemo(() => {
    const scrollEvents = events.filter((e) => e.event_type === "scroll_depth");
    const depths = [25, 50, 75, 100];
    const pageTypes = new Set<string>();
    const matrix: Record<string, Record<number, number>> = {};

    for (const e of scrollEvents) {
      const pt = e.page_type || "other";
      const depth = (e.event_data as any)?.depth;
      pageTypes.add(pt);
      if (!matrix[pt]) matrix[pt] = {};
      matrix[pt][depth] = (matrix[pt][depth] || 0) + 1;
    }

    if (pageTypes.size === 0) return [];

    const totalByType: Record<string, number> = {};
    for (const pt of pageTypes) {
      totalByType[pt] = Object.values(matrix[pt] || {}).reduce((a, b) => a + b, 0) || 1;
    }

    return depths.map((d) => {
      const row: Record<string, unknown> = { depth: `${d}%` };
      for (const pt of pageTypes) {
        row[pt] = Math.round(((matrix[pt]?.[d] || 0) / totalByType[pt]) * 100);
      }
      return row;
    });
  }, [events]);

  // Abandon pre-generate
  const abandonRate = useMemo(() => {
    const abandons = events.filter((e) => e.event_type === "scroll_abandon").length;
    const views = events.filter((e) => e.event_type === "page_view").length || 1;
    return Math.round((abandons / views) * 100);
  }, [events]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">UX & Fricção</h2>
          <p className="text-sm text-muted-foreground">A carregar dados...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">UX & Fricção</h2>
        <p className="text-sm text-muted-foreground">
          Otimização de conversão - que secção/layout ajustar primeiro?
        </p>
      </div>

      {/* No data state */}
      {!hasData && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Sem dados de UX registados
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  O tracker de UX está ativo. Os dados aparecerão aqui quando visitantes interagirem com as páginas públicas do workspace.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Banner */}
      {hasData && highSeverityCount > 100 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  {highSeverityCount.toLocaleString()} eventos de alta fricção detetados
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Priorize correções nos pontos de "Abandono antes de Generate" e "Rage Clicks"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scroll até 50%</CardTitle>
            <Scroll className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? `${scrollStats.pct50}%` : "—"}</div>
            <div className="text-xs text-muted-foreground">média todas as páginas</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">CTR Médio CTAs</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? `${avgCtr}%` : "—"}</div>
            <div className="text-xs text-muted-foreground">todos os placements</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Erros Críticos</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {hasData ? frictionData.find((f) => f.type === "error_shown")?.count || 0 : "—"}
            </div>
            <div className="text-xs text-muted-foreground">últimos 30 dias</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abandono Pré-Generate</CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasData ? `${abandonRate}%` : "—"}</div>
            <div className="text-xs text-muted-foreground">drop-off médio</div>
          </CardContent>
        </Card>
      </div>

      {/* Scroll Depth by Page Type */}
      {scrollDepthByPageType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scroll className="h-5 w-5" />
              Scroll Depth por Tipo de Página
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scrollDepthByPageType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="depth" className="text-xs" />
                  <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {Object.keys(scrollDepthByPageType[0] || {})
                    .filter((k) => k !== "depth")
                    .map((key, i) => {
                      const colors = [
                        "hsl(var(--primary))",
                        "hsl(142, 76%, 36%)",
                        "hsl(262, 83%, 58%)",
                        "hsl(25, 95%, 53%)",
                        "hsl(199, 89%, 48%)",
                      ];
                      return <Bar key={key} dataKey={key} fill={colors[i % colors.length]} name={key} />;
                    })}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* CTA Performance */}
      {ctaData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Performance de CTAs por Placement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ctaData.map((cta) => (
                <div key={cta.placement} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{cta.placement}</div>
                  <div className="flex-1">
                    <Progress value={cta.ctr * 3} className="h-3" />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground w-20">
                      {cta.clicks.toLocaleString()} clicks
                    </span>
                    <Badge variant={cta.ctr > 15 ? "default" : cta.ctr < 8 ? "secondary" : "outline"}>
                      {cta.ctr}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friction Events */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Eventos de Fricção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {frictionData.map((friction) => (
                <div key={friction.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        friction.severity === "high" ? "bg-destructive" : "bg-yellow-500"
                      }`}
                    />
                    <span className="font-medium">{friction.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{friction.count.toLocaleString()}</span>
                    <Badge variant={friction.severity === "high" ? "destructive" : "secondary"}>
                      {friction.severity === "high" ? "Alta" : "Média"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop-off / Scroll Abandon info */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Análise de Drop-off
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events
                .filter((e) => e.event_type === "scroll_abandon")
                .slice(0, 10)
                .map((e, i) => {
                  const data = e.event_data as any;
                  return (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{(e as any).page_url || "Página desconhecida"}</span>
                        <Badge variant={data?.max_depth < 30 ? "destructive" : "secondary"}>
                          {data?.max_depth || 0}% scroll
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        💡 Visitante abandonou antes de atingir 75% da página
                      </p>
                    </div>
                  );
                })}
              {events.filter((e) => e.event_type === "scroll_abandon").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem eventos de abandono registados
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
