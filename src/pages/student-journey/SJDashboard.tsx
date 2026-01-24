import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, RefreshCw } from "lucide-react";
import { useProfiles } from "@/hooks/useStudentJourney";
import { useJourneyTransitions } from "@/hooks/useJourneyTransitions";
import { 
  JourneyKPIs, 
  ActionableList, 
  WeeklyContacts, 
  SuccessMetrics,
  QuickActionsPanel,
} from "@/components/student-journey/dashboard";
import { DashboardOpportunitiesCard } from "@/components/student-journey/recommendations";
import { JourneyFunnel } from "@/components/student-journey/journey";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { ImportProfilesDialog } from "@/components/student-journey/ImportProfilesDialog";
import { SJCopilotDrawer } from "@/components/student-journey/SJCopilotDrawer";
import { toast } from "sonner";

export default function SJDashboard() {
  const { profiles } = useProfiles();
  const { 
    journeyProfiles,
    funnelStats, 
    activationCandidates, 
    atRiskProfiles, 
    readyForContact,
    checkAutoTransitions,
    isLoading 
  } = useJourneyTransitions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // High potential profiles (high activation score, completed courses)
  const highPotentialProfiles = journeyProfiles
    .filter(jp => jp.activationScore >= 70 && jp.completedEnrollments > 0)
    .sort((a, b) => b.activationScore - a.activationScore);

  // Underutilized base (alumni with low recent activity)
  const underutilizedBase = journeyProfiles
    .filter(jp => 
      jp.completedEnrollments > 0 && 
      jp.daysSinceLastActivity > 30 &&
      !['inactive'].includes(jp.currentState)
    )
    .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);

  const handleAutoTransitions = async () => {
    setIsRefreshing(true);
    try {
      const count = await checkAutoTransitions();
      if (count === 0) {
        toast.info("Nenhuma transição automática aplicável");
      }
    } catch (error) {
      toast.error("Erro ao verificar transições");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Student Journey</h1>
          <p className="text-muted-foreground">
            Ativação, acompanhamento e crescimento da base de alunos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAutoTransitions}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Estados
          </Button>
          <ImportProfilesDialog />
          <Button
            variant="outline"
            onClick={() => setCopilotOpen(true)}
            className="gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            Assistente IA
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        </div>
      </div>

      {/* KPIs Row */}
      <JourneyKPIs 
        stats={funnelStats} 
        totalProfiles={profiles.length}
        isLoading={isLoading} 
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <QuickActionsPanel />
          <JourneyFunnel stats={funnelStats} />
        </div>

        {/* Right: Action Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Opportunities */}
          <DashboardOpportunitiesCard minScore={70} maxItems={5} />

          {/* Success Metrics */}
          <SuccessMetrics />

          {/* Weekly Contacts */}
          <WeeklyContacts profiles={profiles} maxItems={5} />

          {/* Three Action Lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionableList
              title="Para Ativar"
              subtitle="Concluídos prontos para nova jornada"
              profiles={activationCandidates}
              emptyMessage="Nenhum candidato para ativação"
              variant="activation"
              viewAllLink="/dashboard/student-journey/profiles?stage=completed_active"
            />
            <ActionableList
              title="Alto Potencial"
              subtitle="Score ≥70%, cursos completados"
              profiles={highPotentialProfiles}
              emptyMessage="Nenhum perfil de alto potencial"
              variant="contact"
              viewAllLink="/dashboard/student-journey/profiles?potential=high"
            />
            <ActionableList
              title="Base Subaproveitada"
              subtitle="Alumni sem atividade recente"
              profiles={underutilizedBase}
              emptyMessage="Base está bem aproveitada!"
              variant="risk"
              viewAllLink="/dashboard/student-journey/profiles?inactive=true"
            />
          </div>
        </div>
      </div>

      {/* At Risk Section (if any) */}
      {atRiskProfiles.length > 0 && (
        <div className="mt-6">
          <ActionableList
            title="Em Risco de Inativação"
            subtitle="Aproximando-se do limiar de inatividade"
            profiles={atRiskProfiles}
            emptyMessage="Nenhum perfil em risco"
            variant="risk"
            maxItems={8}
            viewAllLink="/dashboard/student-journey/profiles?risk=true"
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateProfileDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <SJCopilotDrawer open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
