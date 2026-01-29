import { useCallback, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, Lead } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft,
  ArrowRight,
  User, 
  Mail, 
  Phone, 
  Trash2, 
  Clock,
  Tag,
  Sparkles,
  Instagram,
  Globe,
  MessageSquare,
  UserCircle
} from "lucide-react";
import { toast } from "sonner";
import { useGenerateFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { InsightsSidebar } from "@/components/insights";
import { ConvertLeadDialog } from "@/components/crm/ConvertLeadDialog";
import { IdentificationSection } from "@/components/leads/sections/IdentificationSection";
import { TagsSection } from "@/components/leads/sections/TagsSection";
import { NotesSection } from "@/components/leads/sections/NotesSection";
import { SocialMediaSection } from "@/components/leads/sections/SocialMediaSection";
import { EntitySocialMediaAnalysisSection } from "@/components/shared/EntitySocialMediaAnalysisSection";
import { EntitySidebarMenu } from "@/components/entity/EntitySidebarMenu";
import { useEntityCounts } from "@/hooks/useEntityCounts";
import { MenuSection } from "@/types/entity";
import { EntityTasksSection } from "@/components/tasks";
import { EntityAutomationSection } from "@/components/automations/EntityAutomationSection";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";
import { ContactMessagesSection } from "@/components/messages/ContactMessagesSection";
import { ProductSuggestionsCard } from "@/components/ai-suggestions/ProductSuggestionsCard";
import { EntityContext } from "@/hooks/useEntityProductSuggestions";
import { CustomFieldsSection } from "@/components/leads/sections/CustomFieldsSection";
import { InstagramDataSection } from "@/components/leads/sections/InstagramDataSection";
import { AIAnalysisSection } from "@/components/leads/sections/AIAnalysisSection";
import { LeadAgentInsightsSection } from "@/components/leads/sections/LeadAgentInsightsSection";
import { EntityCreditProposalsSection } from "@/modules/credit-intermediation/components/EntityCreditProposalsSection";
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";
import { OpportunitiesSection } from "@/components/leads/sections/OpportunitiesSection";
import { ProposalsSection } from "@/components/leads/sections/ProposalsSection";
import { EntityTimelineSection } from "@/components/timeline";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  in_progress: "Em Progresso",
  completed: "Concluído",
};

const sourceIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  website: <Globe className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
  referral: <UserCircle className="w-3 h-3" />,
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  return date.toLocaleDateString('pt-PT');
}

