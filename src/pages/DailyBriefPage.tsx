
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, RefreshCw, Users, DollarSign, AlertTriangle,
  CheckSquare, TrendingUp, Flame, Lock, Lightbulb, Clock,
} from "lucide-react";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { formatDate, formatRelativeTime, formatCurrency } from "@/lib/formatters";

export default function DailyBriefPage() {
  const { briefs, todaysBrief, isLoading, isGenerating, generateDailyBrief } = useDailyBrief();
  const metrics = todaysBrief?.key_metrics;

  const kpis = [
    { label: "Leads Hoje", value: metrics?.leads_today ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Receita Hoje", value: formatCurrency(metrics?.revenue_today ?? 0), icon: DollarSign, color: "text-emerald-400" },
    { label: "Deals Travados", value: metrics?.deals_stalled ?? 0, icon: AlertTriangle, color: "text-amber-400" },
    { label: "Tarefas", value: `${metrics?.tasks_completed ?? 0}/${(metrics?.tasks_completed ?? 0) + (metrics?.tasks_pending ?? 0)}`, icon: CheckSquare, color: "text-violet-400" },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Daily Revenue Brief"
          description={`Resumo executivo das últimas 24h — ${formatDate(new Date(), "dd MMMM yyyy")}`}
          actions={[
            {
              label: isGenerating ? "A gerar..." : "Gerar Brief",
              icon: <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />,
              onClick: generateDailyBrief,
              disabled: isGenerating,
            },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : !todaysBrief ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Newspaper className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum brief diário gerado</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Gere o seu primeiro Daily Revenue Brief para obter um resumo executivo das últimas 24h.
              </p>
              <Button onClick={generateDailyBrief} disabled={isGenerating}>
                {isGenerating ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> A gerar...</> : "Gerar Agora"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Summary */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-primary" /> Resumo Executivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{todaysBrief.summary}</p>
                  {todaysBrief.revenue_highlight && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-400 font-medium">💰 {todaysBrief.revenue_highlight}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hot Leads */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Flame className="h-4 w-4 text-orange-400" /> Leads Quentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{todaysBrief.hot_leads || "Sem leads quentes hoje."}</p>
                </CardContent>
              </Card>

              {/* Stuck Deals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4 text-amber-400" /> Deals Travados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{todaysBrief.stuck_deals || "Nenhum deal travado."}</p>
                </CardContent>
              </Card>

              {/* Action Suggestions */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-yellow-400" /> Sugestões de Ação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todaysBrief.action_suggestions && todaysBrief.action_suggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {todaysBrief.action_suggestions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">{i + 1}</Badge>
                          <span className="text-sm text-muted-foreground">{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem sugestões disponíveis.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            {briefs.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Últimos Briefs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {briefs.slice(1).map((brief) => (
                      <div key={brief.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{formatDate(brief.created_at, "dd MMM yyyy, HH:mm")}</span>
                            <span className="text-xs text-muted-foreground">{formatRelativeTime(brief.created_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{brief.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
