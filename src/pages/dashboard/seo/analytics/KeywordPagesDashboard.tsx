import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink, Eye } from "lucide-react";
import { useSeoAnalyticsData, type SeoAnalyticsEvent } from "@/hooks/useSeoAnalyticsData";

function buildKeywordData(events: SeoAnalyticsEvent[]) {
  // Group by utm_term (keyword) or page_url
  const groups = new Map<string, { sessions: Set<string>; pageViews: number; ctaClicks: number }>();

  for (const e of events) {
    const key = e.utm_term || e.page_url || "unknown";
    if (!groups.has(key)) groups.set(key, { sessions: new Set(), pageViews: 0, ctaClicks: 0 });
    const g = groups.get(key)!;
    if (e.session_id) g.sessions.add(e.session_id);
    if (e.event_type === "page_view") g.pageViews++;
    if (e.event_type === "cta_click") g.ctaClicks++;
  }

  return Array.from(groups.entries())
    .map(([keyword, v]) => ({
      keyword,
      sessions: v.sessions.size,
      pageViews: v.pageViews,
      ctaClicks: v.ctaClicks,
      convRate: v.sessions.size > 0 ? Math.round((v.ctaClicks / v.sessions.size) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 50);
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium mb-2">Sem dados de keywords</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os dados de keywords aparecerão quando visitantes acederem às suas páginas SEO com parâmetros UTM ou através de pesquisa orgânica.
        </p>
      </CardContent>
    </Card>
  );
}

export function KeywordPagesDashboard() {
  const { data: events = [], isLoading } = useSeoAnalyticsData(30);
  const [search, setSearch] = useState("");

  const keywordData = useMemo(() => buildKeywordData(events), [events]);

  const filtered = useMemo(() => {
    if (!search) return keywordData;
    const q = search.toLowerCase();
    return keywordData.filter(k => k.keyword.toLowerCase().includes(q));
  }, [keywordData, search]);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (events.length === 0) return <EmptyState />;

  const totalSessions = keywordData.reduce((s, k) => s + k.sessions, 0);
  const totalCta = keywordData.reduce((s, k) => s + k.ctaClicks, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Keywords & Páginas</h2>
        <p className="text-sm text-muted-foreground">
          Performance por página/keyword — {totalSessions} sessões, {totalCta} conversões
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar páginas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Página / Keyword</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Page Views</TableHead>
                <TableHead className="text-right">CTA Clicks</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum resultado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.keyword}>
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {row.keyword}
                    </TableCell>
                    <TableCell className="text-right">{row.sessions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.pageViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.ctaClicks}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.convRate > 10 ? "default" : "outline"}>
                        {row.convRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
