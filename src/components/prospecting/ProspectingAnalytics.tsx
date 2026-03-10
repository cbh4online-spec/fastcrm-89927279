import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Target, Coins, TrendingUp, Activity } from "lucide-react";
import { useCreditWallet } from "@/hooks/useCreditWallet";

export function ProspectingAnalytics() {
  const { currentWorkspace } = useWorkspace();
  const { ledger } = useCreditWallet();

  // Filter prospecting-related ledger entries
  const prospectingLedger = ledger.filter(
    (e) => e.module === "prospecting" && e.direction === "debit"
  );

  // Get current month stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const thisMonthEntries = prospectingLedger.filter(
    (e) => e.created_at >= startOfMonth
  );

  const totalCreditsSpent = thisMonthEntries.reduce(
    (sum, e) => sum + Math.abs(e.credits_amount),
    0
  );

  const searchCount = thisMonthEntries.filter(
    (e) =>
      e.action_key.includes("search")
  ).length;

  const leadImports = thisMonthEntries.filter(
    (e) => e.action_key === "prospecting_lead_import"
  ).length;

  const aiActions = thisMonthEntries.filter(
    (e) =>
      e.action_key.includes("ai_enrich") ||
      e.action_key.includes("ai_qualify") ||
      e.action_key.includes("bulk_outreach")
  ).length;

  // Fetch leads from prospecting sources
  const { data: prospectingLeadsCount = 0 } = useQuery({
    queryKey: ["prospecting-leads-count", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .in("source", ["google_local", "web_search", "instagram", "professional_prospecting"]);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  const kpis = [
    {
      label: "Pesquisas este mês",
      value: searchCount,
      icon: Search,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Leads importados",
      value: leadImports,
      icon: Users,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Ações IA",
      value: aiActions,
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Créditos gastos",
      value: totalCreditsSpent,
      icon: Coins,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total leads from prospecting */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Total de Leads via Prospecção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{prospectingLeadsCount}</span>
            <span className="text-sm text-muted-foreground">leads gerados</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Leads importados de todas as fontes de prospecção (Google Local, Web, Profissionais)
          </p>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {thisMonthEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma atividade de prospecção este mês.
            </p>
          ) : (
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {thisMonthEntries.slice(0, 15).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-foreground">
                      {entry.description || entry.action_key}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Coins className="h-3 w-3" />
                    {Math.abs(entry.credits_amount)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
