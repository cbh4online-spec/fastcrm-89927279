import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, Lead } from "@/hooks/useLeads";
import { useEntityNavIds } from "@/hooks/useEntityNavIds";
import { useEntityListNavigation } from "@/hooks/useEntityListNavigation";
import { EntityRecordPager } from "@/components/entity/EntityRecordPager";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Trash2,
  Sparkles,
} from "lucide-react";
import { getSourceLabel } from "@/lib/leadSourceLabels";
import { toast } from "sonner";
import { useGenerateFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { InsightsSidebar } from "@/components/insights";
import { ConvertLeadDialog } from "@/components/crm/ConvertLeadDialog";
import { TagsSection } from "@/components/leads/sections/TagsSection";
import { LeadAddressSection } from "@/components/leads/sections/LeadAddressSection";
import { NotesSection } from "@/components/leads/sections/NotesSection";
import { EntitySocialMediaAnalysisSection } from "@/components/shared/EntitySocialMediaAnalysisSection";
import { EntityDetailsPanel } from "@/components/entity/EntityDetailsPanel";
import { EntityHighlightsGrid } from "@/components/entity/EntityHighlightsGrid";
import { EntitySubTabs } from "@/components/entity/EntitySubTabs";
import { EntityTeamSection } from "@/components/entity/EntityTeamSection";
import { EntityDocumentsSection } from "@/components/entity/EntityDocumentsSection";
import { useEntityCounts } from "@/hooks/useEntityCounts";
import { EntityTasksSection } from "@/components/tasks";
import { EntityAutomationSection } from "@/components/automations/EntityAutomationSection";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
import { LeadNextBestActionCard } from "@/components/whatsapp-pro/LeadNextBestActionCard";
import { OutreachOneToOneSection } from "@/modules/outreach/components/OutreachOneToOneSection";
import { LeadLifecycleSection } from "@/components/leads/sections/LeadLifecycleSection";
import { LeadAuditSection } from "@/components/leads/sections/LeadAuditSection";
import { IXEntityHeader } from "@/components/entity/ix/IXEntityHeader";
import { IXEntityTabs } from "@/components/entity/ix/IXEntityTabs";
import { WhatsAppCallButton } from "@/components/voice/WhatsAppCallButton";
import { WhatsAppMessageButton } from "@/components/whatsapp/WhatsAppMessageButton";
import { GHLCallButton } from "@/components/voice/GHLCallButton";

type IXTabId = "overview" | "activity" | "communication" | "business" | "ai_data";

const statusToTone: Record<string, "info" | "warning" | "success"> = {
  new: "info",
  in_progress: "warning",
  completed: "success",
};
const statusLabels: Record<string, string> = {
  new: "Novo",
  in_progress: "Em Progresso",
  completed: "Concluído",
};

function getTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} dias`;
  return date.toLocaleDateString("pt-PT");
}

export function LeadDetailWithSidebar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading, isFetching, isPending } = useLead(id);
  const leadNavIds = useEntityNavIds("leads");
  const leadNavigation = useEntityListNavigation("lead", id, undefined, {
    fallbackIds: leadNavIds,
    fallbackBasePath: "/dashboard/leads",
  });
  const { currentWorkspace } = useWorkspace();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const { data: counts } = useEntityCounts("lead", id);

  const [activeTab, setActiveTab] = useState<IXTabId>("overview");
  const [activeActivitySub, setActiveActivitySub] = useState("timeline");
  const [activeCommunicationSub, setActiveCommunicationSub] = useState("emails");
  const [activeBusinessSub, setActiveBusinessSub] = useState("opportunities");
  const [activeDataSub, setActiveDataSub] = useState("insights");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const generateSuggestions = useGenerateFieldSuggestions();

  const handleFieldChange = useCallback(
    async (field: keyof Lead, value: unknown) => {
      if (!lead) return;
      await updateLead.mutateAsync({ id: lead.id, [field]: value || undefined });
      toast.success("Campo atualizado");
    },
    [lead, updateLead]
  );

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead eliminado");
      navigate("/dashboard/leads");
    } catch {
      toast.error("Erro ao eliminar lead");
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "lead", entityId: id });
  };

  const ixTabs = useMemo(() => {
    const c = (counts ?? {}) as Record<string, number | undefined>;
    const n = (k: string) => c[k] ?? 0;
    return [
      { id: "overview", label: "Visão Geral" },
      { id: "activity", label: "Atividade", count: n("tasks") + n("notes") },
      { id: "communication", label: "Comunicação", count: n("messages") + n("scheduling") },
      {
        id: "business",
        label: "Negócio",
        count: n("opportunities") + n("proposals") + n("credit") + n("files"),
      },
      { id: "ai_data", label: "IA & Dados" },
    ];
  }, [counts]);

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

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <EntityHighlightsGrid entityType="lead" entity={lead as any} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LeadScoresCard lead={lead} />
              <LeadLifecycleSection
                lead={lead}
                onStatusChange={(status) => handleFieldChange("status", status)}
              />
            </div>
            <TagsSection lead={lead} onFieldChange={handleFieldChange} />
            <LeadAddressSection lead={lead} onFieldChange={handleFieldChange} />
            {id && <LeadNextBestActionCard leadId={id} />}
            <RecommendationPanel
              leadId={id}
              context="lead_view"
              mode="panel"
              onAddToProposal={(productId) => {
                navigate(`/dashboard/proposals/new?lead=${id}&product=${productId}`);
              }}
            />
            <OutreachOneToOneSection
              entityType="lead"
              entityId={id || ""}
              entityName={lead.name}
              email={(lead as any).email || (lead as any).preferred_contact_email || null}
              phone={(lead as any).phone || (lead as any).preferred_contact_phone || null}
              companyId={null}
              companyName={(lead as any).company_name || null}
              socialUrls={[
                (lead as any).linkedin_url ? { label: "LinkedIn", url: (lead as any).linkedin_url } : null,
                (lead as any).instagram_url ? { label: "Instagram", url: (lead as any).instagram_url } : null,
                (lead as any).facebook_url ? { label: "Facebook", url: (lead as any).facebook_url } : null,
              ].filter(Boolean) as Array<{ label: string; url: string }>}
            />
          </div>
        );

      case "activity":
        return (
          <EntitySubTabs
            tabs={[
              { id: "timeline", label: "Timeline" },
              { id: "notes", label: "Notas" },
              { id: "tasks", label: "Tarefas" },
              { id: "automations", label: "Automações" },
            ]}
            activeTab={activeActivitySub}
            onTabChange={setActiveActivitySub}
          >
            {(tab) => {
              switch (tab) {
                case "timeline":
                  return <EntityTimelineSection entityType="lead" entityId={id!} entityName={lead.name} />;
                case "notes":
                  return <NotesSection entityType="lead" entityId={id!} entityName={lead.name} />;
                case "tasks":
                  return <EntityTasksSection entityType="lead" entityId={id!} entityName={lead.name} />;
                case "automations":
                  return <EntityAutomationSection entityType="lead" entityId={id!} entityName={lead.name} />;
                default:
                  return null;
              }
            }}
          </EntitySubTabs>
        );

      case "communication":
        return (
          <EntitySubTabs
            tabs={[
              { id: "emails", label: "Emails" },
              { id: "messages", label: "Mensagens" },
              { id: "scheduling", label: "Agendamentos" },
            ]}
            activeTab={activeCommunicationSub}
            onTabChange={setActiveCommunicationSub}
          >
            {(tab) => {
              switch (tab) {
                case "emails":
                  return <EmailHistorySection entityType="lead" entityId={id!} entityEmail={lead.email} />;
                case "messages":
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
                case "scheduling":
                  return (
                    <EntitySchedulingSection
                      entityType="lead"
                      entityId={id!}
                      entityName={lead.name}
                      entityEmail={lead.email}
                      entityPhone={lead.phone}
                    />
                  );
                default:
                  return null;
              }
            }}
          </EntitySubTabs>
        );

      case "business":
        return (
          <EntitySubTabs
            tabs={[
              { id: "opportunities", label: "Oportunidades" },
              { id: "proposals", label: "Propostas" },
              { id: "credit", label: "Crédito" },
              { id: "files", label: "Ficheiros" },
              { id: "team", label: "Equipa" },
            ]}
            activeTab={activeBusinessSub}
            onTabChange={setActiveBusinessSub}
          >
            {(tab) => {
              switch (tab) {
                case "opportunities":
                  return <OpportunitiesSection leadId={id!} leadName={lead.name} />;
                case "proposals":
                  return <ProposalsSection leadId={id!} leadName={lead.name} />;
                case "credit":
                  return <EntityCreditProposalsSection entityType="lead" entityId={id!} entityName={lead.name} />;
                case "files":
                  return <EntityDocumentsSection entityType="lead" entityId={id!} />;
                case "team":
                  return <EntityTeamSection entityType="lead" entityId={id!} entityName={lead.name} />;
                default:
                  return null;
              }
            }}
          </EntitySubTabs>
        );

      case "ai_data":
        return (
          <EntitySubTabs
            tabs={[
              { id: "insights", label: "Insights IA" },
              { id: "agent", label: "Agente" },
              { id: "social", label: "Social" },
              { id: "instagram", label: "Instagram" },
              { id: "fields", label: "Campos" },
              { id: "audit", label: "Auditoria" },
            ]}
            activeTab={activeDataSub}
            onTabChange={setActiveDataSub}
          >
            {(tab) => {
              switch (tab) {
                case "insights":
                  return (
                    <div className="space-y-6">
                      <AIDealInsightPanel leadId={id} />
                      <LeadAgentInsightsSection
                        leadId={id!}
                        onActionClick={(actionType) => toast.info(`Ação: ${actionType}`)}
                      />
                      <InsightsSidebar entityType="lead" entityId={id || ""} />
                      <AIAnalysisSection lead={lead} />
                    </div>
                  );
                case "agent":
                  return (
                    <div className="space-y-6">
                      <AgentQueueStatus entityId={id!} entityType="lead" compact={false} showAnalyzeButton={true} />
                      <EntityMemoryPanel entityId={id!} entityType="lead" entityName={lead.name} />
                    </div>
                  );
                case "social":
                  return (
                    <EntitySocialMediaAnalysisSection
                      entityType="lead"
                      entityId={id!}
                      entityName={lead.name}
                      linkedinUrl={lead.linkedin_url}
                    />
                  );
                case "instagram":
                  return <InstagramDataSection lead={lead} />;
                case "fields":
                  return <CustomFieldsSection leadId={id!} />;
                case "audit":
                  return <LeadAuditSection leadId={id!} />;
                default:
                  return null;
              }
            }}
          </EntitySubTabs>
        );
    }
  };

  return (
    <div className="flex flex-col -mx-4 -mt-4 -mb-4 md:-mx-6 md:-mt-6 md:-mb-6 min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] bg-background">
      <div className="px-4 sm:px-8 pt-5">
        <PageBreadcrumbs
          items={[
            { label: "CRM", href: "/dashboard/crm" },
            { label: "Leads", href: "/dashboard/leads" },
            { label: lead.name },
          ]}
        />
      </div>

      <IXEntityHeader
        backTo="/dashboard/leads"
        avatar={
          <EntityAvatarUpload
            name={lead.name}
            value={(lead as any).avatar_url}
            onChange={(url) => handleFieldChange("avatar_url" as keyof Lead, url)}
            workspaceId={currentWorkspace?.id ?? ''}
            folder="leads"
            size="md"
          />
        }
        title={lead.name}
        onTitleSave={async (name) => {
          await updateLead.mutateAsync({ id: lead.id, name });
        }}
        status={
          lead.status
            ? { label: statusLabels[lead.status] ?? lead.status, tone: statusToTone[lead.status] ?? "neutral" }
            : undefined
        }
        metaItems={[
          { label: "Origem", value: lead.source ? getSourceLabel(lead.source) : undefined },
          { label: "Empresa", value: lead.company_name || undefined },
          {
            label: "Tags",
            value:
              lead.tags && lead.tags.length > 0
                ? lead.tags.slice(0, 3).join(", ") + (lead.tags.length > 3 ? "…" : "")
                : undefined,
          },
        ]}
        updatedAgo={getTimeAgo(new Date(lead.updated_at))}
        primaryAction={{
          label: "Converter",
          icon: <ArrowRight className="w-4 h-4" />,
          onClick: () => {
            // ConvertLeadDialog needs a trigger; we open via hidden trigger below.
            const el = document.getElementById("ix-convert-lead-trigger");
            el?.click();
          },
        }}
        secondaryActions={[
          {
            id: "ai",
            label: generateSuggestions.isPending ? "A analisar…" : "Analisar com IA",
            icon: <Sparkles className="w-4 h-4" />,
            onClick: handleGenerateSuggestions,
            disabled: generateSuggestions.isPending,
          },
          ...(lead.email
            ? [
                {
                  id: "email",
                  label: "Enviar email",
                  icon: <Mail className="w-4 h-4" />,
                  onClick: () => {
                    setEmailTo(lead.email!);
                    setShowEmailDialog(true);
                  },
                },
              ]
            : []),
          {
            id: "delete",
            label: "Eliminar lead",
            icon: <Trash2 className="w-4 h-4" />,
            destructive: true,
            onClick: () => setConfirmDelete(true),
          },
        ]}
        rightExtras={
          <div className="flex items-center gap-2">
            <EntityRecordPager navigation={leadNavigation} label="Lead" className="shrink-0" />
            {lead.phone && (
              <>
                <WhatsAppCallButton
                  phone={lead.phone}
                  entityType="lead"
                  entityId={lead.id}
                  entityName={lead.name}
                />
                <WhatsAppMessageButton
                  phone={lead.phone}
                  entityType="lead"
                  entityId={lead.id}
                  entityName={lead.name}
                />
              </>
            )}
            <GHLCallButton
              entityType="lead"
              entityId={lead.id}
              entityName={lead.name}
              phone={lead.phone}
            />
          </div>
        }
      />

      {/* Hidden ConvertLeadDialog trigger to preserve existing dialog flow */}
      <div className="hidden">
        <ConvertLeadDialog lead={lead} trigger={<button id="ix-convert-lead-trigger" />} />
      </div>

      <IXEntityTabs
        tabs={ixTabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as IXTabId)}
      />

      <div className="flex-1 lg:flex lg:flex-row lg:min-h-0 lg:overflow-hidden bg-muted/20">
        <main className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <div className="w-full p-4 sm:p-8 space-y-6 max-w-5xl mx-auto xl:max-w-none xl:mx-0">{renderTab()}</div>
        </main>

        <EntityDetailsPanel
          entityType="lead"
          entity={lead as any}
          onUpdate={(field, value) => handleFieldChange(field as keyof Lead, value)}
          onEmailClick={(email) => {
            setEmailTo(email);
            setShowEmailDialog(true);
          }}
        />
      </div>

      <ComposeEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipient={{ email: emailTo, name: lead.name, entityType: "lead", entityId: lead.id }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este lead? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
