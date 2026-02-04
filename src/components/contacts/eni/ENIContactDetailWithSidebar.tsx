import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { EntitySidebarMenu } from "@/components/entity/EntitySidebarMenu";
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

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  agency: "Agência",
  agent: "Vendas",
  viewer: "Suporte",
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  return `${Math.floor(diffInSeconds / 86400)} dias`;
}

export function ENIContactDetailWithSidebar() {
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
      toast.success("Campo atualizado");
    } catch {
      toast.error("Erro ao atualizar campo");
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
        toast.success("Dados preenchidos automaticamente!");
      } catch {
        toast.error("Erro ao preencher dados");
      }
    }
  }, [contact, updateContact]);

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success("Contacto eliminado");
      navigate("/dashboard/contacts");
    } catch {
      toast.error("Erro ao eliminar contacto");
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
        <h2 className="text-xl font-semibold mb-2">Contacto não encontrado</h2>
        <Button onClick={() => navigate("/dashboard/contacts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
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
            {/* Linked Company Card - prominent position */}
            <LinkedCompanyCard 
              companyId={(contact as any).company_id}
              contactId={contact.id}
            />
            
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
            {/* AI Agent Queue Status */}
            <AgentQueueStatus
              entityId={id!}
              entityType="contact"
              compact={false}
              showAnalyzeButton={true}
            />
            <AIInsightsSection 
              contact={contact} 
              onGenerateInsights={handleGenerateInsights}
              isGenerating={analyzeContact.isPending}
            />
            <EntitySocialMediaAnalysisSection
              entityType="contact"
              entityId={id!}
              entityName={contact.name}
              linkedinUrl={(contact as any).linkedin_url}
            />
            {/* AI Memory Panel */}
            <EntityMemoryPanel
              entityId={id!}
              entityType="contact"
              entityName={contact.name}
            />
          </div>
        );
      case 'notes':
        return (
          <NotesSection 
            entityType="contact" 
            entityId={id!} 
            entityName={contact.name} 
          />
        );
      case 'details':
        return (
          <div className="space-y-6">
            {/* Profile-specific custom fields */}
            {entityProfile && (
              <ProfileCustomFieldsSection
                entityType="contact"
                profileType={entityProfile.profile_type}
                values={(contact as any).profile_field_values || {}}
                onFieldChange={async (fieldName, value) => {
                  const currentValues = (contact as any).profile_field_values || {};
                  await handleFieldChange('profile_field_values' as keyof ENIContact, {
                    ...currentValues,
                    [fieldName]: value,
                  });
                }}
              />
            )}
            <ProfessionalProfileSection contact={contact} onFieldChange={handleFieldChange} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CommercialProfileSection contact={contact} onFieldChange={handleFieldChange} />
              <FinancialSection contact={contact} onFieldChange={handleFieldChange} />
            </div>
          </div>
        );
      case 'history':
        return <CommercialHistorySection contact={contact} onFieldChange={handleFieldChange} />;
      case 'timeline':
        return (
          <EntityTimelineSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
          />
        );
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AcquiredProductsSection contactId={id!} />
              <InvoiceHistorySection contactId={id!} />
            </div>
          </div>
        );
      case 'custom-fields':
        return <DocumentsSection contactId={id!} />;
      case 'messages':
        return (
          <div className="space-y-6">
            {/* Email History */}
            <EmailHistorySection
              entityType="contact"
              entityId={id!}
              entityEmail={contact.email || undefined}
              maxHeight="500px"
            />
            
            {/* Message Composer */}
            <ContactMessagesSection
              entityType="contact"
              entityId={id!}
              entityName={contact.name}
              entityEmail={contact.email}
              entityPhone={contact.phone}
            />
          </div>
        );
      case 'tasks':
        return (
          <EntityTasksSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
          />
        );
      case 'automations':
        return (
          <EntityAutomationSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
          />
        );
      case 'opportunities':
        return (
          <EntityOpportunitiesSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
            entityIndustry={(contact as any).business_area}
            entityNotes={contact.notes}
          />
        );
      case 'credit':
        return (
          <EntityCreditProposalsSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
          />
        );
      case 'orders':
        return (
          <ContactOrderNotesSection contactId={id!} />
        );
      case 'student-journey':
        return (
          <ContactStudentJourneySection 
            contactId={id!} 
            contactName={contact.name}
            contactEmail={contact.email}
          />
        );
      case 'proposals':
        return (
          <EntityProposalsSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
          />
        );
      case 'scheduling':
        return (
          <EntitySchedulingSection
            entityType="contact"
            entityId={id!}
            entityName={contact.name}
            entityEmail={contact.email}
            entityPhone={contact.phone}
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
      <div className="bg-background px-6 pt-4">
        <PageBreadcrumbs items={[
          { label: "CRM", href: "/dashboard" },
          { label: "Contactos", href: "/dashboard/contacts" },
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
                  Atualizado há {getTimeAgo(new Date(contact.updated_at))}
                </p>
                {role && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 text-xs cursor-help">
                        <Shield className="w-3 h-3" />
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>O seu nível de acesso</p>
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
                Enviar Email
              </Button>
            )}
            {contact.email && (
              <InviteClientDialog
                trigger={
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Convidar B2B
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
              Nova Fatura
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGenerateInsights}
              disabled={analyzeContact.isPending}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {analyzeContact.isPending ? "A analisar..." : "Analisar com IA"}
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
                    <AlertDialogTitle>Eliminar Contacto</AlertDialogTitle>
                    <AlertDialogDescription>Tem a certeza? Esta ação não pode ser revertida.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Menu */}
        <EntitySidebarMenu
          entityType="contact"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          counts={counts}
          hasStudentJourneyProfile={!!sjProfile}
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
