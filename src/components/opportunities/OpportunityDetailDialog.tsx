import { useState, useMemo } from "react";
import { Opportunity } from "@/types/opportunity";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Bell,
  HelpCircle,
  Plus,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOpportunityDetail, useUpdateOpportunityEnhanced, usePipelineStagesEnhanced } from "@/hooks/useOpportunitiesEnhanced";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useActivities } from "@/hooks/useActivities";
import { OpportunityStagesStepper } from "./detail/OpportunityStagesStepper";
import { OpportunityContactsSidebar } from "./detail/OpportunityContactsSidebar";
import { OpportunityActivityTimeline } from "./detail/OpportunityActivityTimeline";
import { OpportunityDetailsGrid } from "./detail/OpportunityDetailsGrid";
import { BillingAssistantButton } from "@/components/billing-assistant";

interface OpportunityDetailDialogProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsWon: () => void;
  onMarkAsLost: () => void;
}

export function OpportunityDetailDialog({
  opportunity: initialOpp,
  open,
  onOpenChange,
  onMarkAsWon,
  onMarkAsLost,
}: OpportunityDetailDialogProps) {
  const { data: opportunity } = useOpportunityDetail(initialOpp.id);
  const updateOpportunity = useUpdateOpportunityEnhanced();
  const { data: stages = [] } = usePipelineStagesEnhanced();
  const { data: leads = [] } = useLeads();
  const { contacts } = useContacts();
  const { companies } = useCompanies();
  const { data: activities = [] } = useActivities({ 
    entityType: "opportunity", 
    entityId: initialOpp.id,
    limit: 50 
  });
  const [notes, setNotes] = useState(initialOpp.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isMovingStage, setIsMovingStage] = useState(false);

  const opp = opportunity || initialOpp;

  // Format activities for timeline
  const formattedActivities = useMemo(() => {
    return activities.map((a: any) => ({
      id: a.id,
      type: a.activity_type || "system",
      title: a.title,
      description: a.description,
      created_at: a.created_at,
      performed_by: a.performed_by,
    }));
  }, [activities]);

  // Build contacts list for sidebar
  const sidebarContacts = useMemo(() => {
    const result: any[] = [];
    
    // Primary contact from opportunity
    if (opp.contact) {
      result.push({
        id: opp.contact.id,
        name: opp.contact.name,
        email: opp.contact.email,
        phone: opp.contact.phone,
        role: opp.contact.company || "Contacto Principal",
        type: "primary",
      });
    }
    
    // Lead as influencer
    if (opp.lead) {
      result.push({
        id: opp.lead.id,
        name: opp.lead.name,
        email: opp.lead.email,
        phone: opp.lead.phone,
        role: "Lead",
        type: "influencer",
      });
    }

    return result;
  }, [opp.contact, opp.lead]);

  // Build company for sidebar
  const sidebarCompany = useMemo(() => {
    if (!opp.company) return null;
    
    const fullCompany = companies.find((c: any) => c.id === opp.company?.id);
    
    return {
      id: opp.company.id,
      name: opp.company.name,
      industry: (fullCompany as any)?.industry || "Tecnologia",
      city: (fullCompany as any)?.city,
      employee_count: (fullCompany as any)?.employee_count,
      logo_url: (fullCompany as any)?.avatar_url,
    };
  }, [opp.company, companies]);

  const handleMoveToNextStage = async () => {
    const currentIndex = stages.findIndex((s) => s.id === opp.stage_id);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      setIsMovingStage(true);
      try {
        await updateOpportunity.mutateAsync({
          id: opp.id,
          stage_id: nextStage.id,
          probability: nextStage.probability,
        });
        toast.success(`Avançado para ${nextStage.name}`);
      } catch (error) {
        toast.error("Erro ao avançar estágio");
      } finally {
        setIsMovingStage(false);
      }
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await updateOpportunity.mutateAsync({
        id: opp.id,
        notes,
      });
      toast.success("Notas guardadas");
    } catch (error) {
      toast.error("Erro ao guardar notas");
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-6xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-lg font-semibold">
                Detalhes da Oportunidade
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button size="icon" className="rounded-full bg-primary">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Title and Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{opp.title}</h1>
                    <Tabs defaultValue="overview" className="mt-2">
                      <TabsList className="h-9 bg-transparent p-0 gap-4">
                        <TabsTrigger 
                          value="overview"
                          className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 h-9 border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                        >
                          Resumo
                        </TabsTrigger>
                        <TabsTrigger 
                          value="tasks"
                          className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 h-9 border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                        >
                          Tarefas
                        </TabsTrigger>
                        <TabsTrigger 
                          value="notes"
                          className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 h-9 border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                        >
                          Notas
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="mt-6 space-y-6">
                        {/* Stages Stepper */}
                        <OpportunityStagesStepper
                          stages={stages}
                          currentStageId={opp.stage_id}
                          onMoveToNext={handleMoveToNextStage}
                          isLoading={isMovingStage}
                        />

                        {/* Details Grid */}
                        <Card className="border shadow-sm">
                          <CardContent className="p-5">
                            <OpportunityDetailsGrid opportunity={opp} />
                          </CardContent>
                        </Card>

                        {/* Activity Timeline */}
                        <OpportunityActivityTimeline
                          activities={formattedActivities}
                          opportunityId={opp.id}
                        />
                      </TabsContent>

                      <TabsContent value="tasks" className="mt-6">
                        <Card className="border-dashed">
                          <CardContent className="p-8 text-center text-muted-foreground">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Tarefas relacionadas</p>
                            <p className="text-xs mt-1">Em breve disponível</p>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="notes" className="mt-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Notas
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Adicione notas sobre esta oportunidade..."
                              className="min-h-[200px]"
                            />
                            <div className="flex justify-end">
                              <Button 
                                size="sm" 
                                onClick={handleSaveNotes}
                                disabled={isSavingNotes}
                              >
                                {isSavingNotes ? "A guardar..." : "Guardar Notas"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Status Actions */}
                  <div className="flex gap-2 shrink-0">
                    <BillingAssistantButton opportunityId={opp.id} />
                    {opp.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={onMarkAsWon}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Ganho
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onMarkAsLost}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Perdido
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-muted/20 p-4 overflow-y-auto">
            <OpportunityContactsSidebar
              contacts={sidebarContacts}
              company={sidebarCompany}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
