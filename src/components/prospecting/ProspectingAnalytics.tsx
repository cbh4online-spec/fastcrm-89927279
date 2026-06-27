import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Target, Coins, TrendingUp, Activity, Globe, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { useProspectingSearchHistory } from "@/hooks/useProspectingSearchHistory";
import { format, startOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { pt } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export function ProspectingAnalytics() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { ledger } = useCreditWallet();
  const { searches: googleSearches, isLoading: glLoading } = useProspectingSearchHistory("google_local");
  const { searches: webSearches, isLoading: wlLoading } = useProspectingSearchHistory("web_search");

  const now = new Date();
  const currentMonthStart = startOfMonth(now).toISOString();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const lastMonthEnd = startOfMonth(now).toISOString();

  // Combine all searches
  const allSearches = [...(googleSearches || []), ...(webSearches || [])];
  const thisMonthSearches = allSearches.filter(s => s.created_at >= currentMonthStart);
  const lastMonthSearches = allSearches.filter(s => s.created_at >= lastMonthStart && s.created_at < lastMonthEnd);

  // Current month stats from search history
  const totalSearches = thisMonthSearches.length;
  const totalResults = thisMonthSearches.reduce((sum, s) => sum + (s.results_count || 0), 0);
  const totalImported = thisMonthSearches.reduce((sum, s) => sum + (s.imported_count || 0), 0);
  const googleCount = thisMonthSearches.filter(s => s.search_type === "google_local").length;
  const webCount = thisMonthSearches.filter(s => s.search_type === "web_search").length;

  // Last month for comparison
  const lastMonthTotal = lastMonthSearches.length;
  const lastMonthImported = lastMonthSearches.reduce((sum, s) => sum + (s.imported_count || 0), 0);

  // Conversion rate
  const conversionRate = totalResults > 0 ? Math.round((totalImported / totalResults) * 100) : 0;

  // Credit consumption — estimate from searches if ledger is empty
  const prospectingLedger = ledger.filter(
    (e) => e.module === "prospecting" && e.direction === "debit"
  );
  const ledgerCredits = prospectingLedger
    .filter((e) => e.created_at >= currentMonthStart)
    .reduce((sum, e) => sum + Math.abs(e.credits_amount), 0);
  // Fallback: estimate 2 credits per search if no ledger entries
  const thisMonthCredits = ledgerCredits > 0 ? ledgerCredits : totalSearches * 2;

  // Fetch leads from prospecting sources
  const { data: prospectingLeadsCount = 0 } = useQuery({
    queryKey: ["prospecting-leads-count", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return 0;
      const { count, error } = await (supabase as any)
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("source", ["google_local", "web_search", "instagram", "professional_prospecting"]);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!workspaceId,
  });

  // Weekly chart data (last 8 weeks)
  const eightWeeksAgo = subMonths(now, 2);
  const weeks = eachWeekOfInterval({ start: eightWeeksAgo, end: now }, { weekStartsOn: 1 });
  const weeklyData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekSearches = allSearches.filter(s => {
      const d = new Date(s.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    return {
      week: format(weekStart, "d MMM", { locale: pt }),
      google: weekSearches.filter(s => s.search_type === "google_local").length,
      web: weekSearches.filter(s => s.search_type === "web_search").length,
      imported: weekSearches.reduce((sum, s) => sum + (s.imported_count || 0), 0),
    };
  });

  // Source distribution for pie chart
  const sourceData = [
    { name: "Google Local", value: googleCount, color: "#3b82f6" },
    { name: "Web Search", value: webCount, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const isLoading = glLoading || wlLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const getDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const searchDelta = getDelta(totalSearches, lastMonthTotal);
  const importDelta = getDelta(totalImported, lastMonthImported);

  const kpis = [
    {
      label: "Pesquisas este mês",
      value: totalSearches,
      icon: Search,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      delta: searchDelta,
      detail: `${totalResults} resultados encontrados`,
    },
    {
      label: "Leads importados",
      value: totalImported,
      icon: Users,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      delta: importDelta,
      detail: `${conversionRate}% taxa de conversão`,
    },
    {
      label: "Total leads prospeção",
      value: prospectingLeadsCount,
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      detail: "Todas as fontes",
    },
    {
      label: "Créditos gastos",
      value: thisMonthCredits,
      icon: Coins,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      detail: `${prospectingLedger.length} transações total`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards — flat IX */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {kpi.delta !== undefined && kpi.delta !== 0 && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${kpi.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {kpi.delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(kpi.delta)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            {kpi.detail && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">{kpi.detail}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly activity chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-foreground">Atividade semanal</h3>
            <p className="text-xs text-muted-foreground">Pesquisas e importações por semana</p>
          </div>
          {weeklyData.some(w => w.google > 0 || w.web > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="google" name="Google Local" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="web" name="Web Search" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="imported" name="Importados" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Sem dados de pesquisa para mostrar</p>
              <p className="text-xs mt-1">Faça pesquisas de prospeção para ver a atividade aqui</p>
            </div>
          )}
        </div>

        {/* Source distribution */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground mb-3">Fontes este mês</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {sourceData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} pesquisas`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <Target className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma pesquisa este mês</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold text-foreground mb-3">Atividade recente</h3>
        {thisMonthSearches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma atividade de prospeção este mês.
          </p>
        ) : (
          <div className="divide-y divide-border max-h-64 overflow-y-auto -mx-1">
            {thisMonthSearches.slice(0, 15).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 px-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {entry.search_type === "google_local"
                      ? <Globe className="h-4 w-4 text-muted-foreground" />
                      : <Search className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "d MMM, HH:mm", { locale: pt })}
                      {entry.location && ` • 📍 ${entry.location}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs font-normal">{entry.results_count} resultados</Badge>
                  {entry.imported_count > 0 && (
                    <Badge variant="outline" className="text-xs font-normal">{entry.imported_count} importados</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
