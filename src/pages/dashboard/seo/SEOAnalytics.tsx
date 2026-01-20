import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Eye,
  Sparkles,
  CheckCircle,
  FileEdit,
  Archive,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSEOStats, useTopPerformingPages } from "@/modules/growth-seo/hooks/useAdminSEOEntities";
import type { EntityType } from "@/modules/growth-seo/types";

const typeColors: Record<EntityType, string> = {
  keyword: "#3b82f6",
  template: "#8b5cf6",
  category: "#f59e0b",
  tool: "#22c55e",
  glossary: "#64748b",
  guide: "#6366f1",
  blog: "#ec4899",
  profile: "#06b6d4",
};

const typeLabels: Record<EntityType, string> = {
  keyword: "Palavras-chave",
  template: "Templates",
  category: "Categorias",
  tool: "Ferramentas",
  glossary: "Glossário",
  guide: "Guias",
  blog: "Blog",
  profile: "Perfis",
};

export function SEOAnalytics() {
  const { data: stats, isLoading: statsLoading } = useSEOStats();
  const { data: topPages, isLoading: topLoading } = useTopPerformingPages(10);

  const typeChartData = stats?.byType
    ? Object.entries(stats.byType).map(([key, value]) => ({
        name: typeLabels[key as EntityType] || key,
        value,
        color: typeColors[key as EntityType] || "#94a3b8",
      }))
    : [];

  const barChartData = topPages?.map((page) => ({
    name: page.title.length > 25 ? page.title.slice(0, 25) + "..." : page.title,
    views: page.views_count,
    type: page.entity_type,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Páginas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Todas as entidades SEO
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalViews?.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Visualizações totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score IA Médio</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.avgAIScore || 0}
                <span className="text-lg text-muted-foreground">%</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Qualidade do conteúdo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Estado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {stats?.byStatus?.published || 0}
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <FileEdit className="h-3 w-3 mr-1" />
                  {stats?.byStatus?.draft || 0}
                </Badge>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <Archive className="h-3 w-3 mr-1" />
                  {stats?.byStatus?.archived || 0}
                </Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Publicados / Rascunhos / Arquivados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Quantidade de entidades por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : typeChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Quantidade"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Páginas</CardTitle>
            <CardDescription>Páginas com mais visualizações</CardDescription>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="h-[300px] space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !barChartData?.length ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), "Views"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="views"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Páginas com Melhor Performance</CardTitle>
          <CardDescription>Detalhes das páginas mais visualizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {topLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !topPages?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Sem dados disponíveis
            </div>
          ) : (
            <div className="space-y-2">
              {topPages.map((page, index) => (
                <div
                  key={page.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{page.title}</p>
                    <p className="text-sm text-muted-foreground">
                      /{page.entity_type}s/{page.slug}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: `${typeColors[page.entity_type as EntityType]}15`,
                      color: typeColors[page.entity_type as EntityType],
                      borderColor: typeColors[page.entity_type as EntityType],
                    }}
                  >
                    {typeLabels[page.entity_type as EntityType]}
                  </Badge>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">
                      {page.views_count.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
