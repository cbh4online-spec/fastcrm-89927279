import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Rocket, TrendingUp, Users } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ActivationOverview } from "@/features/activation/types";
import { Navigate } from "react-router-dom";

const STATUS_CONFIG = {
  activated: { label: "Ativado", variant: "default" as const },
  engaged: { label: "Engajado", variant: "secondary" as const },
  onboarding: { label: "Em onboarding", variant: "outline" as const },
  churn_risk: { label: "Risco de churn", variant: "destructive" as const },
};

export default function ActivationAdminPage() {
  const { isSuperAdmin } = useWorkspace();

  const { data: overview = [], isLoading } = useQuery({
    queryKey: ["activation-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_activation_overview" as any)
        .select("*")
        .order("activation_score", { ascending: false });
      if (error) throw error;
      return (data as unknown as ActivationOverview[]) || [];
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const total = overview.length;
  const activated = overview.filter((w) => w.activation_status === "activated").length;
  const churnRisk = overview.filter((w) => w.activation_status === "churn_risk").length;
  const avgScore = total ? overview.reduce((sum, w) => sum + Number(w.activation_score || 0), 0) / total : 0;

  // Funil por meta — agregar do breakdown
  const goalsTotalCount: Record<string, number> = {};
  const goalsCompletedCount: Record<string, number> = {};
  for (const w of overview) {
    for (const [cat, info] of Object.entries(w.category_breakdown || {})) {
      goalsTotalCount[cat] = (goalsTotalCount[cat] || 0) + (info?.total || 0);
      goalsCompletedCount[cat] = (goalsCompletedCount[cat] || 0) + (info?.completed || 0);
    }
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ativação de workspaces</h1>
        <p className="text-muted-foreground">Funil de ativação, ranking e alertas de churn risk.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Users className="size-3.5" /> Workspaces totais</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Rocket className="size-3.5" /> Ativados (≥80%)</CardDescription>
            <CardTitle className="text-3xl">{activated}</CardTitle>
            <p className="text-xs text-muted-foreground">{total ? Math.round((activated / total) * 100) : 0}% do total</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><TrendingUp className="size-3.5" /> Score médio</CardDescription>
            <CardTitle className="text-3xl">{Math.round(avgScore)}</CardTitle>
            <Progress value={avgScore} className="h-1 mt-2" />
          </CardHeader>
        </Card>
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="size-3.5" /> Risco de churn</CardDescription>
            <CardTitle className="text-3xl text-destructive">{churnRisk}</CardTitle>
            <p className="text-xs text-muted-foreground">&lt;30% após 7+ dias</p>
          </CardHeader>
        </Card>
      </div>

      {/* Funil por categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de ativação por categoria</CardTitle>
          <CardDescription>% médio de conclusão em cada pilar do onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(goalsTotalCount).map((cat) => {
            const t = goalsTotalCount[cat];
            const c = goalsCompletedCount[cat];
            const pct = t ? (c / t) * 100 : 0;
            return (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium capitalize">{cat.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{Math.round(pct)}% • {c}/{t}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de workspaces</CardTitle>
          <CardDescription>Ordenado por score de ativação.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Metas</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>Wizard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.map((w) => {
                  const cfg = STATUS_CONFIG[w.activation_status] || STATUS_CONFIG.onboarding;
                  return (
                    <TableRow key={w.workspace_id}>
                      <TableCell className="font-medium">{w.workspace_name}</TableCell>
                      <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(Number(w.activation_score))}%</TableCell>
                      <TableCell className="text-right tabular-nums">{w.goals_completed}/{w.goals_total}</TableCell>
                      <TableCell className="text-right tabular-nums">{w.days_since_signup}</TableCell>
                      <TableCell>
                        {w.wizard_completed_at ? (
                          <Badge variant="secondary">Concluído</Badge>
                        ) : w.wizard_skipped ? (
                          <Badge variant="outline">Saltado</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
