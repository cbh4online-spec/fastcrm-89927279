import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumDashboardHeader } from "@/components/weekly-dashboard/PremiumDashboardHeader";
import { PremiumAISection } from "@/components/weekly-dashboard/PremiumAISection";
import { ImmediateAttentionBanner } from "@/components/weekly-dashboard/ImmediateAttentionBanner";
import { PremiumKPICards } from "@/components/weekly-dashboard/PremiumKPICards";
import { RevenueTargetStrip } from "@/components/weekly-dashboard/RevenueTargetStrip";
import { QuarterGoalsProjection } from "@/components/weekly-dashboard/QuarterGoalsProjection";
import { PriorityDealsTable } from "@/components/weekly-dashboard/PriorityDealsTable";
import { TodayActionPlan } from "@/components/weekly-dashboard/TodayActionPlan";
import { WeeklyHistoryCharts } from "@/components/weekly-dashboard/WeeklyHistoryCharts";
import { QuickAccessFooter } from "@/components/weekly-dashboard/QuickAccessFooter";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";
import { AdaptiveProfileSetup } from "@/components/adaptive-dashboard/AdaptiveProfileSetup";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Lightbulb, Target } from "lucide-react";
import { WarRoomBriefingExport } from "@/components/weekly-dashboard/WarRoomBriefingExport";
import { ClockInOutButton } from "@/components/hr/ClockInOutButton";
import { IXSection } from "@/components/weekly-dashboard/IXSection";
import { VisaoGlobalSection } from "@/components/weekly-dashboard/VisaoGlobalSection";

export default function WeeklyDashboard() {
  const { data, isLoading } = useWeeklyPerformance();
  const { strategy, isLoading: strategyLoading, generate } = useWeeklyStrategy();
  const { todaysBrief } = useDailyBrief();
  const weekLabel = data?.weekLabel || "...";
  const { currentWorkspace } = useWorkspace();
  const { openDecisions } = useKernelDecisions();
  const { needsSetup, isLoading: adaptiveLoading } = useAdaptiveDashboard();
  const [setupDismissed, setSetupDismissed] = useState(false);
  const navigate = useNavigate();

  const briefMetrics = todaysBrief?.key_metrics;

  return (
    <DashboardLayout>
      {/* Profile setup gate */}
      <AdaptiveProfileSetup
        open={!!needsSetup && !setupDismissed}
        onComplete={() => setSetupDismissed(true)}
      />

      {/* Fundo claro estilo InvoiceXpress */}
      <div className="bg-muted/30 min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
          {/* Cabeçalho executivo + pica-ponto */}
          <div className="space-y-4">
            <PremiumDashboardHeader
              revenueToday={briefMetrics?.revenue_today ?? null}
              hotLeadsCount={briefMetrics?.leads_today ?? 0}
              pendingDecisions={openDecisions.length}
            />
            <ClockInOutButton />
          </div>

          {/* War Room — primeira secção operacional */}
          <IXSection
            title="War Room"
            subtitle={`Situação da semana ${weekLabel} — receita vs. meta`}
            actions={
              <>
                <WarRoomBriefingExport
                  metrics={data?.metrics || []}
                  pipelineValue={data?.pipelineValue ?? 0}
                  weekLabel={weekLabel}
                  todaysBrief={todaysBrief}
                  strategy={strategy}
                  workspaceName={currentWorkspace?.name}
                  workspaceLogoUrl={currentWorkspace?.logo_url}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/performance/metrics")}
                  className="gap-1.5"
                >
                  <Target className="h-3.5 w-3.5" />
                  Definir Metas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generate}
                  disabled={strategyLoading}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${strategyLoading ? "animate-spin" : ""}`}
                  />
                  Atualizar
                </Button>
              </>
            }
            bare
          >
            <RevenueTargetStrip
              metrics={data?.metrics || []}
              pipelineValue={data?.pipelineValue ?? 0}
              isLoading={isLoading}
            />
          </IXSection>

          {/* Visão Global — KPIs financeiros principais */}
          <VisaoGlobalSection />

          {/* Alertas imediatos — sempre visíveis no topo */}
          <IXSection
            title="Alertas imediatos"
            subtitle="Situações que precisam da tua atenção agora"
            bare
          >
            <ImmediateAttentionBanner
              metrics={data?.metrics || []}
              isLoading={isLoading}
            />
          </IXSection>

          {/* Conteúdo organizado em separadores */}
          <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="actions">Ações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="ai">IA & Atalhos</TabsTrigger>
            </TabsList>

            {/* Performance — KPIs, War Room e Metas */}
            <TabsContent value="performance" className="space-y-8 mt-6">
              <IXSection
                title="Performance"
                subtitle="Indicadores principais e valor de pipeline"
                bare
              >
                <PremiumKPICards
                  metrics={data?.metrics || []}
                  pipelineValue={data?.pipelineValue ?? 0}
                  isLoading={isLoading}
                />
              </IXSection>

              <IXSection
                title="Metas do trimestre"
                subtitle="Projeção e progresso face aos objetivos definidos"
                bare
              >
                <QuarterGoalsProjection
                  metrics={data?.metrics || []}
                  isLoading={isLoading}
                />
              </IXSection>
            </TabsContent>

            {/* Ações — oportunidades e plano diário */}
            <TabsContent value="actions" className="space-y-8 mt-6">
              <IXSection
                id="today-action-plan"
                title="Oportunidades e Ações"
                subtitle="Negócios prioritários e plano de ação para hoje"
                actions={
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span>Foco diário</span>
                  </div>
                }
                bare
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PriorityDealsTable />
                  <TodayActionPlan />
                </div>
              </IXSection>
            </TabsContent>

            {/* Histórico — evolução semanal */}
            <TabsContent value="history" className="space-y-8 mt-6">
              <IXSection
                title="Evolução semanal"
                subtitle="Histórico recente de receita, conversões e atividade"
                bare
              >
                <WeeklyHistoryCharts />
              </IXSection>
            </TabsContent>

            {/* IA & Atalhos */}
            <TabsContent value="ai" className="space-y-8 mt-6">
              <IXSection
                title="Assistente de Vendas IA"
                subtitle="Recomendações e estratégia gerada para esta semana"
                bare
              >
                <PremiumAISection />
              </IXSection>

              <IXSection
                title="Acesso rápido"
                subtitle="Atalhos para as áreas mais usadas"
                bare
              >
                <QuickAccessFooter />
              </IXSection>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
