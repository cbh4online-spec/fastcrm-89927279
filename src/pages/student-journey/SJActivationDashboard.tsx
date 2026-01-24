import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  TrendingUp,
  UserPlus,
  Bell,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useSJActivation } from "@/hooks/useSJActivation";
import { 
  ActivationKPIs, 
  ProgressionCandidatesList, 
  LeadFunnelCard,
  ActivationAlertsCard 
} from "@/components/student-journey/activation";
import { CreateProfileDialog } from "@/components/student-journey/CreateProfileDialog";
import { SJCopilotDrawer } from "@/components/student-journey/SJCopilotDrawer";

export default function SJActivationDashboard() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "progression" | "leads">("overview");
  
  const { 
    progressionCandidates, 
    leadFunnel, 
    activationAlerts, 
    growthMetrics,
    isLoading 
  } = useSJActivation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Ativação & Crescimento
          </h1>
          <p className="text-muted-foreground">
            Progressão de alumni e captação de novos alunos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/30"
            onClick={() => setCopilotOpen(true)}
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            Assistente IA
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <ActivationKPIs metrics={growthMetrics} isLoading={isLoading} />

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Prontos Agora</p>
              <p className="text-3xl font-bold text-emerald-600">{progressionCandidates.filter(c => c.daysSinceCompletion >= 14 && c.daysSinceCompletion < 60).length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Alumni no timing ideal</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Leads Quentes</p>
              <p className="text-3xl font-bold text-purple-600">{leadFunnel.filter(l => l.qualificationScore >= 60).length}</p>
            </div>
            <UserPlus className="h-8 w-8 text-purple-500/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Score &gt;60%</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alertas</p>
              <p className="text-3xl font-bold text-amber-600">{activationAlerts.length}</p>
            </div>
            <Bell className="h-8 w-8 text-amber-500/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{activationAlerts.filter(a => a.priority === 'urgent').length} urgentes</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Esperada</p>
              <p className="text-3xl font-bold text-blue-600">€{(growthMetrics.expectedRevenueThisMonth / 1000).toFixed(1)}k</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Este mês</p>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Zap className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="progression" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progressão ({progressionCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Leads ({leadFunnel.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ProgressionCandidatesList candidates={progressionCandidates} maxItems={6} />
            <LeadFunnelCard leads={leadFunnel} maxItems={6} />
            <ActivationAlertsCard alerts={activationAlerts} maxItems={8} />
          </div>
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressionCandidatesList candidates={progressionCandidates} maxItems={15} />
            <ActivationAlertsCard 
              alerts={activationAlerts.filter(a => 
                a.type === 'ready_for_upsell' || 
                a.type === 'dormant_alumni' || 
                a.type === 'cooling_period_ended'
              )} 
              maxItems={15} 
            />
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadFunnelCard leads={leadFunnel} maxItems={15} />
            <ActivationAlertsCard 
              alerts={activationAlerts.filter(a => 
                a.type === 'lead_stale' || 
                a.type === 'follow_up_overdue'
              )} 
              maxItems={15} 
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateProfileDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <SJCopilotDrawer open={copilotOpen} onOpenChange={setCopilotOpen} />
    </div>
  );
}