export function LeadDetailWithSidebar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: counts } = useEntityCounts('lead', id);
  
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const generateSuggestions = useGenerateFieldSuggestions();

  // Build entity context for AI product suggestions - MUST be before any returns
  const entityContext: EntityContext | null = useMemo(() => {
    if (!lead || !id) return null;
    const leadAny = lead as any;
    return {
      entityType: "lead" as const,
      entityId: id,
      name: lead.name,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      source: lead.source || undefined,
      notes: leadAny.notes || undefined,
      tags: lead.tags || undefined,
      inferredProfession: leadAny.business_category || undefined,
      inferredLocation: leadAny.city || undefined,
      leadScore: leadAny.lead_score || undefined,
    };
  }, [lead, id]);

  const handleFieldChange = useCallback(async (field: keyof Lead, value: unknown) => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      [field]: value || undefined,
    });
    toast.success("Campo atualizado");
  }, [lead, updateLead]);

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead eliminado com sucesso");
      navigate("/dashboard/leads");
    } catch {
      toast.error("Erro ao eliminar lead");
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "lead", entityId: id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lead não encontrado</h2>
        <p className="text-muted-foreground mb-4">O lead que procura não existe ou foi eliminado.</p>
        <Button onClick={() => navigate("/dashboard/leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Leads
        </Button>
      </div>
    );
  }

  const sourceTag = lead.source?.toLowerCase() || "outro";
  const SourceIcon = sourceIcons[sourceTag] || <Tag className="w-3 h-3" />;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <InsightsSidebar entityType="lead" entityId={id || ''} />
            {entityContext && (
              <ProductSuggestionsCard 
                context={entityContext}
                onAddToOpportunity={(productId) => {
                  toast.info("Funcionalidade em desenvolvimento: criar oportunidade com este produto");
                }}
              />
            )}
            <IdentificationSection lead={lead} onFieldChange={handleFieldChange} />
          </div>
        );
      case 'insights':
        return (
          <div className="space-y-6">
            {/* AI Agent Queue Status */}
            <AgentQueueStatus
              entityId={id!}
              entityType="lead"
              compact={false}
              showAnalyzeButton={true}
            />
            {/* AI Agent Analysis - New Architecture */}
            <LeadAgentInsightsSection 
              leadId={id!}
              onActionClick={(actionType) => {
                toast.info(`Ação: ${actionType}`);
              }}
            />
            <InsightsSidebar entityType="lead" entityId={id || ''} />
            <EntitySocialMediaAnalysisSection
              entityType="lead"
              entityId={id!}
              entityName={lead.name}
              linkedinUrl={lead.linkedin_url}
            />
            {/* AI Memory Panel */}
            <EntityMemoryPanel
              entityId={id!}
              entityType="lead"
              entityName={lead.name}
            />
          </div>
        );
      case 'notes':
        return (
          <NotesSection 
            entityType="lead" 
            entityId={id!} 
            entityName={lead.name} 
          />
        );
      case 'details':
        return (
          <div className="space-y-6">
            {/* Secção de Dados Instagram */}
            <InstagramDataSection lead={lead} />
            {/* Secção de Análise IA */}
            <AIAnalysisSection lead={lead} />
            <SocialMediaSection lead={lead} onFieldChange={handleFieldChange} />
            <TagsSection lead={lead} onFieldChange={handleFieldChange} />
          </div>
        );
      case 'tasks':
        return (
          <EntityTasksSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
          />
        );
      case 'automations':
        return (
          <EntityAutomationSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
          />
        );
      case 'messages':
        return (
          <ContactMessagesSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
            entityEmail={lead.email}
            entityPhone={lead.phone}
          />
        );
      case 'custom-fields':
        return (
          <CustomFieldsSection leadId={id!} />
        );
      case 'credit':
        return (
          <EntityCreditProposalsSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
          />
        );
      case 'opportunities':
        return (
          <OpportunitiesSection
            leadId={id!}
            leadName={lead.name}
          />
        );
      case 'proposals':
        return (
          <ProposalsSection
            leadId={id!}
            leadName={lead.name}
          />
        );
      case 'history':
        return (
          <EntityTimelineSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            Secção em desenvolvimento
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Breadcrumbs */}
      <div className="bg-background px-6 pt-4">
        <PageBreadcrumbs
          items={[
            { label: "CRM", href: "/dashboard/crm" },
            { label: "Leads", href: "/dashboard/leads" },
            { label: lead.name },
          ]}
        />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-background via-background to-muted/30 border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/leads")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <EntityAvatarUpload
              entityType="lead"
              entityId={id!}
              entityName={lead.name}
              currentAvatarUrl={(lead as any).avatar_url}
              onAvatarChange={(url) => handleFieldChange('avatar_url' as keyof Lead, url)}
              size="md"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>
                {lead.source && (
                  <Badge variant="secondary" className="gap-1 text-xs uppercase font-medium">
                    {SourceIcon}
                    {lead.source}
                  </Badge>
                )}
                <Badge variant="outline" className={statusColors[lead.status]}>
                  {statusLabels[lead.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Atualizado há {getTimeAgo(new Date(lead.updated_at))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead.email && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setActiveSection('messages')}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar Mensagem</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {lead.phone && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setActiveSection('messages')}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar Mensagem</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button 
              variant="outline" 
              onClick={handleGenerateSuggestions}
              disabled={generateSuggestions.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generateSuggestions.isPending ? "A analisar..." : "Analisar IA"}
            </Button>
            <ConvertLeadDialog 
              lead={lead}
              trigger={
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  <ArrowRight className="w-4 h-4" />
                  Converter
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar Lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem a certeza que deseja eliminar este lead? Esta ação não pode ser revertida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Menu */}
        <EntitySidebarMenu
          entityType="lead"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          counts={counts}
        />

        {/* Center Content */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-4xl">
              {renderSectionContent()}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
