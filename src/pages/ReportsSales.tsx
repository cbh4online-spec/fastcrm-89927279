import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Users,
  Euro,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

function useSalesMetrics() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['sales-metrics', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const { data: proposals } = await supabase
        .from('proposals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Opportunity metrics
      const closedWon = opportunities?.filter(o => o.status === 'closed_won') || [];
      const closedLost = opportunities?.filter(o => o.status === 'closed_lost') || [];
      const active = opportunities?.filter(o => 
        o.status !== 'closed_won' && o.status !== 'closed_lost'
      ) || [];

      const wonThisMonth = closedWon.filter(o => new Date(o.updated_at) >= startOfMonth);
      const lostThisMonth = closedLost.filter(o => new Date(o.updated_at) >= startOfMonth);

      const winRate = (closedWon.length + closedLost.length) > 0 
        ? (closedWon.length / (closedWon.length + closedLost.length)) * 100 
        : 0;

      // Proposal metrics
      const proposalsSent = proposals?.length || 0;
      const proposalsAccepted = proposals?.filter(p => p.status === 'accepted').length || 0;
      const proposalsPending = proposals?.filter(p => p.status === 'sent' || p.status === 'viewed').length || 0;

      // Pipeline by stage
      const pipelineByStage = stages?.map(stage => {
        const stageOpps = active.filter(o => o.stage_id === stage.id);
        return {
          name: stage.name,
          count: stageOpps.length,
          value: stageOpps.reduce((sum, o) => sum + (o.value || 0), 0),
          color: stage.color,
        };
      }) || [];

      // Status distribution
      const statusDistribution = [
        { name: 'Ganhas', value: closedWon.length, color: 'hsl(142, 76%, 36%)' },
        { name: 'Perdidas', value: closedLost.length, color: 'hsl(0, 84%, 60%)' },
        { name: 'Em progresso', value: active.length, color: 'hsl(217, 91%, 60%)' },
      ];

      return {
        totalPipeline: active.reduce((sum, o) => sum + (o.value || 0), 0),
        activeDeals: active.length,
        wonThisMonth: wonThisMonth.length,
        wonValueThisMonth: wonThisMonth.reduce((sum, o) => sum + (o.value || 0), 0),
        lostThisMonth: lostThisMonth.length,
        winRate,
        avgDealSize: closedWon.length > 0 
          ? closedWon.reduce((sum, o) => sum + (o.value || 0), 0) / closedWon.length 
          : 0,
        proposalsSent,
        proposalsAccepted,
        proposalsPending,
        proposalConversionRate: proposalsSent > 0 ? (proposalsAccepted / proposalsSent) * 100 : 0,
        pipelineByStage,
        statusDistribution,
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export default function ReportsSales() {
  const { data: metrics, isLoading } = useSalesMetrics();
  const [period, setPeriod] = useState("month");

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatório de Vendas</h1>
            <p className="text-muted-foreground">
              Análise do pipeline, propostas e conversões
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px]" />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Pipeline Total</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(metrics?.totalPipeline || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.activeDeals || 0} negócios ativos
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-muted-foreground">Ganhos este mês</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {metrics?.wonThisMonth || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatCurrency(metrics?.wonValueThisMonth || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {(metrics?.winRate || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Win rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground">Propostas</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {metrics?.proposalsPending || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pendentes de resposta
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline por Fase</CardTitle>
              <CardDescription>Valor e quantidade por etapa</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : metrics?.pipelineByStage && metrics.pipelineByStage.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.pipelineByStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {metrics.pipelineByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados de pipeline</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Status</CardTitle>
              <CardDescription>Oportunidades por resultado</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metrics?.statusDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {metrics?.statusDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Proposals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Métricas de Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[100px]" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Enviadas</p>
                  <p className="text-2xl font-bold">{metrics?.proposalsSent || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50">
                  <p className="text-sm text-muted-foreground">Aceites</p>
                  <p className="text-2xl font-bold text-green-700">{metrics?.proposalsAccepted || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50">
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-700">{metrics?.proposalsPending || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5">
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-primary">
                    {(metrics?.proposalConversionRate || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Average Deal Size */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics?.avgDealSize || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Baseado em</p>
                <p className="text-sm font-medium">{metrics?.wonThisMonth || 0} negócios ganhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
