import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useOpportunityDetail, 
  useUpdateOpportunityEnhanced,
  usePipelineStagesEnhanced 
} from "@/hooks/useOpportunitiesEnhanced";
import { useActivities } from "@/hooks/useActivities";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useTasks } from "@/hooks/useTasks";
import { useDealIntelligenceAPI } from "@/hooks/useDealIntelligenceAPI";
import { OpportunityStagesStepper } from "./detail/OpportunityStagesStepper";
import { OpportunityActivityTimeline } from "./detail/OpportunityActivityTimeline";
import { OpportunityHighlightsCards } from "./detail/OpportunityHighlightsCards";
import { OpportunityRecordNav } from "./detail/OpportunityRecordNav";
import { OpportunityHeaderActions } from "./detail/OpportunityHeaderActions";
import { OpportunityDetailSidebar } from "./detail/OpportunityDetailSidebar";
import { OpportunityNotesTab } from "./detail/OpportunityNotesTab";
import { OpportunityTasksTab } from "./detail/OpportunityTasksTab";
import { OpportunityAIInsightsSection } from "./OpportunityAIInsightsSection";
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface OpportunityDetailPageProps {
  opportunityId: string | undefined;
}

export function OpportunityDetailPage({ opportunityId }: OpportunityDetailPageProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: opportunity, isLoading } = useOpportunityDetail(opportunityId);
  const { data: stages = [] } = usePipelineStagesEnhanced();
  const { data: activities = [] } = useActivities({ entityType: "opportunity", entityId: opportunityId, limit: 50 });
  const { data: dealTasks = [] } = useTasks({ related_type: "opportunity", related_id: opportunityId });
  const updateOpportunity = useUpdateOpportunityEnhanced();
  const { data: intelligence, isLoading: intelligenceLoading } = useDealIntelligenceAPI(opportunityId);
  
  const { data: leadsData = [], isLoading: isLoadingLeads } = useLeads();
  const { contacts: contactsData = [], isLoading: isLoadingContacts } = useContacts();
  const { companies: companiesData = [], isLoading: isLoadingCompanies } = useCompanies();

  const handleMoveToNext = async () => {
    if (!opportunity || !stages.length) return;
    const currentIndex = stages.findIndex((s) => s.id === opportunity.stage_id);
    if (currentIndex < 0 || currentIndex >= stages.length - 1) return;
    const nextStage = stages[currentIndex + 1];
    try {
      await updateOpportunity.mutateAsync({ id: opportunity.id, stage_id: nextStage.id, probability: nextStage.probability || opportunity.probability });
      toast.success(t("oppDetailAdvancedTo", { stage: nextStage.name }));
    } catch {
      toast.error(t("oppDetailAdvanceError"));
    }
  };

  const formattedActivities = activities.map((a: any) => ({
    id: a.id,
    type: a.activity_type || "system",
    title: a.title || a.description?.substring(0, 50) || t("oppDetailActivity"),
    description: a.description,
    created_at: a.created_at,
    performed_by: a.performed_by_name,
    avatar_url: a.performed_by_avatar,
  }));

  const handleUpdate = async (updates: { id: string } & Record<string, unknown>) => {
    await updateOpportunity.mutateAsync(updates);
  };

  const leadOptions = leadsData.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone }));
  const contactOptions = contactsData.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company }));
  const companyOptions = companiesData.map(c => ({ id: c.id, name: c.name, website: c.website }));

  const pendingTasksCount = dealTasks.filter(t => t.status === "pending").length;
  const notesCount = opportunity?.notes ? opportunity.notes.split("\n---\n").filter(Boolean).length : 0;

  // Find stage info
  const currentStage = stages.find(s => s.id === opportunity?.stage_id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-64" /></div>
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-6"><Skeleton className="flex-1 h-96" /><Skeleton className="w-80 h-96" /></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p className="text-lg">{t("oppDetailNotFound")}</p>
        <Button variant="link" onClick={() => navigate("/dashboard/opportunities")}>{t("oppDetailBackToList")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/opportunities")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">{opportunity.title}</h1>
            {currentStage && (
              <OpportunityRecordNav
                opportunityId={opportunity.id}
                stageId={opportunity.stage_id}
                stageName={currentStage.name}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <OpportunityHeaderActions
            opportunityId={opportunity.id}
            title={opportunity.title}
          />
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full md:w-auto bg-transparent border-b rounded-none h-10 p-0">
              <TabsTrigger value="overview" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                {t("oppDetailTabOverview")}
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                {t("activities")}
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1.5">
                {t("oppDetailTabNotes")}
                {notesCount > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{notesCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1.5">
                {t("oppDetailTabTasks")}
                {pendingTasksCount > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{pendingTasksCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("oppDetailTabInsights")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <OpportunityHighlightsCards
                opportunity={opportunity}
                stages={stages}
              />
              <OpportunityStagesStepper
                stages={stages}
                currentStageId={opportunity.stage_id}
                onMoveToNext={handleMoveToNext}
                isLoading={updateOpportunity.isPending}
              />
              <OpportunityActivityTimeline
                activities={formattedActivities}
                opportunityId={opportunity.id}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <OpportunityActivityTimeline
                activities={formattedActivities}
                opportunityId={opportunity.id}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <OpportunityNotesTab opportunity={opportunity} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <OpportunityTasksTab opportunityId={opportunity.id} />
            </TabsContent>

            <TabsContent value="insights" className="mt-4">
              <div className="space-y-6">
                <AgentQueueStatus entityId={opportunity.id} entityType="opportunity" compact={false} showAnalyzeButton={true} />
                <OpportunityAIInsightsSection opportunityId={opportunity.id} onActionClick={(actionType) => { toast.info(t("oppDetailAction", { action: actionType })); }} />
                <EntityMemoryPanel entityId={opportunity.id} entityType="opportunity" entityName={opportunity.title} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <OpportunityDetailSidebar
          opportunity={opportunity}
          stages={stages}
          intelligence={intelligence}
          intelligenceLoading={intelligenceLoading}
          leads={leadOptions}
          contacts={contactOptions}
          companies={companyOptions}
          isLoadingLeads={isLoadingLeads}
          isLoadingContacts={isLoadingContacts}
          isLoadingCompanies={isLoadingCompanies}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
