import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Eye, Target, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function CrossFunnelAnalytics() {
  const { currentWorkspace } = useWorkspace();

  const { data: events = [] } = useQuery({
    queryKey: ["cross-funnel-analytics", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await (supabase as any)
        .from("vertical_landing_events")
        .select("template_slug, event_type, created_at, utm_source")
        .eq("workspace_id", currentWorkspace.id)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });

  // Aggregate by funnel
  const byFunnel: Record<string, { views: number; submissions: number }> = {};
  const byDate: Record<string, { date: string; views: number; submissions: number }> = {};
  const bySource: Record<string, number> = {};

  for (const e of events) {
    const slug = e.template_slug || "unknown";
    if (!byFunnel[slug]) byFunnel[slug] = { views: 0, submissions: 0 };
    if (e.event_type === "view") byFunnel[slug].views++;
    else if (e.event_type === "form_submit") byFunnel[slug].submissions++;

    const day = (e.created_at as string).slice(0, 10);
    if (!byDate[day]) byDate[day] = { date: day, views: 0, submissions: 0 };
    if (e.event_type === "view") byDate[day].views++;
    else if (e.event_type === "form_submit") byDate[day].submissions++;

    if (e.utm_source) {
      bySource[e.utm_source] = (bySource[e.utm_source] || 0) + 1;
    }
  }

  const trendData = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  const funnelData = Object.entries(byFunnel)
    .map(([slug, d]) => ({ name: `/${slug}`, ...d, conversion: d.views > 0 ? +((d.submissions / d.views) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);
  const sourceData = Object.entries(bySource)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalViews = events.filter((e: any) => e.event_type === "view").length;
  const totalSubs = events.filter((e: any) => e.event_type === "form_submit").length;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Views (30d)</span>
            </div>
            <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Leads (30d)</span>
            </div>
            <p className="text-2xl font-bold">{totalSubs.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Conversão</span>
            </div>
            <p className="text-2xl font-bold">
              {totalViews > 0 ? ((totalSubs / totalViews) * 100).toFixed(1) : "0"}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Funis Activos</span>
            </div>
            <p className="text-2xl font-bold">{Object.keys(byFunnel).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tendência 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="submissions" fill="hsl(var(--chart-2))" name="Leads" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados nos últimos 30 dias
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance by funnel */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance por Funil</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="submissions" fill="hsl(var(--chart-2))" name="Leads" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* UTM Sources */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fontes de Tráfego (UTM Source)</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {sourceData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados UTM — adiciona ?utm_source= aos links dos teus funis
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
