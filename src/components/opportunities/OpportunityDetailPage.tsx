import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Building2, Users, Phone, Plus, CreditCard, LayoutGrid, UserCheck, Handshake, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { OpportunityAssociatedTab } from "./detail/OpportunityAssociatedTab";
import { OpportunityCallsTab } from "./detail/OpportunityCallsTab";
import { OpportunityCommentsTab } from "./detail/OpportunityCommentsTab";
import { useOpportunityComments } from "@/hooks/useOpportunityComments";
import { OpportunityAIInsightsSection } from "./OpportunityAIInsightsSection";
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface OpportunityDetailPageProps {
  opportunityId: string | undefined;
}

export function OpportunityDetailPage({ opportunityId }: OpportunityDetailPageProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);
  const [additionalTabs, setAdditionalTabs] = useState<string[]>([]);

  const ADD_TAB_OPTIONS = [
    { id: "people", label: t("oppDetail_associatedPeopleTab"), icon: Users, dot: "bg-emerald-500", isDefault: true },
    { id: "company", label: t("oppDetail_associatedCompanyTab"), icon: Building2, dot: "bg-purple-500", isDefault: true },
    { id: "billing", label: t("oppDetail_billingAdmin"), icon: CreditCard, dot: "bg-pink-500", isDefault: false },
    { id: "workspace", label: t("oppDetail_workspace"), icon: LayoutGrid, dot: "bg-cyan-500", isDefault: false },
    { id: "keycontact", label: t("oppDetail_keyContact"), icon: UserCheck, dot: "bg-teal-500", isDefault: false },
    { id: "partner", label: t("oppDetail_partner"), icon: Handshake, dot: "bg-indigo-500", isDefault: false },
  ];

  const defaultTabIds = ["people", "company"];
  const isTabVisible = (id: string) => defaultTabIds.includes(id) || additionalTabs.includes(id);

  const handleAddTab = (tabId: string) => {
    if (!additionalTabs.includes(tabId)) {
      setAdditionalTabs(prev => [...prev, tabId]);
      setActiveTab(tabId);
    }
  };

  const { data: opportunity, isLoading } = useOpportunityDetail(opportunityId);
  const { data: stages = [] } = usePipelineStagesEnhanced();
  const { data: activities = [] } = useActivities({ entityType: "opportunity", entityId: opportunityId, limit: 50 });
  const { data: dealTasks = [] } = useTasks({ related_type: "opportunity", related_id: opportunityId });
  const updateOpportunity = useUpdateOpportunityEnhanced();
  const { data: intelligence, isLoading: intelligenceLoading } = useDealIntelligenceAPI(opportunityId);
  const { data: commentsData = [] } = useOpportunityComments(opportunityId);
  
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

  const currentStage = stages.find(s => s.id === opportunity?.stage_id);

  // Associated entities
  const associatedCompanies = opportunity?.company ? [{ id: opportunity.company.id, name: opportunity.company.name, website: opportunity.company.website }] : [];
  const associatedPeople = [
    ...(opportunity?.contact ? [{ id: opportunity.contact.id, name: opportunity.contact.name, email: opportunity.contact.email, phone: opportunity.contact.phone, company: opportunity.contact.company }] : []),
    ...(opportunity?.lead ? [{ id: opportunity.lead.id, name: opportunity.lead.name, email: opportunity.lead.email, phone: opportunity.lead.phone }] : []),
  ];

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

  const tabBadge = (count: number) => (
    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{count}</span>
  );

  const tabDotColors: Record<string, string> = {
    overview: "bg-muted-foreground/50",
    activity: "bg-yellow-500",
    notes: "bg-blue-500",
    company: "bg-purple-500",
    people: "bg-emerald-500",
    tasks: "bg-orange-500",
    calls: "bg-red-500",
    insights: "bg-amber-500",
    billing: "bg-pink-500",
    workspace: "bg-cyan-500",
    keycontact: "bg-teal-500",
    partner: "bg-indigo-500",
    comments: "bg-violet-500",
  };

  const tabDot = (key: string) => (
    <span className={cn("w-1.5 h-1.5 rounded-full mr-1", tabDotColors[key] || "bg-muted-foreground/50")} />
  );

  return (
    <div className="space-y-0">
      {/* Top bar: Close + Nav */}
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/opportunities")}>
            <X className="h-4 w-4" />
          </Button>
          {currentStage && (
            <OpportunityRecordNav
              opportunityId={opportunity.id}
              stageId={opportunity.stage_id}
              stageName={currentStage.name}
            />
          )}
        </div>
      </div>

      {/* Title + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-lg md:text-xl font-bold leading-tight">{opportunity.title}</h1>
        <div className="flex items-center gap-1">
          <OpportunityHeaderActions
            opportunityId={opportunity.id}
            title={opportunity.title}
            isFavorite={isFavorite}
            onToggleFavorite={() => setIsFavorite(!isFavorite)}
          />
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full md:w-auto bg-transparent border-b rounded-none h-10 p-0 flex-wrap">
              <TabsTrigger value="overview" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs">
                {tabDot("overview")}
                {t("oppDetailTabOverview")}
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs">
                {tabDot("activity")}
                {t("activities")}
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("notes")}
                {t("oppDetailTabNotes")}
                {tabBadge(notesCount)}
              </TabsTrigger>
              <TabsTrigger value="company" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("company")}
                {t("oppDetail_associatedCompanyTab")}
                {tabBadge(associatedCompanies.length)}
              </TabsTrigger>
              <TabsTrigger value="people" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("people")}
                {t("oppDetail_associatedPeopleTab")}
                {tabBadge(associatedPeople.length)}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("tasks")}
                {t("oppDetailTabTasks")}
                {tabBadge(pendingTasksCount)}
              </TabsTrigger>
              <TabsTrigger value="calls" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("calls")}
                {t("oppDetail_callsTab")}
                {tabBadge(0)}
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("insights")}
                <Sparkles className="h-3 w-3" />
                {t("oppDetailTabInsights")}
              </TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                {tabDot("comments")}
                <MessageSquare className="h-3 w-3" />
                {t("oppDetail_commentsTab")}
                {tabBadge(commentsData.filter(c => !c.parent_id).length)}
              </TabsTrigger>
              {/* Dynamic tabs */}
              {additionalTabs.map(tabId => {
                const opt = ADD_TAB_OPTIONS.find(o => o.id === tabId);
                if (!opt) return null;
                return (
                  <TabsTrigger key={tabId} value={tabId} className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary gap-1 text-xs">
                    {tabDot(tabId)}
                    {opt.label}
                  </TabsTrigger>
                );
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-none"
                  >
                    <Plus className="w-3 h-3" />
                    {t("oppDetail_addTab")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-50 bg-popover">
                  {ADD_TAB_OPTIONS.map(opt => {
                    const alreadyVisible = isTabVisible(opt.id);
                    const Icon = opt.icon;
                    return (
                      <DropdownMenuItem
                        key={opt.id}
                        disabled={alreadyVisible}
                        onClick={() => handleAddTab(opt.id)}
                        className="gap-2 text-xs"
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", opt.dot)} />
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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

            <TabsContent value="company" className="mt-4">
              <OpportunityAssociatedTab type="company" entities={associatedCompanies} />
            </TabsContent>

            <TabsContent value="people" className="mt-4">
              <OpportunityAssociatedTab type="people" entities={associatedPeople} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <OpportunityTasksTab opportunityId={opportunity.id} />
            </TabsContent>

            <TabsContent value="calls" className="mt-4">
              <OpportunityCallsTab opportunityId={opportunity.id} />
            </TabsContent>

            <TabsContent value="insights" className="mt-4">
              <div className="space-y-6">
                <AgentQueueStatus entityId={opportunity.id} entityType="opportunity" compact={false} showAnalyzeButton={true} />
                <OpportunityAIInsightsSection opportunityId={opportunity.id} onActionClick={(actionType) => { toast.info(t("oppDetailAction", { action: actionType })); }} />
                <EntityMemoryPanel entityId={opportunity.id} entityType="opportunity" entityName={opportunity.title} />
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <OpportunityCommentsTab opportunityId={opportunity.id} />
            </TabsContent>

            {/* Dynamic tab contents */}
            {additionalTabs.map(tabId => {
              const opt = ADD_TAB_OPTIONS.find(o => o.id === tabId);
              if (!opt) return null;
              const Icon = opt.icon;
              return (
                <TabsContent key={tabId} value={tabId} className="mt-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm mb-3">{t("oppDetail_noRecordAssociated", { type: opt.label })}</p>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Em breve")}>
                      <Plus className="w-3.5 h-3.5" />
                      {t("oppDetail_associate")}
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
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
