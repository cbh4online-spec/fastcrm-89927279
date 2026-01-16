import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Mail, 
  Phone, 
  Trash2, 
  ChevronDown,
  Clock,
  Globe,
  Users,
  Factory,
  MapPin,
  Tag,
  FileText,
  MoreHorizontal,
  Sparkles,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { useCustomFields, useCustomFieldValues, useSetCustomFieldValue } from "@/hooks/useCustomFields";
import { getCustomFieldSuggestion } from "@/components/ai/CustomFieldWithSuggestion";
import { getSuggestionForField } from "@/components/ai/InlineFieldSuggestion";
import { 
  useFieldSuggestions, 
  useGenerateFieldSuggestions,
  useAcceptSuggestion, 
  useRejectSuggestion 
} from "@/hooks/useFieldSuggestions";
import { cn } from "@/lib/utils";
import { InsightsSidebar } from "@/components/insights";
import { useFormFieldOrder, FieldConfig } from "@/hooks/useFormFieldOrder";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

// Field icons mapping
const FIELD_ICONS: Record<string, React.ReactNode> = {
  name: <Building2 className="w-4 h-4" />,
  tax_id: <Hash className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  industry: <Factory className="w-4 h-4" />,
  size: <Users className="w-4 h-4" />,
  address: <MapPin className="w-4 h-4" />,
  tags: <Tag className="w-4 h-4" />,
  notes: <FileText className="w-4 h-4" />,
};

// Map field types from layout to InlineEditableField types
const getFieldType = (fieldConfig: FieldConfig): "text" | "email" | "phone" | "number" | "date" | "boolean" | "select" | "textarea" | "tags" => {
  const type = fieldConfig.fieldType;
  switch (type) {
    case "email": return "email";
    case "phone": return "phone";
    case "number": return "number";
    case "date": return "date";
    case "boolean": return "boolean";
    case "select": return "select";
    case "textarea": return "textarea";
    default: 
      if (fieldConfig.id === "tags") return "tags";
      return "text";
  }
};

