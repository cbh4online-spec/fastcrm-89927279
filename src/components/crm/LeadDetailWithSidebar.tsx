import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
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
  UserCircle,
  Linkedin,
  Facebook,
  Twitter,
  Youtube,
  Calendar,
} from "lucide-react";
import { getSourceLabel } from "@/lib/leadSourceLabels";
import { toast } from "sonner";
import { useGenerateFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { InsightsSidebar } from "@/components/insights";
import { ConvertLeadDialog } from "@/components/crm/ConvertLeadDialog";
import { IdentificationSection } from "@/components/leads/sections/IdentificationSection";
import { TagsSection } from "@/components/leads/sections/TagsSection";
import { NotesSection } from "@/components/leads/sections/NotesSection";
import { SocialMediaSection } from "@/components/leads/sections/SocialMediaSection";
import { EntitySocialMediaAnalysisSection } from "@/components/shared/EntitySocialMediaAnalysisSection";
import { EntityHorizontalTabs } from "@/components/entity/EntityHorizontalTabs";
import { EntityDetailsPanel } from "@/components/entity/EntityDetailsPanel";
import { EntityHighlightsGrid } from "@/components/entity/EntityHighlightsGrid";
import { EntitySubTabs } from "@/components/entity/EntitySubTabs";
import { EntityTeamSection } from "@/components/entity/EntityTeamSection";
import { EntityDocumentsSection } from "@/components/entity/EntityDocumentsSection";
import { InlineHeaderTags } from "@/components/entity/InlineHeaderTags";
import { useEntityCounts } from "@/hooks/useEntityCounts";
import { MenuSection } from "@/types/entity";
import { EntityTasksSection } from "@/components/tasks";
import { EntityAutomationSection } from "@/components/automations/EntityAutomationSection";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";
import { ContactMessagesSection } from "@/components/messages/ContactMessagesSection";
import { RecommendationPanel } from "@/components/shared/RecommendationPanel";
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
import { EntitySchedulingSection } from "@/components/scheduling/EntitySchedulingSection";
import { ComposeEmailDialog, EmailHistorySection } from "@/components/email";
import { AIDealInsightPanel } from "@/components/contacts/sections/AIDealInsightPanel";
import { LeadScoresCard } from "@/components/leads/sections/LeadScoresCard";
import { LeadLifecycleSection } from "@/components/leads/sections/LeadLifecycleSection";
import { LeadAuditSection } from "@/components/leads/sections/LeadAuditSection";

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
  public_booking: <Calendar className="w-3 h-3" />,
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
  const { data: lead, isLoading, isFetching, isPending } = useLead(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: counts } = useEntityCounts('lead', id);
  
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const generateSuggestions = useGenerateFieldSuggestions();


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

  if (isLoading || isPending || isFetching) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LeadScoresCard lead={lead} />
              <LeadLifecycleSection 
                lead={lead} 
                onStatusChange={(status) => handleFieldChange('status', status)} 
              />
            </div>
            <InsightsSidebar entityType="lead" entityId={id || ''} />
            <RecommendationPanel
              leadId={id}
              context="lead_view"
              mode="panel"
              onAddToProposal={(productId) => {
                navigate(`/dashboard/proposals/new?lead=${id}&product=${productId}`);
              }}
            />
          </div>
        );
      case 'insights':
        return (
          <div className="space-y-6">
            <AgentQueueStatus entityId={id!} entityType="lead" compact={false} showAnalyzeButton={true} />
            <LeadAgentInsightsSection 
              leadId={id!}
              onActionClick={(actionType) => { toast.info(`Ação: ${actionType}`); }}
            />
            <AIDealInsightPanel leadId={id} />
            <InsightsSidebar entityType="lead" entityId={id || ''} />
            <EntitySocialMediaAnalysisSection
              entityType="lead" entityId={id!} entityName={lead.name} linkedinUrl={lead.linkedin_url}
            />
            <EntityMemoryPanel entityId={id!} entityType="lead" entityName={lead.name} />
          </div>
        );
      case 'timeline':
        return (
          <EntityTimelineSection entityType="lead" entityId={id!} entityName={lead.name} />
        );
      case 'notes':
        return (
          <NotesSection entityType="lead" entityId={id!} entityName={lead.name} />
        );
      case 'communication':
        return (
          <EntitySubTabs
            tabs={[
              { id: 'emails', label: 'Emails' },
              { id: 'messages', label: 'Mensagens' },
              { id: 'scheduling', label: 'Agendamentos' },
            ]}
          >
            {(tab) => {
              switch (tab) {
                case 'emails':
                  return <EmailHistorySection entityType="lead" entityId={id!} entityEmail={lead.email} />;
                case 'messages':
                  return (
                    <ContactMessagesSection
                      entityType="lead"
                      entityId={id!}
                      entityName={lead.name}
                      entityEmail={lead.email}
                      entityPhone={lead.phone}
                      entityContext={{
                        source: lead.source,
                        status: lead.status,
                        tags: lead.tags || [],
                        company: lead.company_name,
                        notes: lead.notes,
                        score: lead.lead_score,
                        lifecycle_stage: lead.inferred_type,
                        instagram_url: lead.instagram_url,
                        website_url: lead.website,
                        created_at: lead.created_at,
                      }}
                    />
                  );
                case 'scheduling':
                  return <EntitySchedulingSection entityType="lead" entityId={id!} entityName={lead.name} entityEmail={lead.email} entityPhone={lead.phone} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'activity':
        return (
          <EntitySubTabs
            tabs={[
              { id: 'tasks', label: 'Tarefas' },
              { id: 'automations', label: 'Automações' },
            ]}
          >
            {(tab) => tab === 'tasks'
              ? <EntityTasksSection entityType="lead" entityId={id!} entityName={lead.name} />
              : <EntityAutomationSection entityType="lead" entityId={id!} entityName={lead.name} />
            }
          </EntitySubTabs>
        );
      case 'business':
        return (
          <EntitySubTabs
            tabs={[
              { id: 'opportunities', label: 'Oportunidades' },
              { id: 'proposals', label: 'Propostas' },
              { id: 'credit', label: 'Crédito' },
            ]}
          >
            {(tab) => {
              switch (tab) {
                case 'opportunities':
                  return <OpportunitiesSection leadId={id!} leadName={lead.name} />;
                case 'proposals':
                  return <ProposalsSection leadId={id!} leadName={lead.name} />;
                case 'credit':
                  return <EntityCreditProposalsSection entityType="lead" entityId={id!} entityName={lead.name} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'team':
        return (
          <EntityTeamSection
            entityType="lead"
            entityId={id!}
            entityName={lead.name}
          />
        );
      case 'files':
        return (
          <EntityDocumentsSection entityType="lead" entityId={id!} />
        );
      case 'data':
        return (
          <EntitySubTabs
            tabs={[
              { id: 'details', label: 'Informações' },
              { id: 'fields', label: 'Campos' },
              { id: 'audit', label: 'Auditoria' },
            ]}
          >
            {(tab) => {
              switch (tab) {
                case 'details':
                  return (
                    <div className="space-y-6">
                      <InstagramDataSection lead={lead} />
                      <AIAnalysisSection lead={lead} />
                      <TagsSection lead={lead} onFieldChange={handleFieldChange} />
                    </div>
                  );
                case 'fields':
                  return <CustomFieldsSection leadId={id!} />;
                case 'audit':
                  return <LeadAuditSection leadId={id!} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
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
    <div className="flex flex-col -mx-4 -mt-4 -mb-4 md:-mx-6 md:-mt-6 md:-mb-6 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] bg-background">
      {/* Breadcrumbs */}
      <div className="px-4 sm:px-8 pt-5">
        <PageBreadcrumbs
          items={[
            { label: "CRM", href: "/dashboard/crm" },
            { label: "Leads", href: "/dashboard/leads" },
            { label: lead.name },
          ]}
        />
      </div>

      {/* Header — estilo IX: superfície limpa, título grande, pills discretas */}
      <div className="px-4 sm:px-8 pt-4 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/leads")}
              className="shrink-0 mt-1 h-9 w-9 rounded-full hover:bg-muted"
            >
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                  {lead.name}
                </h1>
                {lead.source && (
                  <Badge variant="secondary" className="gap-1 text-[11px] uppercase font-medium shrink-0 rounded-full">
                    {SourceIcon}
                    <span className="hidden sm:inline">{getSourceLabel(lead.source)}</span>
                  </Badge>
                )}
                <Badge variant="outline" className={cn(statusColors[lead.status], "shrink-0 rounded-full")}>
                  {statusLabels[lead.status]}
                </Badge>
                <InlineHeaderTags
                  tags={lead.tags || []}
                  onTagsChange={(newTags) => handleFieldChange('tags', newTags)}
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Atualizado há {getTimeAgo(new Date(lead.updated_at))}
              </p>
              {(() => {
                const l = lead as any;
                const socials = [
                  { url: l.linkedin_url, icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
                  { url: l.facebook_url, icon: Facebook, label: 'Facebook', color: '#1877F2' },
                  { url: l.instagram_url, icon: Instagram, label: 'Instagram', color: '#E4405F' },
                  { url: l.twitter_url, icon: Twitter, label: 'X (Twitter)', color: '#000000' },
                  { url: l.youtube_url, icon: Youtube, label: 'YouTube', color: '#FF0000' },
                ].filter(s => !!s.url);
                if (!socials.length) return null;
                return (
                  <div className="flex items-center gap-1.5 mt-2">
                    {socials.map(s => {
                      const Icon = s.icon;
                      const href = String(s.url).startsWith('http') ? String(s.url) : `https://${s.url}`;
                      return (
                        <TooltipProvider key={s.label}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted/60 transition-colors">
                                <Icon className="w-4 h-4" style={{ color: s.color }} />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{s.label}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pl-12 lg:pl-0">
            {lead.email && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full border-border bg-card"
                      onClick={() => setActiveSection('communication')}
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
                      className="h-10 w-10 rounded-full border-border bg-card"
                      onClick={() => setActiveSection('communication')}
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
              className="h-10 gap-2 rounded-full border-border bg-card px-4"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{generateSuggestions.isPending ? "A analisar..." : "Analisar IA"}</span>
            </Button>
            <ConvertLeadDialog
              lead={lead}
              trigger={
                <Button className="h-10 gap-2 rounded-full px-5">
                  <ArrowRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Converter</span>
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-border bg-card text-destructive hover:text-destructive shrink-0">
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

      {/* Horizontal Tabs */}
      <div className="border-t border-border/60">
        <EntityHorizontalTabs
          entityType="lead"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          counts={counts}
        />
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 lg:flex lg:flex-row lg:min-h-0 lg:overflow-hidden bg-muted/20">
        <main className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <div className="p-4 sm:p-8 max-w-4xl space-y-6">
            {activeSection === 'overview' && (
              <EntityHighlightsGrid entityType="lead" entity={lead as any} />
            )}
            {renderSectionContent()}
          </div>
        </main>

        <EntityDetailsPanel entityType="lead" entity={lead as any} onUpdate={(field, value) => handleFieldChange(field as keyof Lead, value)} onEmailClick={(email) => { setEmailTo(email); setShowEmailDialog(true); }} />
      </div>

      {/* Compose Email Dialog */}
      <ComposeEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipient={{ email: emailTo, name: lead.name, entityType: 'lead', entityId: lead.id }}
      />
    </div>
  );
}
