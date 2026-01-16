import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies, Company, UpdateCompanyData } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronDown,
  ExternalLink,
  Clock,
  Globe,
  Users,
  Factory,
  MapPin,
  Tag,
  FileText,
  MoreHorizontal,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { InlineCustomFieldRow } from "@/components/custom-fields/InlineCustomFieldRow";
import { useCustomFields, useCustomFieldValues, useSetCustomFieldValue } from "@/hooks/useCustomFields";
import { getCustomFieldSuggestion } from "@/components/ai/CustomFieldWithSuggestion";
import { DetailRowWithSuggestion, getSuggestionForField } from "@/components/ai/InlineFieldSuggestion";
import { 
  useFieldSuggestions, 
  useGenerateFieldSuggestions,
  useAcceptSuggestion, 
  useRejectSuggestion 
} from "@/hooks/useFieldSuggestions";
import { cn } from "@/lib/utils";
import { CompanyInsightsPanel } from "./CompanyInsightsPanel";
import { InsightsSidebar } from "@/components/insights";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

// Reusable row component for label-value display
interface DetailRowProps {
  label: string;
  value?: string | React.ReactNode;
  isEditing?: boolean;
  editComponent?: React.ReactNode;
  icon?: React.ReactNode;
  isLink?: boolean;
  linkType?: "email" | "phone" | "url";
}