// Simple row for static display (metadata)
interface DetailRowProps {
  label: string;
  value?: string | React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0">
      <div className="w-40 flex-shrink-0 text-sm text-muted-foreground">
        {label}
      </div>
      <div className="flex-1 text-sm">
        <span className={cn(!value && "text-muted-foreground")}>{value || "—"}</span>
      </div>
    </div>
  );
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, isLoading, updateCompany, deleteCompany } = useCompanies();
  const { data: customFieldValues = [] } = useCustomFieldValues(id);
  const { data: customFields = [] } = useCustomFields("company");
  const setCustomFieldValue = useSetCustomFieldValue();

  // Get ordered fields from layout configuration
  const { getVisibleFields } = useFormFieldOrder("company");

  const company = companies.find(c => c.id === id);

  // AI field suggestions
  const { data: suggestions = [] } = useFieldSuggestions("company", id);
  const generateSuggestions = useGenerateFieldSuggestions();
  const acceptSuggestion = useAcceptSuggestion();
  const rejectSuggestion = useRejectSuggestion();
  const [acceptingField, setAcceptingField] = useState<string | null>(null);

  // Custom field values map for easy lookup
  const customFieldValuesMap = new Map(
    customFieldValues.map(cfv => [cfv.custom_field_id, cfv.value])
  );

  const [showMoreDetails, setShowMoreDetails] = useState(true);

  // Handler for inline native field change
  const handleNativeFieldChange = useCallback(async (fieldId: string, value: unknown) => {
    if (!company) return;
    await updateCompany.mutateAsync({
      id: company.id,
      [fieldId]: value || undefined,
    });
    toast.success("Campo atualizado");
  }, [company, updateCompany]);

  // Handler for inline custom field change
  const handleCustomFieldChange = useCallback(async (customFieldId: string, value: unknown) => {
    if (!company) return;
    const field = customFields.find(f => f.id === customFieldId);
    await setCustomFieldValue.mutateAsync({
      customFieldId,
      entityId: company.id,
      value,
      fieldName: field?.name,
      isUnique: field?.is_unique,
    });
    toast.success("Campo atualizado");
  }, [company, customFields, setCustomFieldValue]);

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

  // Helper to accept inline suggestion for standard fields
  const handleAcceptInlineSuggestion = useCallback(async (fieldName: string, value: unknown) => {
    if (!company) return;
    
    const suggestion = suggestions.find(s => s.field_name === fieldName && s.field_type === "standard");
    if (!suggestion) return;
    
    setAcceptingField(fieldName);
    try {
      await acceptSuggestion.mutateAsync({
        suggestion,
        onApply: async () => {
          await updateCompany.mutateAsync({
            id: company.id,
            [fieldName]: value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [company, suggestions, acceptSuggestion, updateCompany]);

  // Helper to reject inline suggestion for standard fields
  const handleRejectInlineSuggestion = useCallback((fieldName: string) => {
    const suggestion = suggestions.find(s => s.field_name === fieldName && s.field_type === "standard");
    if (suggestion) {
      rejectSuggestion.mutate(suggestion);
    }
  }, [suggestions, rejectSuggestion]);

  // Handler for accepting custom field suggestions
  const handleAcceptCustomFieldSuggestion = useCallback(async (customFieldId: string, value: unknown) => {
    if (!company) return;
    
    const suggestion = suggestions.find(
      s => s.field_type === "custom" && s.custom_field_id === customFieldId
    );
    if (!suggestion) return;
    
    setAcceptingField(customFieldId);
    try {
      await acceptSuggestion.mutateAsync({
        suggestion,
        onApply: async () => {
          await setCustomFieldValue.mutateAsync({
            customFieldId,
            entityId: company.id,
            value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [company, suggestions, acceptSuggestion, setCustomFieldValue]);

  // Handler for rejecting custom field suggestions
  const handleRejectCustomFieldSuggestion = useCallback((customFieldId: string) => {
    const suggestion = suggestions.find(
      s => s.field_type === "custom" && s.custom_field_id === customFieldId
    );
    if (suggestion) {
      rejectSuggestion.mutate(suggestion);
    }
  }, [suggestions, rejectSuggestion]);

  // Generate suggestions handler
  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "company", entityId: id });
  };

  // Get value for a field
  const getFieldValue = (fieldConfig: FieldConfig): unknown => {
    if (fieldConfig.type === "custom") {
      const customFieldId = fieldConfig.id.replace("custom_", "");
      return customFieldValuesMap.get(customFieldId);
    }
    // Native field - access from company object
    if (!company) return undefined;
    const companyData = company as unknown as Record<string, unknown>;
    return companyData[fieldConfig.id];
  };

  // Render a field based on its configuration
  const renderField = (fieldConfig: FieldConfig) => {
    // Skip name field as it's shown in the header
    if (fieldConfig.id === "name") return null;
    // Skip notes and address - they have their own sections
    if (fieldConfig.id === "notes" || fieldConfig.id === "address") return null;

    const value = getFieldValue(fieldConfig);
    const fieldType = getFieldType(fieldConfig);
    const icon = FIELD_ICONS[fieldConfig.id];

    if (fieldConfig.type === "custom") {
      const customFieldId = fieldConfig.id.replace("custom_", "");
      const customField = customFields.find(f => f.id === customFieldId);
      if (!customField) return null;

      return (
        <InlineEditableField
          key={fieldConfig.id}
          label={fieldConfig.name}
          fieldId={fieldConfig.id}
          fieldType={fieldType}
          value={value}
          onChange={(val) => handleCustomFieldChange(customFieldId, val)}
          required={fieldConfig.required}
          options={customField.options || []}
          suggestion={getCustomFieldSuggestion(suggestions, customFieldId)}
          onAcceptSuggestion={(val) => handleAcceptCustomFieldSuggestion(customFieldId, val)}
          onRejectSuggestion={() => handleRejectCustomFieldSuggestion(customFieldId)}
          isAcceptingSuggestion={acceptingField === customFieldId}
        />
      );
    }

    // Native field
    const isLinkField = ["website", "email", "phone"].includes(fieldConfig.id);
    const linkType = fieldConfig.id === "website" ? "url" : fieldConfig.id === "email" ? "email" : "phone";

    return (
      <InlineEditableField
        key={fieldConfig.id}
        label={fieldConfig.name}
        fieldId={fieldConfig.id}
        fieldType={fieldType}
        value={value}
        onChange={(val) => handleNativeFieldChange(fieldConfig.id, val)}
        icon={icon}
        required={fieldConfig.required}
        options={fieldConfig.id === "size" ? COMPANY_SIZES : undefined}
        isLink={isLinkField && !!value}
        linkType={isLinkField ? linkType : undefined}
        suggestion={getSuggestionForField(suggestions, fieldConfig.id)}
        onAcceptSuggestion={(val) => handleAcceptInlineSuggestion(fieldConfig.id, val)}
        onRejectSuggestion={() => handleRejectInlineSuggestion(fieldConfig.id)}
        isAcceptingSuggestion={acceptingField === fieldConfig.id}
      />
    );
  };

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

  const orderedFields = getVisibleFields();

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
      
      {/* Header */}
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
          
          <Avatar className="h-16 w-16 text-xl">
            <AvatarFallback className="bg-gradient-to-br from-blue-500/80 to-blue-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
              {company.industry && (
                <Badge variant="outline" className="font-normal">
                  {company.industry}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última atualização: {new Date(company.updated_at).toLocaleDateString('pt-PT')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateSuggestions}
            disabled={generateSuggestions.isPending}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generateSuggestions.isPending ? "A analisar..." : "Sugestões IA"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
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

      {/* AI Insights Module */}
      <InsightsSidebar
        entityType="company"
        entityId={id || ''}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description Card - Fields in configured order */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Descrição Geral</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/50">
                {orderedFields.map(renderField)}
              </div>
            </CardContent>
          </Card>

          {/* Address Section */}
          {company.address && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Morada
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InlineEditableField
                  label=""
                  fieldId="address"
                  fieldType="textarea"
                  value={company.address}
                  onChange={(val) => handleNativeFieldChange("address", val)}
                  placeholder="Morada completa..."
                />
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          {company.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InlineEditableField
                  label=""
                  fieldId="notes"
                  fieldType="textarea"
                  value={company.notes}
                  onChange={(val) => handleNativeFieldChange("notes", val)}
                  placeholder="Adicionar notas..."
                />
              </CardContent>
            </Card>
          )}

          {/* More Details Section - Collapsible */}
          <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                      {showMoreDetails ? "Ocultar detalhes" : "Mostrar mais detalhes"}
                    </CardTitle>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      showMoreDetails && "rotate-180"
                    )} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="divide-y divide-border/50">
                    <DetailRow
                      label="Data de Criação"
                      value={new Date(company.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    />
                    <DetailRow
                      label="Última Atualização"
                      value={new Date(company.updated_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    />
                    <DetailRow
                      label="ID"
                      value={
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {company.id}
                        </code>
                      }
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.website && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Visitar Website
                  </a>
                </Button>
              )}
              {company.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${company.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar E-mail
                  </a>
                </Button>
              )}
              {company.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`tel:${company.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
