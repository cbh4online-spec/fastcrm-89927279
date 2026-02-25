import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AskProactiveNudge } from "@/components/ask-fastcrm/AskProactiveNudge";
import { AskFastCRMDialog } from "@/components/ask-fastcrm/AskFastCRMDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { WelcomeOverlay } from "@/components/dashboard/WelcomeOverlay";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Target,
  Briefcase,
  Building2,
  Contact,
  CheckSquare,
} from "lucide-react";

import { RevenueHero } from "@/components/dashboard/RevenueHero";
import { ForecastTrendChart } from "@/components/dashboard/ForecastTrendChart";
import { PipelineHealthCard } from "@/components/dashboard/PipelineHealthCard";
import { DealsAtRiskList } from "@/components/dashboard/DealsAtRiskList";
import { AIActionSuggestions } from "@/components/dashboard/AIActionSuggestions";

// Dialog components for creating entities
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { useCreateTask } from "@/hooks/useTasks";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createTask = useCreateTask();

  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createOpportunityOpen, setCreateOpportunityOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [askDialogOpen, setAskDialogOpen] = useState(false);
  const [askPrefilledQuery, setAskPrefilledQuery] = useState("");

  // Post-onboarding welcome state
  const isOnboardingComplete = searchParams.get("onboarding") === "complete";
  const onboardingSegment = searchParams.get("segment");
  const onboardingBundle = searchParams.get("bundle");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isOnboardingComplete) {
      setShowWelcome(true);
      // Clean up URL params
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
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Home</h1>
                <Badge variant="outline" className="text-xs font-normal">
                  FastCRM 2.0
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Build your CRM. Grow your revenue.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-primary shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setCreateLeadOpen(true)}>
                  <Target className="h-4 w-4 mr-2" /> New Lead
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateOpportunityOpen(true)}>
                  <Briefcase className="h-4 w-4 mr-2" /> New Opportunity
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateContactOpen(true)}>
                  <Contact className="h-4 w-4 mr-2" /> New Contact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateCompanyOpen(true)}>
                  <Building2 className="h-4 w-4 mr-2" /> New Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateTaskOpen(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" /> New Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Welcome overlay (post-onboarding) */}
          {showWelcome && (
            <WelcomeOverlay
              segment={onboardingSegment}
              bundleActivated={onboardingBundle}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          {/* Proactive Ask Nudge */}
          <AskProactiveNudge onAskQuery={(q) => {
            setAskPrefilledQuery(q);
            setAskDialogOpen(true);
          }} />

          {/* Revenue Hero */}
          <RevenueHero />

          {/* Grid */}
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            {/* Left */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <ForecastTrendChart />
              <DealsAtRiskList />
              <AIActionSuggestions />
            </div>

            {/* Right */}
            <div className="col-span-12 lg:col-span-4">
              <PipelineHealthCard />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} />
      <CreateOpportunityDialog open={createOpportunityOpen} onOpenChange={setCreateOpportunityOpen} />
      <CreateContactDialog open={createContactOpen} onOpenChange={setCreateContactOpen} />
      <CreateCompanyDialog open={createCompanyOpen} onOpenChange={setCreateCompanyOpen} />
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        entityName="Dashboard"
        onCreateTask={(task) => {
          createTask.mutate({
            title: task.title,
            due_at: task.due_at,
            assigned_to: task.assigned_to,
          });
          setCreateTaskOpen(false);
        }}
      />
      <AskFastCRMDialog open={askDialogOpen} onOpenChange={setAskDialogOpen} />
    </DashboardLayout>
  );
}
