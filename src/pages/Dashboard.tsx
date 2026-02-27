import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AskProactiveNudge } from "@/components/ask-fastcrm/AskProactiveNudge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { WelcomeOverlay } from "@/components/dashboard/WelcomeOverlay";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Target, Briefcase, Building2, Contact, CheckSquare, Brain, ArrowRight, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RevenueHero } from "@/components/dashboard/RevenueHero";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { ForecastTrendChart } from "@/components/dashboard/ForecastTrendChart";
import { PipelineHealthCard } from "@/components/dashboard/PipelineHealthCard";
import { DealsAtRiskList } from "@/components/dashboard/DealsAtRiskList";
import { AIActionSuggestions } from "@/components/dashboard/AIActionSuggestions";
import { DashboardAutomationSuggestions } from "@/components/dashboard/DashboardAutomationSuggestions";
import { PipelineComparisonCard } from "@/components/dashboard/PipelineComparisonCard";
import { PLGSignalsFeed } from "@/components/dashboard/PLGSignalsFeed";
import { UpcomingBirthdaysWidget } from "@/components/dashboard/UpcomingBirthdaysWidget";
import { UpcomingEventsWidget } from "@/components/dashboard/UpcomingEventsWidget";
import { ExecutiveBriefWidget } from "@/components/dashboard/ExecutiveBriefWidget";
import { DailyBriefWidget } from "@/components/dashboard/DailyBriefWidget";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";

import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useCreateTask } from "@/hooks/useTasks";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createTask = useCreateTask();
  const { kpiData, isLoading: kpiLoading } = useDashboardData();
  const { isConfigured: contextConfigured } = useBusinessContext();
  const { data: intelligence } = useIntelligencePanel();

  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createOpportunityOpen, setCreateOpportunityOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const isOnboardingComplete = searchParams.get("onboarding") === "complete";
  const onboardingSegment = searchParams.get("segment");
  const onboardingBundle = searchParams.get("bundle");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isOnboardingComplete) {
      setShowWelcome(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("onboarding");
      newParams.delete("segment");
      newParams.delete("bundle");
      setSearchParams(newParams, { replace: true });
    }
  }, [isOnboardingComplete]);

  const risksCount = intelligence?.top_risks?.length ?? 0;
  const actionsCount = intelligence?.recommended_actions?.length ?? 0;

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-5">
          {/* ── Premium Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Revenue Operating System
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {getGreeting()}.{" "}
                {risksCount > 0 && (
                  <span className="text-primary font-medium">{risksCount} deals precisam de atenção</span>
                )}
                {risksCount > 0 && actionsCount > 0 && " · "}
                {actionsCount > 0 && (
                  <span>{actionsCount} ações recomendadas</span>
                )}
                {risksCount === 0 && actionsCount === 0 && "Tudo sob controlo."}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-primary shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('new')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setCreateLeadOpen(true)}>
                  <Target className="h-4 w-4 mr-2" /> {t('newLead')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateOpportunityOpen(true)}>
                  <Briefcase className="h-4 w-4 mr-2" /> {t('newOpportunity')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateContactOpen(true)}>
                  <Contact className="h-4 w-4 mr-2" /> {t('newContact')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateCompanyOpen(true)}>
                  <Building2 className="h-4 w-4 mr-2" /> {t('newCompany')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateTaskOpen(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" /> {t('newTask')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showWelcome && (
            <WelcomeOverlay segment={onboardingSegment} bundleActivated={onboardingBundle} onDismiss={() => setShowWelcome(false)} />
          )}

          {!contextConfigured && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Configure o seu Revenue OS</p>
                  <p className="text-xs text-muted-foreground">O sistema precisa de conhecer o seu negócio para operar com inteligência.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/dashboard/context-os")} className="gap-1.5 shrink-0">
                Configurar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <AskProactiveNudge onAskQuery={(q) => navigate(`/dashboard/ask?q=${encodeURIComponent(q)}`)} />

          {/* ── Revenue Hero (full-width) ── */}
          <RevenueHero />

          {/* ── KPI Strip ── */}
          <DashboardKPICards data={kpiData} isLoading={kpiLoading} />

          {/* ── Intelligence Strip (2 cols) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AIActionSuggestions />
            <DealsAtRiskList />
          </div>

          {/* ── Operational Grid (3 cols) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PipelineHealthCard />
            <ForecastTrendChart />
            <div className="space-y-4">
              <DailyBriefWidget />
              <ExecutiveBriefWidget />
            </div>
          </div>

          {/* ── Secondary Grid (3 cols) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PLGSignalsFeed />
            <div className="space-y-4">
              <DashboardAutomationSuggestions />
              <PipelineComparisonCard />
            </div>
            <div className="space-y-4">
              <UpcomingEventsWidget />
              <UpcomingBirthdaysWidget />
            </div>
          </div>
        </div>
      </ScrollArea>

      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} />
      <CreateOpportunityDialog open={createOpportunityOpen} onOpenChange={setCreateOpportunityOpen} />
      <CreateContactDialog open={createContactOpen} onOpenChange={setCreateContactOpen} />
      <CreateCompanyDialog open={createCompanyOpen} onOpenChange={setCreateCompanyOpen} />
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        entityName="Dashboard"
        onCreateTask={(task) => {
          createTask.mutate({ title: task.title, due_at: task.due_at, assigned_to: task.assigned_to });
          setCreateTaskOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
