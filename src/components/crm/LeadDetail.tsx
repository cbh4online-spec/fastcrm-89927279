import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, LeadStatus } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldSuggestionsPanel } from "@/components/ai/FieldSuggestionsPanel";
import { DetailRowWithSuggestion, getSuggestionForField } from "@/components/ai/InlineFieldSuggestion";
import { ConfigurableEntitySidebar } from "@/components/crm/ConfigurableEntitySidebar";
import { CustomizableKPIDashboard } from "@/components/crm/CustomizableKPIDashboard";
import { UnifiedLayoutCustomizer } from "@/components/crm/UnifiedLayoutCustomizer";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useLayoutConfig, DEFAULT_SIDEBAR_MODULES } from "@/hooks/useLayoutConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  useFieldSuggestions, 
  useGenerateFieldSuggestions,
  useAcceptSuggestion, 
  useRejectSuggestion 
} from "@/hooks/useFieldSuggestions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronDown,
  ExternalLink,
  Clock,
  Tag,
  Briefcase,
  MessageSquare,
  FileText,
  CheckSquare,
  DollarSign,
  Paperclip,
  TrendingUp,
  Calendar,
  Sparkles,
  Send,
  Plus,
  MoreHorizontal,
  Instagram,
  Globe,
  UserCircle
} from "lucide-react";
import { toast } from "sonner";
import { CustomFieldsForm, CustomFieldsDisplay } from "@/components/custom-fields/CustomFieldsForm";
import { useCustomFields, useCustomFieldValues, useSetCustomFieldValue } from "@/hooks/useCustomFields";
import { CustomFieldWithSuggestion, getCustomFieldSuggestion } from "@/components/ai/CustomFieldWithSuggestion";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { ContextualTemplatePanel } from "@/components/templates/ContextualTemplatePanel";
import { UnifiedActivityLog } from "@/components/crm/UnifiedActivityLog";
import { useAuth } from "@/contexts/AuthContext";
import { VariableContext } from "@/lib/templateVariables";
import { cn } from "@/lib/utils";

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "Novo",
  in_progress: "Em Progresso",
  completed: "Concluído",
};

// Source icon mapping
const sourceIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  website: <Globe className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
  referral: <UserCircle className="w-3 h-3" />,
};

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

// Reusable row component for label-value display
interface DetailRowProps {
  label: string;
  value?: string | React.ReactNode;
  isEditing?: boolean;
  editComponent?: React.ReactNode;
  icon?: React.ReactNode;
  isLink?: boolean;
}

