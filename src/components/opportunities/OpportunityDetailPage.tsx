import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, HelpCircle, Plus, Sparkles } from "lucide-react";
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
import { OpportunityDetailsGrid } from "./detail/OpportunityDetailsGrid";
import { OpportunityActivityTimeline } from "./detail/OpportunityActivityTimeline";
import { OpportunityAIInsightsSection } from "./OpportunityAIInsightsSection";
import { OpportunityAssociationsSection } from "./sections/OpportunityAssociationsSection";
import { OpportunityCommissionSection } from "./sections/OpportunityCommissionSection";
import { DealIntelligencePanel } from "@/components/intelligence/DealIntelligencePanel";
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
    } catch (error) {
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

  const handleAssociationUpdate = async (updates: { id: string } & Record<string, unknown>) => {
    await updateOpportunity.mutateAsync(updates);
  };

  const leadOptions = leadsData.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone }));
  const contactOptions = contactsData.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company }));
  const companyOptions = companiesData.map(c => ({ id: c.id, name: c.name, website: c.website }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><Skeleton className="h-8 w-64" /></div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-12 gap-6"><Skeleton className="col-span-9 h-96" /><Skeleton className="col-span-3 h-96" /></div>
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => navigate("/dashboard/opportunities")}>
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-semibold">{t("oppDetailTitle")}</h1>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10"><Bell className="h-4 w-4 md:h-5 md:w-5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10"><HelpCircle className="h-4 w-4 md:h-5 md:w-5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10"><Plus className="h-4 w-4 md:h-5 md:w-5" /></Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col-reverse lg:flex-row gap-4 md:gap-6">
        <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{opportunity.title}</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="overview" className="flex-1 md:flex-none">{t("oppDetailTabOverview")}</TabsTrigger>
                <TabsTrigger value="insights" className="flex-1 md:flex-none gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("oppDetailTabInsights")}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex-1 md:flex-none">{t("oppDetailTabTasks")}</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1 md:flex-none">{t("oppDetailTabNotes")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                <OpportunityStagesStepper stages={stages} currentStageId={opportunity.stage_id} onMoveToNext={handleMoveToNext} isLoading={updateOpportunity.isPending} />
                <OpportunityDetailsGrid opportunity={opportunity} />
                <OpportunityActivityTimeline activities={formattedActivities} opportunityId={opportunity.id} />
              </TabsContent>

              <TabsContent value="insights" className="mt-4 md:mt-6">
                <div className="space-y-6">
                  <AgentQueueStatus entityId={opportunity.id} entityType="opportunity" compact={false} showAnalyzeButton={true} />
                  <OpportunityAIInsightsSection opportunityId={opportunity.id} onActionClick={(actionType) => { toast.info(t("oppDetailAction", { action: actionType })); }} />
                  <EntityMemoryPanel entityId={opportunity.id} entityType="opportunity" entityName={opportunity.title} />
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4 md:mt-6">
                <div className="text-center py-12 text-muted-foreground"><p>{t("oppDetailTasksComingSoon")}</p></div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4 md:mt-6">
                <div className="text-center py-12 text-muted-foreground"><p>{t("oppDetailNotesComingSoon")}</p></div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">
          <DealIntelligencePanel intelligence={intelligence} dealId={opportunity.id} isLoading={intelligenceLoading} />
          <OpportunityAssociationsSection opportunity={opportunity} leads={leadOptions} contacts={contactOptions} companies={companyOptions} onUpdate={handleAssociationUpdate} isLoadingLeads={isLoadingLeads} isLoadingContacts={isLoadingContacts} isLoadingCompanies={isLoadingCompanies} />
          <OpportunityCommissionSection opportunity={opportunity} onUpdate={handleAssociationUpdate} />
        </div>
      </div>
    </div>
  );
}
