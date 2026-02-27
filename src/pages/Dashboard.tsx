import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AskProactiveNudge } from "@/components/ask-fastcrm/AskProactiveNudge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { WelcomeOverlay } from "@/components/dashboard/WelcomeOverlay";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Target, Briefcase, Building2, Contact, CheckSquare, Brain, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RevenueHero } from "@/components/dashboard/RevenueHero";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { ForecastTrendChart } from "@/components/dashboard/ForecastTrendChart";
import { PipelineHealthCard } from "@/components/dashboard/PipelineHealthCard";
import { DealsAtRiskList } from "@/components/dashboard/DealsAtRiskList";
import { AIActionSuggestions } from "@/components/dashboard/AIActionSuggestions";
import { ForecastConfidenceCard } from "@/components/dashboard/ForecastConfidenceCard";
import { DashboardAutomationSuggestions } from "@/components/dashboard/DashboardAutomationSuggestions";
import { PipelineComparisonCard } from "@/components/dashboard/PipelineComparisonCard";
import { PLGSignalsFeed } from "@/components/dashboard/PLGSignalsFeed";
import { UpcomingBirthdaysWidget } from "@/components/dashboard/UpcomingBirthdaysWidget";
import { UpcomingEventsWidget } from "@/components/dashboard/UpcomingEventsWidget";
import { ExecutiveBriefWidget } from "@/components/dashboard/ExecutiveBriefWidget";
import { DailyBriefWidget } from "@/components/dashboard/DailyBriefWidget";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBusinessContext } from "@/hooks/useBusinessContext";

import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useCreateTask } from "@/hooks/useTasks";

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createTask = useCreateTask();
  const { kpiData, isLoading: kpiLoading } = useDashboardData();
  const { isConfigured: contextConfigured } = useBusinessContext();

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

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{t('home')}</h1>
                <Badge variant="outline" className="text-xs font-normal border-gold/30 text-gold">FastCRM OS</Badge>
              </div>
              <p className="text-sm text-muted-foreground">AI Revenue Operating System</p>
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
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold/15 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium">Configure o seu Revenue OS</p>
                  <p className="text-xs text-muted-foreground">O sistema precisa de conhecer o seu negócio para operar com inteligência.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/dashboard/context-os")} className="gap-1.5 bg-gold text-gold-foreground hover:bg-gold/90 shrink-0">
                Configurar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <AskProactiveNudge onAskQuery={(q) => navigate(`/dashboard/ask?q=${encodeURIComponent(q)}`)} />

          <RevenueHero />

          <DashboardKPICards data={kpiData} isLoading={kpiLoading} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <ForecastTrendChart />
              <DealsAtRiskList />
              <AIActionSuggestions />
              <DashboardAutomationSuggestions />
            </div>
            <div className="space-y-4">
              <PipelineHealthCard />
              <PLGSignalsFeed />
              <UpcomingEventsWidget />
            </div>
            <div className="space-y-4">
              <ExecutiveBriefWidget />
              <DailyBriefWidget />
              <ForecastConfidenceCard />
              <PipelineComparisonCard />
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
