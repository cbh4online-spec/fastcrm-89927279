import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useContacts } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { ArrowLeft, Trash2, User, Clock, Building2, Shield, Sparkles, FileText, Mail, UserPlus } from "lucide-react";
import { InviteClientDialog } from "@/components/client-users/InviteClientDialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ENIContact, ENTITY_TYPE_LABELS, EntityType } from "./ENIContactTypes";
import { IdentificationSection } from "./sections/IdentificationSection";
import { AddressSection } from "./sections/AddressSection";
import { ProfessionalProfileSection } from "./sections/ProfessionalProfileSection";
import { CommercialProfileSection } from "./sections/CommercialProfileSection";
import { FinancialSection } from "./sections/FinancialSection";
import { CommercialHistorySection } from "./sections/CommercialHistorySection";
import { NotesSection as ContactNotesSection } from "./sections/NotesSection";
import { NotesSection } from "@/components/leads/sections/NotesSection";
import { AIInsightsSection } from "./sections/AIInsightsSection";
import { AIDealInsightPanel } from "@/components/contacts/sections/AIDealInsightPanel";
import { DocumentsSection } from "./sections/DocumentsSection";
import { InvoiceHistorySection } from "./sections/InvoiceHistorySection";
import { AcquiredProductsSection } from "@/components/shared/AcquiredProductsSection";
import { CustomerJourneySection } from "@/components/customer-journey/CustomerJourneySection";
import { AIJourneySuggestionsPanel } from "@/components/customer-journey/AIJourneySuggestionsPanel";
import { EntitySocialMediaAnalysisSection } from "@/components/shared/EntitySocialMediaAnalysisSection";
import { useAnalyzeContact } from "@/hooks/useSmartContacts";
import { useContactPermissions } from "./useContactPermissions";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { cn } from "@/lib/utils";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { EntityHorizontalTabs } from "@/components/entity/EntityHorizontalTabs";
import { EntityDetailsPanel } from "@/components/entity/EntityDetailsPanel";
import { EntityHighlightsGrid } from "@/components/entity/EntityHighlightsGrid";
import { EntitySubTabs } from "@/components/entity/EntitySubTabs";
import { useEntityCounts } from "@/hooks/useEntityCounts";
import { MenuSection } from "@/types/entity";
import { LinkedCompanyCard } from "@/components/contacts/LinkedCompanyCard";
import { ActivityProfileBadge, ProfileCustomFieldsSection } from "@/components/activity-profile";
import { useActivityProfileContext } from "@/contexts/ActivityProfileContext";
import { useEntityActivityProfile } from "@/hooks/useActivityProfiles";
import { ContactMessagesSection } from "@/components/messages/ContactMessagesSection";
import { EntityTasksSection } from "@/components/tasks";
import { EntityAutomationSection } from "@/components/automations/EntityAutomationSection";
import { EntityAvatarUpload } from "@/components/shared/EntityAvatarUpload";
import { EntityOpportunitiesSection } from "@/components/opportunities/EntityOpportunitiesSection";
import { EntityCreditProposalsSection } from "@/modules/credit-intermediation/components/EntityCreditProposalsSection";
import { EntityProposalsSection } from "@/components/proposals/EntityProposalsSection";
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";
import { ComposeEmailDialog, EmailHistorySection } from "@/components/email";
import { EntityTimelineSection } from "@/components/timeline";
import { ContactOrderNotesSection } from "@/components/contacts/sections/ContactOrderNotesSection";
import { ContactStudentJourneySection } from "@/components/contacts/sections/ContactStudentJourneySection";
import { useContactStudentJourneyProfile } from "@/hooks/useContactStudentJourneyProfile";
import { EntitySchedulingSection } from "@/components/scheduling/EntitySchedulingSection";
import { ContactScoresCard } from "./sections/ContactScoresCard";
import { ContactLifecycleSection } from "./sections/ContactLifecycleSection";
import { ContactPreferencesSection } from "./sections/ContactPreferencesSection";
import { ContactAuditSection } from "./sections/ContactAuditSection";

