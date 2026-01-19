import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies, Company } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { NifLookupResult } from "@/hooks/useNifLookup";
import { generateIndustrySummary } from "@/utils/industrySummary";
import { 
  useGenerateFieldSuggestions,
} from "@/hooks/useFieldSuggestions";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { InsightsSidebar } from "@/components/insights";
import { CompanyContacts } from "./CompanyContacts";
import { IdentificationSection } from "./sections/IdentificationSection";
import { FinancialSection } from "./sections/FinancialSection";
import { AddressSection } from "./sections/AddressSection";
import { NotesSection } from "./sections/NotesSection";
import { TagsSection } from "./sections/TagsSection";
import { SocialMediaSection } from "./sections/SocialMediaSection";
import { CompleteSocialAnalysisSection } from "./sections/CompleteSocialAnalysisSection";
import { CompanyContactsHistory } from "./sections/CompanyContactsHistory";
import { CompanyContextSection } from "./sections/CompanyContextSection";
import { AcquiredProductsSection } from "@/components/shared/AcquiredProductsSection";
import { CustomerJourneySection } from "@/components/customer-journey/CustomerJourneySection";
import { AIJourneySuggestionsPanel } from "@/components/customer-journey/AIJourneySuggestionsPanel";
import { EnrichCompanyDialog } from "./dialogs/EnrichCompanyDialog";
import { CompanyInsightsPanel } from "./CompanyInsightsPanel";
import { LinkContactDialog } from "./LinkContactDialog";
import { SuggestedContact } from "@/hooks/useCompleteSocialAnalysis";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  
  return date.toLocaleDateString('pt-PT');
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, isLoading, updateCompany, deleteCompany } = useCompanies();
  const { isModuleInstalled } = useWorkspaceModules();
  
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [linkContactDialogOpen, setLinkContactDialogOpen] = useState(false);
  const [prefillContactData, setPrefillContactData] = useState<SuggestedContact | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const company = companies.find(c => c.id === id);
  const showEnrichButton = isModuleInstalled('google-local-services');

  // AI field suggestions
  const generateSuggestions = useGenerateFieldSuggestions();

  // Handler for inline field change
  const handleFieldChange = useCallback(async (field: keyof Company, value: unknown) => {
    if (!company) return;
    await updateCompany.mutateAsync({
      id: company.id,
      [field]: value || undefined,
    });
    toast.success("Campo atualizado");
  }, [company, updateCompany]);

  // Handler for NIF lookup data received
  const handleNifDataReceived = useCallback(async (data: NifLookupResult) => {
    if (!company) return;
    
    const updateData: Record<string, unknown> = {
      id: company.id,
    };

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
    } catch (error) {
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

  // Handler to create contact from LinkedIn employee
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
        <p className="text-muted-foreground mb-4">
          A empresa que procura não existe ou foi eliminada.
        </p>
        <Button onClick={() => navigate("/dashboard/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar às Empresas
        </Button>
      </div>
    );
  }

  const initials = company.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: "CRM", href: "/dashboard/crm" },
          { label: "Empresas", href: "/dashboard/companies" },
          { label: company.name },
        ]}
      />
      
      {/* Header - Same style as ENIContactDetail */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/companies")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-16 w-16 text-xl ring-2 ring-blue-500/20">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium">
                Empresa
              </Badge>
              {company.industry && (
                <Badge variant="secondary" className="font-normal">
                  {company.industry}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Atualizado há {getTimeAgo(new Date(company.updated_at))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {company.website && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visitar Website</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {company.email && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`mailto:${company.email}`}>
                      <Mail className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar E-mail</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {company.phone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`tel:${company.phone}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ligar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {showEnrichButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => setEnrichDialogOpen(true)}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    Enriquecer Dados
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enriquecer dados a partir do website (Google Local Services)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setShowInvoiceDialog(true)}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Nova Fatura
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleGenerateSuggestions}
            disabled={generateSuggestions.isPending}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generateSuggestions.isPending ? "A analisar..." : "Analisar com IA"}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Empresa</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem a certeza que deseja eliminar esta empresa? Esta ação não pode ser revertida.
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

      {/* AI Insights */}
      <InsightsSidebar
        entityType="company"
        entityId={id || ''}
      />

      {/* Main Content - 2 Column Layout like Contact */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Sections */}
        <div className="lg:col-span-2 space-y-4">
          <IdentificationSection 
            company={company} 
            onFieldChange={handleFieldChange}
            onNifDataReceived={handleNifDataReceived}
          />
          
          <FinancialSection 
            company={company} 
            onFieldChange={handleFieldChange}
          />
          
          {/* Company Context from Website Enrichment */}
          <CompanyContextSection companyContext={company.company_context} />
          
          <CompanyContactsHistory companyId={id || ''} />
          
          <AddressSection 
            company={company} 
            onFieldChange={handleFieldChange}
          />
          
          <SocialMediaSection 
            company={company} 
            onFieldChange={handleFieldChange}
          />
          
          <NotesSection 
            company={company} 
            onFieldChange={handleFieldChange}
          />
        </div>

        {/* Right Column - Insights, Tags, Products & Contacts */}
        <div className="space-y-4">
          {/* AI Sales Insights with Product Recommendations */}
          <CompanyInsightsPanel company={company} />
          
          {/* Complete Social Media Analysis */}
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
          
          <TagsSection 
            company={company} 
            onFieldChange={handleFieldChange}
          />
          
          <AcquiredProductsSection companyId={id} />
          
          <CompanyContacts 
            companyId={id || ''} 
            companyName={company.name} 
            onAddContact={() => setLinkContactDialogOpen(true)}
          />
        </div>
      </div>

      {/* Enrich Company Dialog */}
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

      {/* Link Contact Dialog */}
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

      {/* Invoice Dialog */}
      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        defaultCompanyId={id}
      />
    </div>
  );
}
