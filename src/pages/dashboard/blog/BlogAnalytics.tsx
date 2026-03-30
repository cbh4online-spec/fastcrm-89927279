import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Eye, BarChart3, TrendingUp, Loader2,
} from "lucide-react";
import { useBlogStats, useBlogArticles } from "@/hooks/useBlogAdmin";
import type { SEOEntity } from "@/modules/growth-seo/types";

export default function BlogAnalytics() {
  const { data: stats, isLoading: statsLoading } = useBlogStats();
  const { data: articlesData, isLoading: articlesLoading } = useBlogArticles(
    {},
    { page: 1, pageSize: 100, sortBy: "views_count", sortOrder: "desc" }
  );

  const articles = articlesData?.articles || [];
  const topArticles = articles.slice(0, 10);
  const zeroViews = articles.filter((a) => !a.views_count && a.status === "published");

  if (statsLoading || articlesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: "Total Artigos", value: stats?.total || 0, icon: FileText, color: "text-blue-500" },
    { label: "Publicados", value: stats?.published || 0, icon: TrendingUp, color: "text-green-500" },
    { label: "Rascunhos", value: stats?.drafts || 0, icon: BarChart3, color: "text-yellow-500" },
    { label: "Total Views", value: stats?.totalViews || 0, icon: Eye, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Score */}
      {(stats?.avgAIScore ?? 0) > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{stats?.avgAIScore}%</span>
              </div>
              <div>
                <p className="font-medium text-foreground">AI Score Médio</p>
                <p className="text-sm text-muted-foreground">
                  Qualidade média calculada por IA nos artigos do blog
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Artigos por Views</CardTitle>
          </CardHeader>
          <CardContent>
            {topArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Sem artigos com views ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {topArticles.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-6 text-right">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{a.title}</p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {a.views_count || 0} views
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zero-views published */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Artigos Publicados sem Views</CardTitle>
          </CardHeader>
          <CardContent>
            {zeroViews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Todos os artigos publicados têm views. 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {zeroViews.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">/{a.slug}</p>
                    </div>
                    <Badge variant="outline" className="text-yellow-600">
                      Promover
                    </Badge>
                  </div>
                ))}
                {zeroViews.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{zeroViews.length - 10} artigos sem views
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