function DetailRow({ label, value, isEditing, editComponent, icon, isLink, linkType = "email" }: DetailRowProps) {
  const getHref = () => {
    if (!value || typeof value !== 'string') return '#';
    if (linkType === "email") return `mailto:${value}`;
    if (linkType === "phone") return `tel:${value}`;
    return value.startsWith('http') ? value : `https://${value}`;
  };

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0">
      <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="flex-1 text-sm">
        {isEditing && editComponent ? (
          editComponent
        ) : isLink && value ? (
          <a 
            href={getHref()}
            target={linkType === "url" ? "_blank" : undefined}
            rel={linkType === "url" ? "noopener noreferrer" : undefined}
            className="text-primary hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className={cn(!value && "text-muted-foreground")}>{value || "—"}</span>
        )}
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

  const [isEditing, setIsEditing] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [editedCompany, setEditedCompany] = useState<{
    name: string;
    website: string;
    industry: string;
    size: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    tags: string[];
  } | null>(null);

  const handleEdit = () => {
    if (company) {
      setEditedCompany({
        name: company.name,
        website: company.website || "",
        industry: company.industry || "",
        size: company.size || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        notes: company.notes || "",
        tags: company.tags || [],
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!company || !editedCompany) return;

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: editedCompany.name,
        website: editedCompany.website || undefined,
        industry: editedCompany.industry || undefined,
        size: editedCompany.size || undefined,
        email: editedCompany.email || undefined,
        phone: editedCompany.phone || undefined,
        address: editedCompany.address || undefined,
        notes: editedCompany.notes || undefined,
        tags: editedCompany.tags,
      });
      toast.success("Empresa atualizada com sucesso");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar empresa");
    }
  };

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

  // Handler for inline custom field value change
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
  }, [company, customFields, setCustomFieldValue]);

  // Generate suggestions handler
  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "company", entityId: id });
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
              {isEditing ? (
                <Input
                  value={editedCompany?.name}
                  onChange={(e) =>
                    setEditedCompany((prev) => prev && { ...prev, name: e.target.value })
                  }
                  className="text-2xl font-semibold h-auto py-1 px-2"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
              )}
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
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateCompany.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateCompany.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleGenerateSuggestions}
                disabled={generateSuggestions.isPending}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {generateSuggestions.isPending ? "A analisar..." : "Sugestões IA"}
              </Button>
              <Button onClick={handleEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
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
            </>
          )}
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
          {/* Description Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Descrição Geral</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/50">
                <DetailRowWithSuggestion
                  label="Website"
                  fieldName="website"
                  value={company.website}
                  icon={<Globe className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.website}
                  suggestion={getSuggestionForField(suggestions, "website")}
                  onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("website", value)}
                  onRejectSuggestion={() => handleRejectInlineSuggestion("website")}
                  isAcceptingSuggestion={acceptingField === "website"}
                  editComponent={
                    <Input
                      value={editedCompany?.website}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { ...prev, website: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  }
                />
                <DetailRowWithSuggestion
                  label="E-mail"
                  fieldName="email"
                  value={company.email}
                  icon={<Mail className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.email}
                  suggestion={getSuggestionForField(suggestions, "email")}
                  onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("email", value)}
                  onRejectSuggestion={() => handleRejectInlineSuggestion("email")}
                  isAcceptingSuggestion={acceptingField === "email"}
                  editComponent={
                    <Input
                      type="email"
                      value={editedCompany?.email}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { ...prev, email: e.target.value })
                      }
                    />
                  }
                />
                <DetailRowWithSuggestion
                  label="Telefone"
                  fieldName="phone"
                  value={company.phone}
                  icon={<Phone className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.phone}
                  suggestion={getSuggestionForField(suggestions, "phone")}
                  onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("phone", value)}
                  onRejectSuggestion={() => handleRejectInlineSuggestion("phone")}
                  isAcceptingSuggestion={acceptingField === "phone"}
                  editComponent={
                    <Input
                      value={editedCompany?.phone}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { ...prev, phone: e.target.value })
                      }
                    />
                  }
                />
                <DetailRowWithSuggestion
                  label="Indústria"
                  fieldName="industry"
                  value={company.industry}
                  icon={<Factory className="w-4 h-4" />}
                  isEditing={isEditing}
                  suggestion={getSuggestionForField(suggestions, "industry")}
                  onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("industry", value)}
                  onRejectSuggestion={() => handleRejectInlineSuggestion("industry")}
                  isAcceptingSuggestion={acceptingField === "industry"}
                  editComponent={
                    <Input
                      value={editedCompany?.industry}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { ...prev, industry: e.target.value })
                      }
                      placeholder="Setor de atividade"
                    />
                  }
                />
                <DetailRow
                  label="Tamanho"
                  value={company.size}
                  icon={<Users className="w-4 h-4" />}
                  isEditing={isEditing}
                  editComponent={
                    <Select
                      value={editedCompany?.size}
                      onValueChange={(value) =>
                        setEditedCompany((prev) => prev && { ...prev, size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tamanho" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} funcionários
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
                <DetailRow
                  label="Tags"
                  value={
                    company.tags && company.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {company.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null
                  }
                  icon={<Tag className="w-4 h-4" />}
                  isEditing={isEditing}
                  editComponent={
                    <Input
                      value={editedCompany?.tags.join(", ")}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { 
                          ...prev, 
                          tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                        })
                      }
                      placeholder="tag1, tag2, tag3"
                    />
                  }
                />
                
                {/* Custom Fields - Inline editable */}
                {customFields.map((field) => (
                  <InlineCustomFieldRow
                    key={field.id}
                    field={field}
                    value={customFieldValuesMap.get(field.id)}
                    onChange={(value) => handleCustomFieldChange(field.id, value)}
                    suggestion={getCustomFieldSuggestion(suggestions, field.id)}
                    onAcceptSuggestion={(value) => handleAcceptCustomFieldSuggestion(field.id, value)}
                    onRejectSuggestion={() => handleRejectCustomFieldSuggestion(field.id)}
                    isAcceptingSuggestion={acceptingField === field.id}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Address Section - Collapsible */}
          {(company.address || isEditing) && (
            <Collapsible open={showAddress} onOpenChange={setShowAddress}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Morada
                      </CardTitle>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        showAddress && "rotate-180"
                      )} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {isEditing ? (
                      <Textarea
                        value={editedCompany?.address}
                        onChange={(e) =>
                          setEditedCompany((prev) => prev && { ...prev, address: e.target.value })
                        }
                        placeholder="Morada completa..."
                        className="min-h-[80px]"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {company.address || <span className="text-muted-foreground">Sem morada</span>}
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Notes Section - Collapsible */}
          {(company.notes || isEditing) && (
            <Collapsible open={showNotes} onOpenChange={setShowNotes}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Notas
                      </CardTitle>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        showNotes && "rotate-180"
                      )} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {isEditing ? (
                      <Textarea
                        value={editedCompany?.notes}
                        onChange={(e) =>
                          setEditedCompany((prev) => prev && { ...prev, notes: e.target.value })
                        }
                        placeholder="Adicionar notas..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {company.notes || <span className="text-muted-foreground">Sem notas</span>}
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