// Role labels are now translated via t()
function getTimeAgo(date: Date, t: (key: string, opts?: any) => string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return t('common:timeNow');
  if (diffInSeconds < 3600) return t('common:timeMinutes', { count: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t('common:timeHours', { count: Math.floor(diffInSeconds / 3600) });
  return t('common:timeDays', { count: Math.floor(diffInSeconds / 86400) });
}

export function ENIContactDetailWithSidebar() {
  const { t } = useTranslation(['common', 'crm']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, isLoading, updateContact, deleteContact } = useContacts();
  const analyzeContact = useAnalyzeContact();
  const { data: counts } = useEntityCounts('contact', id);
  const { setCurrentEntityProfile } = useActivityProfileContext();
  const { data: entityProfile } = useEntityActivityProfile('contact', id);
  
  const [activeSection, setActiveSection] = useState<MenuSection>('overview');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  // Student Journey profile check
  const { data: sjProfile } = useContactStudentJourneyProfile(id);
  
  const contact = contacts.find(c => c.id === id) as unknown as ENIContact | undefined;
  const { role } = useContactPermissions();

  // Set entity profile when it loads
  useEffect(() => {
    if (entityProfile) {
      setCurrentEntityProfile(entityProfile);
    }
    return () => setCurrentEntityProfile(null);
  }, [entityProfile, setCurrentEntityProfile]);

  const commercialHistoryFields = [
    'sales_2023', 'sales_2024', 'sales_2025', 'sales_2026',
    'total_revenue', 'average_ticket', 'last_purchase_date', 'abc_category'
  ];

  const handleFieldChange = useCallback(async (field: keyof ENIContact, value: unknown) => {
    if (!contact) return;
    try {
      const updateData: Record<string, unknown> = { id: contact.id, [field]: value };
      if (commercialHistoryFields.includes(field)) {
        updateData.commercial_history_updated_at = new Date().toISOString();
      }
      await updateContact.mutateAsync(updateData as { id: string });
      toast.success(t('common:fieldUpdated'));
    } catch {
      toast.error(t('common:errorUpdatingField'));
    }
  }, [contact, updateContact]);

  const handleNifDataReceived = useCallback(async (data: NifLookupResult) => {
    if (!contact) return;
    const updateData: Record<string, unknown> = { id: contact.id };
    if (data.company_name && !contact.name) updateData.name = data.company_name;
    if (data.address && !contact.address) updateData.address = data.address;
    if (data.city && !contact.city) updateData.city = data.city;
    if (data.postal_code && !contact.postal_code) updateData.postal_code = data.postal_code;
    if (data.email && !contact.email) updateData.email = data.email;
    if (data.phone && !contact.phone) updateData.phone = data.phone;
    if (data.cae_codes?.[0] && !contact.cae_code) updateData.cae_code = data.cae_codes[0];
    if (data.cae_description && !contact.cae_description) updateData.cae_description = data.cae_description;
    if (Object.keys(updateData).length > 1) {
      try {
        await updateContact.mutateAsync(updateData as { id: string });
        toast.success(t('common:dataAutoFilled'));
      } catch {
        toast.error(t('common:errorAutoFill'));
      }
    }
  }, [contact, updateContact]);

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success(t('common:contactDeleted'));
      navigate("/dashboard/contacts");
    } catch {
      toast.error(t('common:errorDeletingContact'));
    }
  };

  const handleGenerateInsights = () => {
    if (id) {
      analyzeContact.mutate({ contactId: id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('common:contactNotFound')}</h2>
        <Button onClick={() => navigate("/dashboard/contacts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common:back')}
        </Button>
      </div>
    );
  }

  const initials = contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const entityType = (contact.entity_type || 'consumidor_final') as EntityType;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <LinkedCompanyCard 
              companyId={(contact as any).company_id}
              contactId={contact.id}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContactScoresCard contact={contact} editable={role === 'owner' || role === 'admin'} />
              <ContactLifecycleSection contact={contact} onFieldChange={handleFieldChange} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CustomerJourneySection contactId={id} />
              <AIJourneySuggestionsPanel 
                entityType="contact" 
                entityId={id!} 
                entityName={contact.name}
              />
            </div>
            <AIInsightsSection 
              contact={contact} 
              onGenerateInsights={handleGenerateInsights}
              isGenerating={analyzeContact.isPending}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IdentificationSection 
                contact={contact} 
                onFieldChange={handleFieldChange}
                onNifDataReceived={handleNifDataReceived}
              />
              <AddressSection contact={contact} onFieldChange={handleFieldChange} />
            </div>
          </div>
        );
      case 'insights':
        return (
          <div className="space-y-6">
            <AgentQueueStatus entityId={id!} entityType="contact" compact={false} showAnalyzeButton={true} />
            <AIInsightsSection 
              contact={contact} 
              onGenerateInsights={handleGenerateInsights}
              isGenerating={analyzeContact.isPending}
            />
            <AIDealInsightPanel contactId={id} />
            <EntitySocialMediaAnalysisSection
              entityType="contact" entityId={id!} entityName={contact.name}
              linkedinUrl={(contact as any).linkedin_url}
            />
            <EntityMemoryPanel entityId={id!} entityType="contact" entityName={contact.name} />
          </div>
        );
      case 'timeline':
        return (
          <div className="space-y-6">
            <EntityTimelineSection entityType="contact" entityId={id!} entityName={contact.name} />
            <ContactNotesSection contact={contact} onFieldChange={handleFieldChange} />
          </div>
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
                  return (
                    <EmailHistorySection
                      entityType="contact" entityId={id!}
                      entityEmail={contact.email || undefined} maxHeight="500px"
                    />
                  );
                case 'messages':
                  return (
                    <ContactMessagesSection
                      entityType="contact" entityId={id!} entityName={contact.name}
                      entityEmail={contact.email} entityPhone={contact.phone}
                    />
                  );
                case 'scheduling':
                  return (
                    <EntitySchedulingSection
                      entityType="contact" entityId={id!} entityName={contact.name}
                      entityEmail={contact.email} entityPhone={contact.phone}
                    />
                  );
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
              ? <EntityTasksSection entityType="contact" entityId={id!} entityName={contact.name} />
              : <EntityAutomationSection entityType="contact" entityId={id!} entityName={contact.name} />
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
                  return (
                    <EntityOpportunitiesSection
                      entityType="contact" entityId={id!} entityName={contact.name}
                      entityIndustry={(contact as any).business_area} entityNotes={contact.notes}
                    />
                  );
                case 'proposals':
                  return <EntityProposalsSection entityType="contact" entityId={id!} entityName={contact.name} />;
                case 'credit':
                  return <EntityCreditProposalsSection entityType="contact" entityId={id!} entityName={contact.name} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'financial':
        return (
          <EntitySubTabs
            tabs={[
              { id: 'payments', label: 'Pagamentos' },
              { id: 'orders', label: 'Encomendas' },
              { id: 'history', label: 'Histórico' },
            ]}
          >
            {(tab) => {
              switch (tab) {
                case 'payments':
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AcquiredProductsSection contactId={id!} />
                      <InvoiceHistorySection contactId={id!} />
                    </div>
                  );
                case 'orders':
                  return <ContactOrderNotesSection contactId={id!} />;
                case 'history':
                  return <CommercialHistorySection contact={contact} onFieldChange={handleFieldChange} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
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
                      {entityProfile && (
                        <ProfileCustomFieldsSection
                          entityType="contact" profileType={entityProfile.profile_type}
                          values={(contact as any).profile_field_values || {}}
                          onFieldChange={async (fieldName, value) => {
                            const currentValues = (contact as any).profile_field_values || {};
                            await handleFieldChange('profile_field_values' as keyof ENIContact, {
                              ...currentValues, [fieldName]: value,
                            });
                          }}
                        />
                      )}
                      <ProfessionalProfileSection contact={contact} onFieldChange={handleFieldChange} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CommercialProfileSection contact={contact} onFieldChange={handleFieldChange} />
                        <FinancialSection contact={contact} onFieldChange={handleFieldChange} />
                      </div>
                      <ContactPreferencesSection 
                        contact={contact} onFieldChange={handleFieldChange}
                        editable={role === 'owner' || role === 'admin'}
                      />
                    </div>
                  );
                case 'fields':
                  return <DocumentsSection contactId={id!} />;
                case 'audit':
                  return <ContactAuditSection contactId={id!} />;
                default: return null;
              }
            }}
          </EntitySubTabs>
        );
      case 'student-journey':
        return (
          <ContactStudentJourneySection 
            contactId={id!} contactName={contact.name} contactEmail={contact.email}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            {t('common:sectionInDevelopment')}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col -m-6">
      <div className="bg-background px-6 pt-4">
        <PageBreadcrumbs items={[
          { label: "CRM", href: "/dashboard" },
          { label: t('crm:contacts'), href: "/dashboard/contacts" },
          { label: contact.name },
        ]} />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-background via-background to-muted/30 border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/contacts")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <EntityAvatarUpload
              entityType="contact"
              entityId={id!}
              entityName={contact.name}
              currentAvatarUrl={(contact as any).avatar_url}
              onAvatarChange={(url) => handleFieldChange('avatar_url' as keyof ENIContact, url)}
              size="md"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{contact.name}</h1>
                <Badge variant="outline" className={cn(
                  "text-xs font-medium",
                  entityType === 'eni' && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                  entityType === 'empresa' && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                  entityType === 'consumidor_final' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}>
                {ENTITY_TYPE_LABELS[entityType]}
                </Badge>
                {/* Activity Profile Badge */}
                <ActivityProfileBadge
                  entityType="contact"
                  entityId={id!}
                  currentProfile={entityProfile}
                  currentProfileId={(contact as any).activity_profile_id}
                />
                {contact.company && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    {contact.company}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t('common:updatedAgo', { time: getTimeAgo(new Date(contact.updated_at), t) })}
                </p>
                {role && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 text-xs cursor-help">
                        <Shield className="w-3 h-3" />
                        {t(`common:role${role.charAt(0).toUpperCase() + role.slice(1)}`) || role}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('common:yourAccessLevel')}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {contact.email && (
              <Button 
                variant="outline" 
                onClick={() => setShowEmailDialog(true)} 
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                {t('common:sendEmail')}
              </Button>
            )}
            {contact.email && (
              <InviteClientDialog
                trigger={
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {t('common:inviteB2B')}
                  </Button>
                }
                prefillData={{
                  contactId: id!,
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone || undefined,
                  taxId: contact.tax_id || undefined,
                  address: contact.address || undefined,
                  city: contact.city || undefined,
                  postalCode: contact.postal_code || undefined,
                  country: contact.country || undefined,
                }}
              />
            )}
            <Button variant="outline" onClick={() => setShowInvoiceDialog(true)} className="gap-2">
              <FileText className="w-4 h-4" />
              {t('common:newInvoice')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGenerateInsights}
              disabled={analyzeContact.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {analyzeContact.isPending ? t('common:analyzing') : t('common:analyzeWithAI')}
            </Button>
            {(role === 'owner' || role === 'admin') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('common:confirmDeleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('common:confirmDeleteDescription')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      {t('common:delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <EntityHorizontalTabs
        entityType="contact"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        counts={counts}
        hasStudentJourneyProfile={!!sjProfile}
      />

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Content */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-4xl">
              {activeSection === 'overview' && (
                <div className="mb-6">
                  <EntityHighlightsGrid entityType="contact" entity={contact as any} />
                </div>
              )}
              {renderSectionContent()}
            </div>
          </ScrollArea>
        </main>

        {/* Right Details Panel */}
        <EntityDetailsPanel entityType="contact" entity={contact as any} onUpdate={(field, value) => handleFieldChange(field as keyof ENIContact, value)} />
      </div>

      {/* Invoice Dialog */}
      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        defaultContactId={id}
      />

      {/* Compose Email Dialog */}
      {contact.email && (
        <ComposeEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          recipient={{
            email: contact.email,
            name: contact.name,
            entityType: "contact",
            entityId: id!,
          }}
          templateContext={{
            contact: { 
              name: contact.name, 
              email: contact.email, 
              phone: contact.phone || undefined 
            },
          }}
        />
      )}
    </div>
  );
}
