import { useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies, Company } from "@/hooks/useCompanies";
import { useEntityNavIds } from "@/hooks/useEntityNavIds";
import { useEntityListNavigation } from "@/hooks/useEntityListNavigation";
import { usePageElementVisibility } from '@/hooks/usePageElementVisibility';
import { EntityRecordPager } from "@/components/entity/EntityRecordPager";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { checkDuplicate } from "@/utils/duplicateCheck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Building2, 
  Trash2, 
  Clock,
  Sparkles,
  Globe,
  Mail,
  Phone,
  Wand2, 
  FileText,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { generateIndustrySummary } from "@/utils/industrySummary";
import { useGenerateFieldSuggestions } from "@/hooks/useFieldSuggestions";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useEntityCounts } from "@/hooks/useEntityCounts";
import { EntityHorizontalTabs } from "@/components/entity/EntityHorizontalTabs";
import { EntityDetailsPanel } from "@/components/entity/EntityDetailsPanel";
import { EntitySubTabs } from "@/components/entity/EntitySubTabs";
import { FinancialKPIStrip } from "@/components/shared/FinancialKPIStrip";
import { EntityHighlightsGrid } from "@/components/entity/EntityHighlightsGrid";
import { MenuSection } from "@/types/entity";
import { InsightsSidebar } from "@/components/insights";
import { EmailHistorySection } from "@/components/email";
import { EntityCreditProposalsSection } from "@/modules/credit-intermediation/components/EntityCreditProposalsSection";
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";
import { CompanyContacts } from "./CompanyContacts";
import { IdentificationSection } from "./sections/IdentificationSection";
import { FinancialSection } from "./sections/FinancialSection";
import { AddressSection } from "./sections/AddressSection";
import { NotesSection as CompanyNotesSection } from "./sections/NotesSection";
import { NotesSection } from "@/components/leads/sections/NotesSection";
import { TagsSection } from "./sections/TagsSection";
import { SocialMediaSection } from "./sections/SocialMediaSection";
import { CompleteSocialAnalysisSection } from "./sections/CompleteSocialAnalysisSection";
import { CompanyContactsHistory } from "./sections/CompanyContactsHistory";
import { CompanyContextSection } from "./sections/CompanyContextSection";
import { OutreachOneToOneSection } from "@/modules/outreach/components/OutreachOneToOneSection";
import { AcquiredProductsSection } from "@/components/shared/AcquiredProductsSection";
import { CustomerJourneySection } from "@/components/customer-journey/CustomerJourneySection";
import { AIJourneySuggestionsPanel } from "@/components/customer-journey/AIJourneySuggestionsPanel";
import { EnrichCompanyDialog } from "./dialogs/EnrichCompanyDialog";
import { CompanyInsightsPanel } from "./CompanyInsightsPanel";
import { LinkContactDialog } from "./LinkContactDialog";
import { SuggestedContact } from "@/hooks/useCompleteSocialAnalysis";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { EntityTicketsSection } from "@/components/helpdesk/EntityTicketsSection";
import { EntityCustomFieldsSection } from "@/components/shared/EntityCustomFieldsSection";
import { ActivityProfileBadge, ProfileCustomFieldsSection } from "@/components/activity-profile";
import { useActivityProfileContext } from "@/contexts/ActivityProfileContext";
import { useEntityActivityProfile } from "@/hooks/useActivityProfiles";
import { ContactMessagesSection } from "@/components/messages/ContactMessagesSection";
import { EntityTasksSection } from "@/components/tasks";
import { EntityAutomationSection } from "@/components/automations/EntityAutomationSection";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";
import { EntityOpportunitiesSection } from "@/components/opportunities/EntityOpportunitiesSection";
import { EntityTimelineSection } from "@/components/timeline";
import { CompanyOrderNotesSection } from "@/components/companies/sections/CompanyOrderNotesSection";
import { CommercialHistorySection } from "@/components/companies/sections/CommercialHistorySection";
import { EntityProposalsSection } from "@/components/proposals/EntityProposalsSection";
import { EntitySchedulingSection } from "@/components/scheduling/EntitySchedulingSection";
import { RelationshipsPanel } from "@/components/objects/RelationshipsPanel";
import { CompanyScoresCard } from "./sections/CompanyScoresCard";
import { CompanyLifecycleSection } from "./sections/CompanyLifecycleSection";
import { CompanyFirmographicsSection } from "./sections/CompanyFirmographicsSection";
import { CompanyAuditSection } from "./sections/CompanyAuditSection";
import { RecommendationPanel } from "@/components/shared/RecommendationPanel";
import { EntityTeamSection } from "@/components/entity/EntityTeamSection";
import { EntityDocumentsSection } from "@/components/entity/EntityDocumentsSection";
import { InlineHeaderTags } from "@/components/entity/InlineHeaderTags";
import { CommercialSummaryCard } from "@/components/crm/commercial/CommercialSummaryCard";
import { CommercialRiskSignals } from "@/components/crm/commercial/CommercialRiskSignals";
import { InvoiceHistorySection } from "@/components/contacts/eni/sections/InvoiceHistorySection";
import { CompanyFinancingSection } from "./sections/CompanyFinancingSection";
import { WhatsAppCallButton } from "@/components/voice/WhatsAppCallButton";
import { WhatsAppMessageButton } from "@/components/whatsapp/WhatsAppMessageButton";
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  return date.toLocaleDateString('pt-PT');
}

