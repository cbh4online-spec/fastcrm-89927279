import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useOpportunityDetail, 
  useUpdateOpportunityEnhanced,
  usePipelineStagesEnhanced 
} from "@/hooks/useOpportunitiesEnhanced";
import { useActivities } from "@/hooks/useActivities";
import { OpportunityStagesStepper } from "./detail/OpportunityStagesStepper";
import { OpportunityDetailsGrid } from "./detail/OpportunityDetailsGrid";
import { OpportunityContactsSidebar } from "./detail/OpportunityContactsSidebar";
import { OpportunityActivityTimeline } from "./detail/OpportunityActivityTimeline";
import { toast } from "sonner";

interface OpportunityDetailPageProps {
  opportunityId: string | undefined;
}

export function OpportunityDetailPage({ opportunityId }: OpportunityDetailPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: opportunity, isLoading } = useOpportunityDetail(opportunityId);
  const { data: stages = [] } = usePipelineStagesEnhanced();
  const { data: activities = [] } = useActivities({
    entityType: "opportunity",
    entityId: opportunityId,
    limit: 50,
  });
  const updateOpportunity = useUpdateOpportunityEnhanced();

  const handleMoveToNext = async () => {
    if (!opportunity || !stages.length) return;

    const currentIndex = stages.findIndex((s) => s.id === opportunity.stage_id);
    if (currentIndex < 0 || currentIndex >= stages.length - 1) return;

    const nextStage = stages[currentIndex + 1];

    try {
      await updateOpportunity.mutateAsync({
        id: opportunity.id,
        stage_id: nextStage.id,
        probability: nextStage.probability || opportunity.probability,
      });
      toast.success(`Avançado para: ${nextStage.name}`);
    } catch (error) {
      toast.error("Erro ao avançar estágio");
    }
  };

  // Transform activities to the expected format
  const formattedActivities = activities.map((a: any) => ({
    id: a.id,
    type: a.activity_type || "system",
    title: a.title || a.description?.substring(0, 50) || "Atividade",
    description: a.description,
    created_at: a.created_at,
    performed_by: a.performed_by_name,
    avatar_url: a.performed_by_avatar,
  }));

  // Generate sample contacts from opportunity data
  const contacts = [];
  if (opportunity?.contact) {
    contacts.push({
      id: opportunity.contact.id,
      name: opportunity.contact.name,
      role: (opportunity.contact as any).job_title || "Contacto",
      email: opportunity.contact.email || undefined,
      phone: opportunity.contact.phone || undefined,
      type: "primary" as const,
    });
  }
  if (opportunity?.lead) {
    contacts.push({
      id: opportunity.lead.id,
      name: opportunity.lead.name,
      email: opportunity.lead.email || undefined,
      phone: opportunity.lead.phone || undefined,
      type: "influencer" as const,
    });
  }

  // Get company from opportunity
  const company = opportunity?.company ? {
    id: opportunity.company.id,
    name: opportunity.company.name,
    industry: (opportunity.company as any).industry,
    city: (opportunity.company as any).city,
    employee_count: (opportunity.company as any).employee_count,
    logo_url: (opportunity.company as any).avatar_url,
  } : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-9 h-96" />
          <Skeleton className="col-span-3 h-96" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
        <p className="text-lg">Oportunidade não encontrada</p>
        <Button variant="link" onClick={() => navigate("/dashboard/opportunities")}>
          Voltar às oportunidades
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/opportunities")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Detalhes da Oportunidade</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Title and Tabs */}
          <div>
            <h2 className="text-2xl font-bold mb-4">{opportunity.title}</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                <TabsTrigger value="notes">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Stages Stepper */}
                <OpportunityStagesStepper
                  stages={stages}
                  currentStageId={opportunity.stage_id}
                  onMoveToNext={handleMoveToNext}
                  isLoading={updateOpportunity.isPending}
                />

                {/* Details Grid */}
                <OpportunityDetailsGrid opportunity={opportunity} />

                {/* Activity Timeline */}
                <OpportunityActivityTimeline
                  activities={formattedActivities}
                  opportunityId={opportunity.id}
                />
              </TabsContent>

              <TabsContent value="tasks" className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Gestão de tarefas em breve...</p>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <p>Notas em breve...</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <OpportunityContactsSidebar
            contacts={contacts}
            company={company}
            onAddContact={() => {}}
            onContactClick={(contact) => navigate(`/dashboard/contacts/${contact.id}`)}
            onCompanyClick={(company) => navigate(`/dashboard/companies/${company.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
