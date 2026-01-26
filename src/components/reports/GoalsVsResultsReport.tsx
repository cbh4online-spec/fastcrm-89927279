import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalComparisonCard } from "./GoalComparisonCard";
import { useGoalsVsResults, useGoalsVsResultsSummary, type GoalsVsResultsFilters } from "@/hooks/useGoalsVsResults";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import type { GoalPeriod, GoalScope } from "@/hooks/useProductivityCoach";

const PERIOD_OPTIONS: { value: GoalPeriod | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os Períodos' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

const SCOPE_OPTIONS: { value: GoalScope | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'individual', label: 'Individual' },
  { value: 'organizational', label: 'Organizacional' },
];

export function GoalsVsResultsReport() {
  const { currentWorkspace } = useWorkspace();
  const [filters, setFilters] = useState<GoalsVsResultsFilters>({
    period: 'all',
    memberId: 'all',
    scope: 'all',
  });

  // Fetch workspace members for filter
  const { data: members } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id, role, profiles:user_id(full_name, email)')
        .eq('workspace_id', currentWorkspace.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const { data: goalsData, isLoading, refetch, isFetching } = useGoalsVsResults(filters);
  const summary = useGoalsVsResultsSummary(goalsData);

  // Group goals by period
  const goalsByPeriod = goalsData?.reduce((acc, g) => {
    const period = g.goal.period;
    if (!acc[period]) acc[period] = [];
    acc[period].push(g);
    return acc;
  }, {} as Record<string, typeof goalsData>) || {};

  const periodOrder: GoalPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'];
  const periodLabels: Record<string, string> = {
    daily: 'Diárias',
    weekly: 'Semanais',
    monthly: 'Mensais',
    quarterly: 'Trimestrais',
    semiannual: 'Semestrais',
    annual: 'Anuais',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Metas vs Resultados
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compare as metas definidas com os dados reais da base de dados
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Período
              </label>
              <Select
                value={filters.period}
                onValueChange={(value) => setFilters(f => ({ ...f, period: value as GoalPeriod | 'all' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Membro
              </label>
              <Select
                value={filters.memberId}
                onValueChange={(value) => setFilters(f => ({ ...f, memberId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Membros</SelectItem>
                  {members?.map(member => {
                    const profile = member.profiles as { full_name?: string; email?: string } | null;
                    return (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {profile?.full_name || profile?.email || member.user_id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Âmbito
              </label>
              <Select
                value={filters.scope}
                onValueChange={(value) => setFilters(f => ({ ...f, scope: value as GoalScope | 'all' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : `${summary.completedGoals}/${summary.totalGoals}`}
                </p>
                <p className="text-xs text-muted-foreground">Metas Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : `${summary.globalProgress.toFixed(0)}%`}
                </p>
                <p className="text-xs text-muted-foreground">Progresso Global</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : summary.aheadCount + summary.onTrackCount}
                </p>
                <p className="text-xs text-muted-foreground">No Prazo / Acima</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : summary.atRiskCount + summary.behindCount}
                </p>
                <p className="text-xs text-muted-foreground">Em Risco / Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals by Period */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goalsData && goalsData.length > 0 ? (
        <div className="space-y-6">
          {periodOrder.map(period => {
            const goals = goalsByPeriod[period];
            if (!goals || goals.length === 0) return null;

            return (
              <Card key={period}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {periodLabels[period]} 
                    <span className="text-muted-foreground font-normal text-sm">
                      ({goals.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goals.map(goalData => (
                    <GoalComparisonCard key={goalData.goal.id} goalData={goalData} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma meta encontrada
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Defina metas no Coach de Produtividade para ver a comparação com os resultados reais aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