export function CompanyDetailWithSidebar() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { companies, isLoading, updateCompany, deleteCompany } = useCompanies();
  const { currentWorkspace } = useWorkspace();
  const { isModuleInstalled } = useWorkspaceModules();
  const { data: counts } = useEntityCounts('company', id);
  const companyNavIds = useEntityNavIds("companies");
  const companyNavigation = useEntityListNavigation("company", id, undefined, {
    fallbackIds: companyNavIds,
    fallbackBasePath: "/dashboard/companies",
  });
  const { setCurrentEntityProfile } = useActivityProfileContext();
  const { data: entityProfile } = useEntityActivityProfile('company', id);
  
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [linkContactDialogOpen, setLinkContactDialogOpen] = useState(false);
  const [prefillContactData, setPrefillContactData] = useState<SuggestedContact | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [firecrawlEnriching, setFirecrawlEnriching] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const { isElementVisible: isActionVisible } = usePageElementVisibility('companies');

  const company = companies.find(c => c.id === id);
  const showEnrichButton = isModuleInstalled('google-local-services');
  const generateSuggestions = useGenerateFieldSuggestions();

  // Set entity profile when it loads
  useEffect(() => {
    if (entityProfile) {
      setCurrentEntityProfile(entityProfile);
    }
    return () => setCurrentEntityProfile(null);
  }, [entityProfile, setCurrentEntityProfile]);

  const handleFieldChange = useCallback(async (field: keyof Company, value: unknown) => {
    if (!company || !currentWorkspace) return;
    
    // Preventive duplicate check for email and tax_id
    if ((field === 'email' || field === 'tax_id') && typeof value === 'string' && value.trim()) {
      const duplicateName = await checkDuplicate('companies', field, value, currentWorkspace.id, company.id);
      if (duplicateName) {
        const label = field === 'email' ? 'email' : 'NIF';
        toast.error(`Já existe uma empresa com este ${label}: "${duplicateName}"`);
        throw new Error(`DUPLICATE_${field.toUpperCase()}`);
      }
    }
    
    await updateCompany.mutateAsync({
      id: company.id,
      [field]: value || undefined,
    });
    toast.success("Campo atualizado");
  }, [company, updateCompany, currentWorkspace]);

  const handleNifDataReceived = useCallback(async (data: NifLookupResult) => {
    if (!company) return;
    const updateData: Record<string, unknown> = { id: company.id };
    if (data.company_name && !company.name) updateData.name = data.company_name;
    if (data.address) updateData.address = data.address;
    if (data.email && !company.email) updateData.email = data.email;
    if (data.phone && !company.phone) updateData.phone = data.phone;
    if (data.website && !company.website) updateData.website = data.website;
    // Store full CAE description and codes
    if (data.cae_description) updateData.cae_description = data.cae_description;
    if (data.cae_codes && data.cae_codes.length > 0) updateData.cae_codes = data.cae_codes;
    // Generate short summary for industry field
    if (data.cae_description && !company.industry) {
      updateData.industry = generateIndustrySummary(data.cae_description);
    }
    if (Object.keys(updateData).length > 1) {
      await updateCompany.mutateAsync(updateData as { id: string });
      toast.success("Dados da empresa preenchidos automaticamente!");
    }
  }, [company, updateCompany]);

  const handleDelete = async () => {
    if (!company) return;
    try {
      await deleteCompany.mutateAsync(company.id);
      toast.success("Empresa eliminada com sucesso");
      navigate("/dashboard/companies");
    } catch {
      toast.error("Erro ao eliminar empresa");
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "company", entityId: id });
  };

  const handleEnrichmentApplied = useCallback((fields: Record<string, unknown>) => {
    if (company) {
      updateCompany.mutate({ id: company.id, ...fields });
    }
  }, [company, updateCompany]);

  const handleCreateContactFromEmployee = useCallback((contact: SuggestedContact) => {
    setPrefillContactData(contact);
    setLinkContactDialogOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Empresa não encontrada</h2>
        <p className="text-muted-foreground mb-4">A empresa que procura não existe ou foi eliminada.</p>
        <Button onClick={() => navigate("/dashboard/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar às Empresas
        </Button>
      </div>
    );
  }

  const initials = company.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <CompanyScoresCard company={company} editable />
              <CompanyLifecycleSection
                status={(company as any).company_status || 'prospect'}
                onStatusChange={(s) => handleFieldChange('company_status' as keyof Company, s)}
              />
            </div>
            <InsightsSidebar entityType="company" entityId={id || ''} />
            <RecommendationPanel
              companyId={id}
              context="company_view"
              mode="panel"
              onAddToProposal={(productId) => {
                navigate(`/dashboard/proposals/new?company=${id}&product=${productId}`);
              }}
            />
            <IdentificationSection 
              company={company} 
              onFieldChange={handleFieldChange}
              onNifDataReceived={handleNifDataReceived}
            />
            <CompanyContextSection companyContext={company.company_context} />
            <OutreachOneToOneSection
              entityType="company"
              entityId={id || ''}
              entityName={company.name}
              email={(company as any).email}
              phone={(company as any).phone}
              companyId={id || null}
              companyName={company.name}
              companyContextText={
                (company.company_context as any)?.about_us ||
                (company.company_context as any)?.services ||
                null
              }
              socialUrls={[
                company.linkedin_url ? { label: 'LinkedIn', url: company.linkedin_url } : null,
                company.instagram_url ? { label: 'Instagram', url: company.instagram_url } : null,
                company.facebook_url ? { label: 'Facebook', url: company.facebook_url } : null,
              ].filter(Boolean) as Array<{ label: string; url: string }>}
            />
          </div>
        );
      case 'insights':
        return (
          <div className="space-y-6">
            <AgentQueueStatus entityId={id!} entityType="company" compact={false} showAnalyzeButton={true} />
            <CompanyInsightsPanel company={company} />
            <CompleteSocialAnalysisSection 
              companyId={id || ''}
              companyName={company.name}
              linkedinUrl={company.linkedin_url}
              instagramUrl={company.instagram_url}
              facebookUrl={company.facebook_url}
              currentCompanyData={{
                industry: company.industry || undefined,
                website: company.website || undefined,
                size: company.size || undefined,
              }}
              onCreateContact={handleCreateContactFromEmployee}
            />
            <CustomerJourneySection companyId={id} />
            <AIJourneySuggestionsPanel 
              entityType="company" 
              entityId={id!} 
              entityName={company.name}
            />
            <EntityMemoryPanel entityId={id!} entityType="company" entityName={company.name} />
          </div>
        );
      case 'contacts':
        return (
          <CompanyContacts 
            companyId={id || ''} 
            companyName={company.name} 
            onAddContact={() => setLinkContactDialogOpen(true)}
          />
        );
      case 'notes':
        return (
          <NotesSection 
            entityType="company" 
            entityId={id!} 
            entityName={company.name} 
          />
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
                  return <EmailHistorySection entityType="company" entityId={id!} entityEmail={company.email} />;
                case 'messages':
                  return <ContactMessagesSection entityType="company" entityId={id!} entityName={company.name} entityEmail={company.email} entityPhone={company.phone} />;
                case 'scheduling':
                  return <EntitySchedulingSection entityType="company" entityId={id!} entityName={company.name} entityEmail={company.email} entityPhone={company.phone} />;
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
              ? <EntityTasksSection entityType="company" entityId={id!} entityName={company.name} />
              : <EntityAutomationSection entityType="company" entityId={id!} entityName={company.name} />
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
                  return <EntityOpportunitiesSection entityType="company" entityId={id!} entityName={company.name} entityIndustry={company.industry || undefined} entityNotes={company.notes || undefined} />;
                case 'proposals':
                  return <EntityProposalsSection entityType="company" entityId={id!} entityName={company.name} />;
                case 'credit':
                  return <EntityCreditProposalsSection entityType="company" entityId={id!} entityName={company.name} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'team':
        return (
          <EntityTeamSection
            entityType="company"
            entityId={id!}
            entityName={company.name}
          />
        );
      case 'timeline':
        return (
          <EntityTimelineSection entityType="company" entityId={id!} entityName={company.name} />
        );
      case 'relationships':
        return <RelationshipsPanel recordId={id!} entityType="company" />;
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
                      {entityProfile && (
                        <ProfileCustomFieldsSection
                          entityType="company"
                          profileType={entityProfile.profile_type}
                          values={(company as any).profile_field_values || {}}
                          onFieldChange={async (fieldName, value) => {
                            const currentValues = (company as any).profile_field_values || {};
                            await handleFieldChange('profile_field_values' as keyof Company, {
                              ...currentValues,
                              [fieldName]: value,
                            });
                          }}
                        />
                      )}
                      <CompanyFirmographicsSection company={company} onFieldChange={handleFieldChange} />
                      <AddressSection company={company} onFieldChange={handleFieldChange} />
                      <SocialMediaSection company={company} onFieldChange={handleFieldChange} />
                      <TagsSection company={company} onFieldChange={handleFieldChange} />
                    </div>
                  );
                case 'fields':
                  return <EntityCustomFieldsSection entityType="company" entityId={id!} />;
                case 'audit':
                  return <CompanyAuditSection companyId={id!} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'support':
        return (
          <EntityTicketsSection entityType="company" entityId={id!} entityName={company.name} />
        );
      case 'files':
        return (
          <EntityDocumentsSection entityType="company" entityId={id!} />
        );
      case 'financial':
        return (
          <div className="space-y-4">
            <EntitySubTabs
              tabs={[
                { id: 'profile', label: 'Perfil' },
                { id: 'payments', label: 'Pagamentos' },
                { id: 'orders', label: 'Encomendas' },
                { id: 'history', label: 'Histórico' },
              ]}
            >
              {(tab) => {
                switch (tab) {
                  case 'profile':
                    return <FinancialSection company={company} onFieldChange={handleFieldChange} />;
                  case 'payments':
                    return (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <AcquiredProductsSection companyId={id!} />
                        <InvoiceHistorySection companyId={id!} />
                      </div>
                    );
                  case 'orders':
                    return <CompanyOrderNotesSection companyId={id!} />;
                  case 'history':
                    return (
                      <div className="space-y-4">
                        <CommercialHistorySection company={company} onFieldChange={handleFieldChange} />
                        <CompanyContactsHistory companyId={id!} />
                      </div>
                    );
                  default: return null;
                }
              }}
            </EntitySubTabs>
          </div>
        );
      case 'financing':
        return <CompanyFinancingSection companyId={id!} companyName={company.name} />;
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
            { label: "Empresas", href: "/dashboard/companies" },
            { label: company.name },
          ]}
        />
      </div>

      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/companies")}
            className="shrink-0"
            aria-label="Voltar às empresas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <EntityAvatarUpload
            name={company.name}
            value={(company as any).avatar_url}
            onChange={(url) => handleFieldChange('avatar_url' as keyof Company, url)}
            workspaceId={currentWorkspace?.id ?? ''}
            folder="companies"
            size="md"
            compact
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {company.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>Empresa</span>
              {company.industry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="max-w-[240px] truncate" title={company.industry}>
                    {generateIndustrySummary(company.industry)}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Atualizado há {getTimeAgo(new Date(company.updated_at))}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ActivityProfileBadge
                entityType="company"
                entityId={id!}
                currentProfile={entityProfile}
                currentProfileId={company.activity_profile_id}
              />
              <InlineHeaderTags
                tags={company.tags || []}
                onTagsChange={(newTags) => handleFieldChange('tags', newTags)}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <EntityRecordPager navigation={companyNavigation} label="Empresa" className="shrink-0" />
            {company.phone && (
              <>
                <WhatsAppCallButton
                  phone={company.phone}
                  entityType="company"
                  entityId={company.id}
                  entityName={company.name}
                />
                <WhatsAppMessageButton
                  phone={company.phone}
                  entityType="company"
                  entityId={company.id}
                  entityName={company.name}
                  companyName={company.name}
                />
              </>
            )}
            {isActionVisible('action', 'new-invoice') && (
              <Button onClick={() => setShowInvoiceDialog(true)} className="gap-2">
                <FileText className="w-4 h-4" />
                Nova Fatura
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {company.website && (
                  <DropdownMenuItem asChild>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Visitar website
                    </a>
                  </DropdownMenuItem>
                )}
                {company.email && (
                  <DropdownMenuItem asChild>
                    <a href={`mailto:${company.email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar e-mail
                    </a>
                  </DropdownMenuItem>
                )}
                {company.phone && (
                  <DropdownMenuItem asChild>
                    <a href={`tel:${company.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Ligar
                    </a>
                  </DropdownMenuItem>
                )}
                {(company.website || company.email || company.phone) && <DropdownMenuSeparator />}
                {showEnrichButton && isActionVisible('action', 'enrich-ai') && (
                  <DropdownMenuItem onClick={() => setEnrichDialogOpen(true)}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Enriquecer dados
                  </DropdownMenuItem>
                )}
                {company.website && (
                  <DropdownMenuItem
                    disabled={firecrawlEnriching}
                    onSelect={async (event) => {
                      event.preventDefault();
                      setFirecrawlEnriching(true);
                      try {
                        const { supabase } = await import("@/integrations/supabase/client");
                        const { data, error } = await supabase.functions.invoke('firecrawl-company-enrich', {
                          body: { company_id: company.id, website_url: company.website, workspace_id: currentWorkspace?.id },
                        });
                        if (error) throw error;
                        if (data?.data) {
                          toast.success("Empresa enriquecida com dados do website!");
                          queryClient.invalidateQueries({ queryKey: ["companies"] });
                        } else {
                          toast.info("Dados extraídos parcialmente");
                        }
                      } catch (e: any) {
                        toast.error(`Erro ao enriquecer: ${e.message}`);
                      } finally {
                        setFirecrawlEnriching(false);
                      }
                    }}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    {firecrawlEnriching ? "A analisar website..." : "Enriquecer com website"}
                  </DropdownMenuItem>
                )}
                {isActionVisible('action', 'enrich-ai') && (
                <DropdownMenuItem
                  disabled={generateSuggestions.isPending}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleGenerateSuggestions();
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateSuggestions.isPending ? "A analisar..." : "Analisar IA"}
                </DropdownMenuItem>
                )}
                {isActionVisible('action', 'archive') && (
                <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    setArchiveDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Arquivar empresa
                </DropdownMenuItem>
                </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Arquivar Empresa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem a certeza que deseja arquivar esta empresa? Pode restaurá-la mais tarde.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Arquivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Resumo financeiro sempre visível no cabeçalho */}
        <FinancialKPIStrip entityType="company" entityId={id!} variant="header" className="mt-4" />
      </div>

      {/* Horizontal Tabs */}
      <EntityHorizontalTabs
        entityType="company"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        counts={counts}
      />

      {/* Main Content - Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Center Content */}
        <main className="flex-1 lg:overflow-auto">
          <ScrollArea className="h-full">
            <div className="w-full p-6 xl:max-w-none max-w-5xl mx-auto xl:mx-0">
              {activeSection === 'overview' && (
                <div className="mb-6 space-y-4">
                  <EntityHighlightsGrid entityType="company" entity={company as any} />
                  <CommercialSummaryCard entityType="company" entityId={company.id} />
                  <CommercialRiskSignals entityType="company" entityId={company.id} />
                </div>
              )}
              {renderSectionContent()}
            </div>
          </ScrollArea>
        </main>

        {/* Right Details Panel */}
        <EntityDetailsPanel entityType="company" entity={company as any} onUpdate={(field, value) => handleFieldChange(field as keyof Company, value)} />
      </div>

      {/* Dialogs */}
      {showEnrichButton && (
        <EnrichCompanyDialog
          open={enrichDialogOpen}
          onOpenChange={setEnrichDialogOpen}
          company={{
            id: company.id,
            name: company.name,
            website: company.website,
            email: company.email,
            phone: company.phone,
            industry: company.industry,
            size: company.size,
            address: company.address,
            linkedin_url: company.linkedin_url,
            instagram_url: company.instagram_url,
            facebook_url: company.facebook_url,
            twitter_url: company.twitter_url,
          }}
          onEnrichmentApplied={handleEnrichmentApplied}
        />
      )}

      <LinkContactDialog
        open={linkContactDialogOpen}
        onOpenChange={(open) => {
          setLinkContactDialogOpen(open);
          if (!open) setPrefillContactData(null);
        }}
        companyId={id || ''}
        companyName={company.name}
        companyEmail={company.email}
        companyWebsite={company.website}
        prefillData={prefillContactData ? {
          name: prefillContactData.name,
          job_title: prefillContactData.role,
          linkedin_url: prefillContactData.linkedinUrl,
        } : undefined}
      />

      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        defaultCompanyId={id}
      />
    </div>
  );
}
