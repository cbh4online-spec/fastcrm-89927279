import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Wrench, Eye } from "lucide-react";
import { useSeoAnalyticsData, type SeoAnalyticsEvent } from "@/hooks/useSeoAnalyticsData";

function buildPagePerformance(events: SeoAnalyticsEvent[], targetTypes: string[]) {
  const groups = new Map<string, { sessions: Set<string>; pageViews: number; ctaClicks: number; scrolled: Set<string> }>();

  for (const e of events) {
    if (!targetTypes.includes(e.page_type || "")) continue;
    const key = e.page_url || e.page_type || "unknown";
    if (!groups.has(key)) groups.set(key, { sessions: new Set(), pageViews: 0, ctaClicks: 0, scrolled: new Set() });
    const g = groups.get(key)!;
    if (e.session_id) g.sessions.add(e.session_id);
    if (e.event_type === "page_view") g.pageViews++;
    if (e.event_type === "cta_click") g.ctaClicks++;
    if (e.event_type === "scroll_depth" && e.session_id) g.scrolled.add(e.session_id);
  }

  return Array.from(groups.entries())
    .map(([name, v]) => ({
      name,
      sessions: v.sessions.size,
      completed: v.scrolled.size,
      ctaClicks: v.ctaClicks,
      completionRate: v.sessions.size > 0 ? Math.round((v.scrolled.size / v.sessions.size) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium mb-2">Sem dados de templates/tools</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os dados aparecerão quando visitantes interagirem com as páginas de templates e ferramentas.
        </p>
      </CardContent>
    </Card>
  );
}

function PerformanceTable({ data, icon: Icon, title }: { data: ReturnType<typeof buildPagePerformance>; icon: React.ElementType; title: string }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Página</TableHead>
              <TableHead className="text-right">Sessões</TableHead>
              <TableHead className="text-right">Scroll Completo</TableHead>
              <TableHead className="text-right">CTA Clicks</TableHead>
              <TableHead className="text-right">Engagement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="max-w-[250px] truncate font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{row.sessions}</TableCell>
                <TableCell className="text-right">{row.completed}</TableCell>
                <TableCell className="text-right">{row.ctaClicks}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={row.completionRate > 50 ? "default" : "outline"}>
                    {row.completionRate}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function TemplatesToolsDashboard() {
  const { data: events = [], isLoading } = useSeoAnalyticsData(30);

  const templatesData = useMemo(() => buildPagePerformance(events, ["template"]), [events]);
  const toolsData = useMemo(() => buildPagePerformance(events, ["tool"]), [events]);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Templates & Ferramentas</h2>
        <p className="text-sm text-muted-foreground">
          Performance das páginas de templates e ferramentas SEO
        </p>
      </div>

      <PerformanceTable data={toolsData} icon={Wrench} title="Ferramentas" />
      <PerformanceTable data={templatesData} icon={FileText} title="Templates" />

      {toolsData.length === 0 && templatesData.length === 0 && <EmptyState />}
    </div>
  );
}
