import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Target, Coins, Globe, BarChart3, ArrowUpRight, ArrowDownRight, Instagram } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { activitySince, SOURCE_LABELS, summarizeProspectingActivity, type SearchActivity, type ProspectingSource } from "@/lib/prospecting/analytics";

const LEAD_SOURCES = ["google_local", "web_search", "professional_prospecting", "instagram_extractor", "instagram_looter"];
const PAGE_SIZE = 500;
const OPERATION_SOURCES: Record<string, ProspectingSource> = {
  prospecting_google_local_search: "google_local",
  prospecting_web_search: "web_search",
  prospecting_professional_search: "professional",
};

function responseCount(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const count = Number(value);
    if (Number.isSafeInteger(count) && count >= 0) return count;
  }
  return 0;
}

async function fetchAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}

export function ProspectingAnalytics() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const now = new Date();
  const monthKey = format(now, "yyyy-MM");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["prospecting-analytics", workspaceId, monthKey],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = activitySince(new Date());
      const [operations, extraction, leads, ledger, leadTotal] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON path selects exceed TS instantiation depth
        fetchAllPages((from, to) => (supabase as any).from("prospecting_search_operations")
          .select("id, action_key, created_at, result_count:response_data->>count, web_total:response_data->>total, query:response_data->>query")
          .eq("workspace_id", workspaceId!).eq("status", "completed").gte("created_at", since)
          .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
        fetchAllPages((from, to) => supabase.from("instagram_extraction_jobs")
          .select("id, target, source, found_count, created_at")
          .eq("workspace_id", workspaceId!).eq("status", "completed").gte("created_at", since)
          .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
        fetchAllPages((from, to) => supabase.from("leads")
          .select("id, created_at").eq("workspace_id", workspaceId!).in("source", LEAD_SOURCES)
          .gte("created_at", since).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
        fetchAllPages((from, to) => supabase.from("credit_ledger")
          .select("id, credits_amount, created_at").eq("workspace_id", workspaceId!)
          .eq("module", "prospecting").eq("direction", "debit").eq("status", "completed")
          .gte("created_at", since).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId!).in("source", LEAD_SOURCES),
      ]);
      if (leadTotal.error) throw leadTotal.error;
      const searches: SearchActivity[] = [
        ...operations.flatMap((row) => {
          const source = OPERATION_SOURCES[row.action_key];
          if (!source) return [];
          return [{
            id: row.id,
            source,
            title: row.query || SOURCE_LABELS[source],
            location: null,
            results_count: responseCount(row.result_count, row.web_total),
            created_at: row.created_at,
          }];
        }),
        ...extraction.map((row) => ({ id: row.id, source: "instagram_extraction" as const, title: `${row.source}: ${row.target}`, location: null, results_count: row.found_count, created_at: row.created_at })),
      ];
      return { summary: summarizeProspectingActivity(searches, leads, ledger, new Date()), totalLeads: leadTotal.count ?? 0 };
    },
  });

  if (isLoading) return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  if (isError || !data) return <p className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Não foi possível carregar as métricas de prospeção.</p>;

  const { summary, totalLeads } = data;
  const delta = (current: number, previous: number) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const kpis = [
    { label: "Pesquisas e extrações", value: summary.totalSearches, icon: Search, delta: delta(summary.totalSearches, summary.lastMonthSearches), detail: `${summary.totalResults} resultados registados este mês` },
    { label: "Leads de prospeção criados", value: summary.importedLeads, icon: Users, delta: delta(summary.importedLeads, summary.lastMonthLeads), detail: "Pela data de criação do lead" },
    { label: "Total de leads de prospeção", value: totalLeads, icon: Target, delta: null, detail: "Todas as fontes identificadas" },
    { label: "Créditos gastos", value: summary.creditsSpent, icon: Coins, delta: null, detail: "Débitos confirmados este mês" },
  ];
  const weeklyData = summary.weekly.map((week) => ({ week: format(week.start, "d MMM", { locale: pt }), google: week.google, web: week.web, professional: week.professional, instagram: week.instagram, imported: week.imported }));
  const sourceData = [
    { key: "google_local" as const, value: summary.counts.google_local, color: "#3b82f6" },
    { key: "web_search" as const, value: summary.counts.web_search, color: "#f59e0b" },
    { key: "professional" as const, value: summary.counts.professional, color: "#8b5cf6" },
    { key: "instagram_extraction" as const, value: summary.counts.instagram_extraction, color: "#ec4899" },
  ].filter((entry) => entry.value > 0).map((entry) => ({ ...entry, name: SOURCE_LABELS[entry.key] }));

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{kpis.map((kpi) => <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><kpi.icon className="h-4 w-4 text-muted-foreground" /></div>
        {kpi.delta !== null && kpi.delta !== 0 && <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${kpi.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>{kpi.delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(kpi.delta)}%</span>}
      </div><p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p><p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p><p className="text-[11px] text-muted-foreground/70 mt-1">{kpi.detail}</p>
    </div>)}</div>

    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2"><div className="mb-3"><h3 className="text-base font-semibold text-foreground">Atividade semanal</h3><p className="text-xs text-muted-foreground">Pesquisas concluídas, extrações e leads criados por semana</p></div>
        {weeklyData.some((week) => week.google || week.web || week.professional || week.instagram || week.imported) ? <ResponsiveContainer width="100%" height={240}><BarChart data={weeklyData} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" /><XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" /><YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
          <Bar dataKey="google" name="Google Local" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="web" name="Web Search" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="professional" name="Profissionais" fill="#8b5cf6" radius={[4, 4, 0, 0]} /><Bar dataKey="instagram" name="Instagram" fill="#ec4899" radius={[4, 4, 0, 0]} /><Bar dataKey="imported" name="Leads criados" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer> : <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground"><BarChart3 className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">Sem atividade registada para mostrar</p></div>}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5"><h3 className="text-base font-semibold text-foreground mb-3">Fontes este mês</h3>
        {sourceData.length > 0 ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">{sourceData.map((entry) => <Cell key={entry.key} fill={entry.color} />)}</Pie>
          <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number) => [`${value} operações`, ""]} />
        </PieChart></ResponsiveContainer> : <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground"><Target className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">Nenhuma operação este mês</p></div>}
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-card p-5"><h3 className="text-base font-semibold text-foreground mb-3">Atividade recente</h3>
      {summary.thisMonthSearches.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma pesquisa ou extração concluída este mês.</p> : <div className="divide-y divide-border max-h-64 overflow-y-auto -mx-1">{summary.thisMonthSearches.slice(0, 15).map((entry) => <div key={`${entry.source}-${entry.id}`} className="flex items-center justify-between py-2.5 px-1">
        <div className="flex items-center gap-3 min-w-0"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">{entry.source === "google_local" ? <Globe className="h-4 w-4 text-muted-foreground" /> : entry.source === "instagram_extraction" ? <Instagram className="h-4 w-4 text-muted-foreground" /> : <Search className="h-4 w-4 text-muted-foreground" />}</div>
          <div className="min-w-0"><p className="text-sm text-foreground truncate">{entry.title}</p><p className="text-xs text-muted-foreground">{SOURCE_LABELS[entry.source]} · {format(new Date(entry.created_at), "d MMM, HH:mm", { locale: pt })}{entry.location && ` · ${entry.location}`}</p></div></div>
        <Badge variant="secondary" className="text-xs font-normal shrink-0">{entry.results_count} resultados</Badge>
      </div>)}</div>}
    </div>
  </div>;
}