function DetailRow({ label, value, isEditing, editComponent, icon, isLink }: DetailRowProps) {
  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0">
      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="flex-1 text-sm">
        {isEditing && editComponent ? (
          editComponent
        ) : isLink && value ? (
          <a 
            href={typeof value === 'string' && value.includes('@') ? `mailto:${value}` : `tel:${value}`}
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

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: lead, isLoading } = useLead(id);
  const { data: customFieldValues = [] } = useCustomFieldValues(id);
  const { data: customFields = [] } = useCustomFields("lead");
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const setCustomFieldValue = useSetCustomFieldValue();
  
  // AI field suggestions
  const { data: suggestions = [] } = useFieldSuggestions("lead", id);
  const generateSuggestions = useGenerateFieldSuggestions();
  const acceptSuggestion = useAcceptSuggestion();
  const rejectSuggestion = useRejectSuggestion();
  const [acceptingField, setAcceptingField] = useState<string | null>(null);

  // Custom field values map for easy lookup
  const customFieldValuesMap = new Map(
    customFieldValues.map(cfv => [cfv.custom_field_id, cfv.value])
  );

  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [layoutCustomizerOpen, setLayoutCustomizerOpen] = useState(false);
  
  // Layout configuration
  const { data: layoutData } = useLayoutConfig("lead");
  const { isAdmin } = useUserRole();
  const sidebarModules = layoutData?.layout.sidebar || DEFAULT_SIDEBAR_MODULES;
  const [editedLead, setEditedLead] = useState<{
    name: string;
    email: string;
    phone: string;
    source: string;
    status: LeadStatus;
  } | null>(null);

  // Build context for templates
  const templateContext: VariableContext = {
    lead: lead ? {
      id: lead.id,
      name: lead.name,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      status: lead.status,
      source: lead.source || undefined,
      created_at: lead.created_at,
    } : null,
    user: user ? {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilizador',
      email: user.email,
    } : null,
  };

  const handleTemplateApply = (renderedContent: string, renderedSubject?: string) => {
    // Copy to clipboard or open composer
    navigator.clipboard.writeText(renderedContent);
    toast.success('Mensagem copiada para a área de transferência');
  };

  const handleEdit = () => {
    if (lead) {
      setEditedLead({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        source: lead.source || "",
        status: lead.status,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!lead || !editedLead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: editedLead.name,
        email: editedLead.email || undefined,
        phone: editedLead.phone || undefined,
        source: editedLead.source || undefined,
        status: editedLead.status,
      });
      toast.success("Lead atualizado com sucesso");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar lead");
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead eliminado com sucesso");
      navigate("/dashboard/leads");
    } catch (error) {
      toast.error("Erro ao eliminar lead");
    }
  };

  // Handler for applying AI field suggestions (for panel)
  const handleApplySuggestion = useCallback(async (
    fieldName: string,
    value: unknown,
    fieldType: "standard" | "custom",
    customFieldId?: string
  ) => {
    if (!lead) return;

    if (fieldType === "standard") {
      await updateLead.mutateAsync({
        id: lead.id,
        [fieldName]: value,
      });
    } else if (fieldType === "custom" && customFieldId) {
      console.log("Apply custom field:", customFieldId, value);
    }
  }, [lead, updateLead]);

  // Helper to accept inline suggestion
  const handleAcceptInlineSuggestion = useCallback(async (fieldName: string, value: unknown) => {
    if (!lead) return;
    
    const suggestion = suggestions.find(s => s.field_name === fieldName);
    if (!suggestion) return;
    
    setAcceptingField(fieldName);
    try {
      await acceptSuggestion.mutateAsync({
        suggestion,
        onApply: async () => {
          await updateLead.mutateAsync({
            id: lead.id,
            [fieldName]: value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [lead, suggestions, acceptSuggestion, updateLead]);

  // Helper to reject inline suggestion
  const handleRejectInlineSuggestion = useCallback((fieldName: string) => {
    const suggestion = suggestions.find(s => s.field_name === fieldName);
    if (suggestion) {
      rejectSuggestion.mutate(suggestion);
    }
  }, [suggestions, rejectSuggestion]);

  // Handler for accepting custom field suggestions
  const handleAcceptCustomFieldSuggestion = useCallback(async (customFieldId: string, value: unknown) => {
    if (!lead) return;
    
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
            entityId: lead.id,
            value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [lead, suggestions, acceptSuggestion, setCustomFieldValue]);

  // Handler for rejecting custom field suggestions
  const handleRejectCustomFieldSuggestion = useCallback((customFieldId: string) => {
    const suggestion = suggestions.find(
      s => s.field_type === "custom" && s.custom_field_id === customFieldId
    );
    if (suggestion) {
      rejectSuggestion.mutate(suggestion);
    }
  }, [suggestions, rejectSuggestion]);

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
        <p className="text-muted-foreground mb-4">
          O lead que procura não existe ou foi eliminado.
        </p>
        <Button onClick={() => navigate("/dashboard/leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Leads
        </Button>
      </div>
    );
  }

  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sourceTag = lead.source?.toLowerCase() || "outro";
  const SourceIcon = sourceIcons[sourceTag] || <Tag className="w-3 h-3" />;

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
      <div className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/leads")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Input
                    value={editedLead?.name}
                    onChange={(e) =>
                      setEditedLead((prev) => prev && { ...prev, name: e.target.value })
                    }
                    className="text-xl font-semibold h-auto py-1 px-2 w-64"
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-foreground">{lead.name}</h1>
                )}
                
                {/* Source Tag */}
                {lead.source && (
                  <Badge variant="secondary" className="gap-1 text-xs uppercase font-medium">
                    {SourceIcon}
                    {lead.source}
                  </Badge>
                )}
                
                {/* Status Badge */}
                <Badge variant="outline" className={cn("font-medium", statusColors[lead.status])}>
                  {statusLabels[lead.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Atualizado há {getTimeAgo(new Date(lead.updated_at))}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={updateLead.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateLead.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => id && generateSuggestions.mutate({ entityType: "lead", entityId: id })}
                  disabled={generateSuggestions.isPending}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generateSuggestions.isPending ? "A analisar..." : "Sugestões IA"}
                </Button>
                <TemplateSelector
                  entityType="lead"
                  entityId={id || ''}
                  entityData={templateContext}
                  status={lead?.status}
                  goal={lead?.status === 'new' ? 'qualification' : 'follow_up'}
                  onApply={handleTemplateApply}
                  trigger={
                    <Button variant="default" className="gap-2">
                      <FileText className="w-4 h-4" />
                      Templates
                    </Button>
                  }
                />
                <Button variant="outline" onClick={handleEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Configurable Context Hub */}
        <ConfigurableEntitySidebar
          entityType="lead"
          entityId={id}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          modules={sidebarModules}
        />

        {/* Center Content */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4 max-w-4xl">
              {activeSection === "overview" && (
                <>
                  {/* Customizable KPI Dashboard */}
                  <CustomizableKPIDashboard
                    entityType="lead"
                    entityId={id}
                    entityData={lead ? {
                      name: lead.name,
                      status: lead.status,
                      source: lead.source || undefined,
                      tags: lead.tags || undefined,
                    } : null}
                    onCustomizeClick={() => setLayoutCustomizerOpen(true)}
                  />

                  {/* General Information Card */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">Informação Geral</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="divide-y divide-border/50">
                        <DetailRowWithSuggestion
                          label="Nome"
                          fieldName="name"
                          value={lead.name}
                          icon={<User className="w-4 h-4" />}
                          isEditing={isEditing}
                          suggestion={getSuggestionForField(suggestions, "name")}
                          onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("name", value)}
                          onRejectSuggestion={() => handleRejectInlineSuggestion("name")}
                          isAcceptingSuggestion={acceptingField === "name"}
                          editComponent={
                            <Input
                              value={editedLead?.name}
                              onChange={(e) =>
                                setEditedLead((prev) => prev && { ...prev, name: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRowWithSuggestion
                          label="E-mail"
                          fieldName="email"
                          value={lead.email}
                          icon={<Mail className="w-4 h-4" />}
                          isEditing={isEditing}
                          isLink={!!lead.email}
                          suggestion={getSuggestionForField(suggestions, "email")}
                          onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("email", value)}
                          onRejectSuggestion={() => handleRejectInlineSuggestion("email")}
                          isAcceptingSuggestion={acceptingField === "email"}
                          editComponent={
                            <Input
                              type="email"
                              value={editedLead?.email}
                              onChange={(e) =>
                                setEditedLead((prev) => prev && { ...prev, email: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRowWithSuggestion
                          label="Telefone"
                          fieldName="phone"
                          value={lead.phone}
                          icon={<Phone className="w-4 h-4" />}
                          isEditing={isEditing}
                          isLink={!!lead.phone}
                          suggestion={getSuggestionForField(suggestions, "phone")}
                          onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("phone", value)}
                          onRejectSuggestion={() => handleRejectInlineSuggestion("phone")}
                          isAcceptingSuggestion={acceptingField === "phone"}
                          editComponent={
                            <Input
                              value={editedLead?.phone}
                              onChange={(e) =>
                                setEditedLead((prev) => prev && { ...prev, phone: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRowWithSuggestion
                          label="Origem"
                          fieldName="source"
                          value={lead.source}
                          icon={<Briefcase className="w-4 h-4" />}
                          isEditing={isEditing}
                          suggestion={getSuggestionForField(suggestions, "source")}
                          onAcceptSuggestion={(value) => handleAcceptInlineSuggestion("source", value)}
                          onRejectSuggestion={() => handleRejectInlineSuggestion("source")}
                          isAcceptingSuggestion={acceptingField === "source"}
                          editComponent={
                            <Input
                              value={editedLead?.source}
                              onChange={(e) =>
                                setEditedLead((prev) => prev && { ...prev, source: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="Estado"
                          value={
                            <Badge variant="outline" className={statusColors[lead.status]}>
                              {statusLabels[lead.status]}
                            </Badge>
                          }
                          icon={<Tag className="w-4 h-4" />}
                          isEditing={isEditing}
                          editComponent={
                            <Select
                              value={editedLead?.status}
                              onValueChange={(value) =>
                                setEditedLead((prev) => prev && { ...prev, status: value as LeadStatus })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Novo</SelectItem>
                                <SelectItem value="in_progress">Em Progresso</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom Fields Section - Show if there are fields defined or values exist */}
                  {(customFields.length > 0 || customFieldValues.length > 0) && (
                    <Collapsible open={showCustomFields} onOpenChange={setShowCustomFields}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium">Campos Personalizados</CardTitle>
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                showCustomFields && "rotate-180"
                              )} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {isEditing ? (
                              <CustomFieldsForm entityType="lead" entityId={lead.id} />
                            ) : (
                              <div className="divide-y divide-border/50">
                                {customFields.map((field) => (
                                  <CustomFieldWithSuggestion
                                    key={field.id}
                                    field={field}
                                    value={customFieldValuesMap.get(field.id)}
                                    onChange={() => {}} // Read-only in view mode
                                    isEditing={false}
                                    suggestion={getCustomFieldSuggestion(suggestions, field.id)}
                                    onAcceptSuggestion={(value) => handleAcceptCustomFieldSuggestion(field.id, value)}
                                    onRejectSuggestion={() => handleRejectCustomFieldSuggestion(field.id)}
                                    isAcceptingSuggestion={acceptingField === field.id}
                                  />
                                ))}
                                {customFields.length === 0 && (
                                  <p className="text-sm text-muted-foreground py-3">
                                    Sem campos personalizados definidos
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* More Details Section */}
                  <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium">
                              {showMoreDetails ? "Ocultar detalhes" : "Mais detalhes"}
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
                              label="Criado em"
                              value={new Date(lead.created_at).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              icon={<Calendar className="w-4 h-4" />}
                            />
                            <DetailRow
                              label="Atualizado"
                              value={new Date(lead.updated_at).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              icon={<Clock className="w-4 h-4" />}
                            />
                            <DetailRow
                              label="ID"
                              value={
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {lead.id}
                                </code>
                              }
                            />
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </>
              )}

              {activeSection === "notes" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Notas</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Nova Nota
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem notas registadas</p>
                      <p className="text-xs mt-1">Adicione notas para acompanhar este lead</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "messages" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Mensagens</CardTitle>
                      <Button size="sm" className="gap-1">
                        <Send className="w-4 h-4" />
                        Nova Mensagem
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem mensagens</p>
                      <p className="text-xs mt-1">Inicie uma conversa com este lead</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "opportunities" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Oportunidades</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Nova Oportunidade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem oportunidades</p>
                      <p className="text-xs mt-1">Crie uma oportunidade para este lead</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "tasks" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Tarefas</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Nova Tarefa
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem tarefas</p>
                      <p className="text-xs mt-1">Crie tarefas para acompanhar este lead</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "files" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Ficheiros</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Carregar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem ficheiros</p>
                      <p className="text-xs mt-1">Carregue documentos relacionados</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === "payments" && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Pagamentos</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="w-4 h-4" />
                        Registar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem pagamentos</p>
                      <p className="text-xs mt-1">Registe pagamentos deste lead</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </main>

        {/* Right Sidebar - Insights */}
        <aside className="w-72 border-l bg-muted/10 flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Status Widget */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Estado do Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={cn("text-sm", statusColors[lead.status])}>
                    {statusLabels[lead.status]}
                  </Badge>
                </CardContent>
              </Card>

              {/* Best Time Widget */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Hora</CardTitle>
                  <span className="text-xs text-primary font-medium">Hoje</span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Chamada</p>
                    <p className="text-xs text-muted-foreground">Não há melhor hora para o dia</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-xs text-muted-foreground">Não há melhor hora para o dia</p>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Widget */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Proprietário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        VC
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Você</p>
                      <p className="text-xs text-muted-foreground">Criador do lead</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Last Activity Widget */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Última Atividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{getTimeAgo(new Date(lead.updated_at))}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Contextual Templates */}
              <ContextualTemplatePanel
                entityType="lead"
                entityId={id || ''}
                entityData={templateContext}
                status={lead?.status}
                goal={lead?.status === 'new' ? 'qualification' : 'follow_up'}
                onApply={handleTemplateApply}
                maxVisible={3}
              />

              {/* AI Field Suggestions */}
              <FieldSuggestionsPanel
                entityType="lead"
                entityId={lead.id}
                onApplySuggestion={handleApplySuggestion}
              />

              {/* Unified Activity Log */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4">
                  <UnifiedActivityLog
                    leadId={id}
                    compact
                    limit={15}
                  />
                </CardContent>
              </Card>

              {/* AI Insights Widget */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Insights IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Com base no perfil e comportamento, este lead tem alta probabilidade de conversão. 
                    Considere agendar uma chamada esta semana.
                  </p>
                  <Button size="sm" variant="outline" className="w-full mt-3 text-xs">
                    Ver mais insights
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Unified Layout Customizer */}
      <UnifiedLayoutCustomizer
        open={layoutCustomizerOpen}
        onOpenChange={setLayoutCustomizerOpen}
        entityType="lead"
        entityId={id}
        currentLayout={layoutData?.layout || { widgets: [], sidebar: DEFAULT_SIDEBAR_MODULES }}
        layoutSource={layoutData?.source || "default"}
        isAdmin={isAdmin}
      />
    </div>
  );
}
