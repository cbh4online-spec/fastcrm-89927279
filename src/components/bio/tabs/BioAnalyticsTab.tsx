import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Users, MousePointerClick, UserPlus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";

interface BioAnalyticsTabProps {
  pageId: string;
}

export function BioAnalyticsTab({ pageId }: BioAnalyticsTabProps) {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

  const { data: dailyData = [] } = useQuery({
    queryKey: ["bio-analytics-daily", pageId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("bio_analytics_daily" as any)
        .select("*")
        .eq("bio_page_id", pageId)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: true }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: eventCounts = {} } = useQuery({
    queryKey: ["bio-events-counts", pageId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("bio_events" as any)
        .select("event_type")
        .eq("bio_page_id", pageId)
        .gte("created_at", thirtyDaysAgo) as any);
      if (error) throw error;
      const counts: Record<string, number> = {};
      ((data ?? []) as any[]).forEach((e: any) => {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      });
      return counts;
    },
  });

  const totals = dailyData.reduce(
    (acc, d: any) => ({
      views: acc.views + (d.views || 0),
      uniques: acc.uniques + (d.uniques || 0),
      clicks: acc.clicks + (d.clicks || 0),
      leads: acc.leads + (d.leads || 0),
    }),
    { views: 0, uniques: 0, clicks: 0, leads: 0 }
  );

  const chartData = dailyData.map((d: any) => ({
    date: format(new Date(d.date), "dd/MM", { locale: pt }),
    views: d.views || 0,
    uniques: d.uniques || 0,
  }));

  // Aggregate top_links from all daily rows
  const topLinksMap = new Map<string, number>();
  dailyData.forEach((d: any) => {
    if (d.top_links && typeof d.top_links === "object") {
      const links = Array.isArray(d.top_links) ? d.top_links : Object.entries(d.top_links).map(([url, clicks]) => ({ url, clicks }));
      links.forEach((l: any) => {
        topLinksMap.set(l.url, (topLinksMap.get(l.url) || 0) + (l.clicks || 0));
      });
    }
  });
  const topLinks = [...topLinksMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, clicks]) => ({ url, clicks }));

  // Aggregate top_sources
  const topSourcesMap = new Map<string, number>();
  dailyData.forEach((d: any) => {
    if (d.top_sources && typeof d.top_sources === "object") {
      const sources = Array.isArray(d.top_sources) ? d.top_sources : Object.entries(d.top_sources).map(([source, count]) => ({ source, count }));
      sources.forEach((s: any) => {
        topSourcesMap.set(s.source, (topSourcesMap.get(s.source) || 0) + (s.count || 0));
      });
    }
  });
  const topSources = [...topSourcesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  const kpis = [
    { label: "Total Views", value: totals.views, icon: Eye },
    { label: "Únicos", value: totals.uniques, icon: Users },
    { label: "Clicks", value: totals.clicks, icon: MousePointerClick },
    { label: "Leads", value: totals.leads, icon: UserPlus },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <kpi.icon className="h-3.5 w-3.5" />
                {kpi.label}
              </div>
              <p className="text-2xl font-bold">{kpi.value.toLocaleString("pt-PT")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Views & Únicos (30 dias)</CardTitle></CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" name="Views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uniques" name="Únicos" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda. Os dados aparecerão quando a página receber visitas.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Links</CardTitle></CardHeader>
          <CardContent>
            {topLinks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLinks.map((l) => (
                    <TableRow key={l.url}>
                      <TableCell className="text-xs truncate max-w-[200px]">{l.url}</TableCell>
                      <TableCell className="text-right">{l.clicks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Fontes</CardTitle></CardHeader>
          <CardContent>
            {topSources.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Visitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSources.map((s) => (
                    <TableRow key={s.source}>
                      <TableCell className="text-xs">{s.source}</TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
