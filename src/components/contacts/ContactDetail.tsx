import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContacts, Contact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { FieldSuggestionsPanel } from "@/components/ai/FieldSuggestionsPanel";
import { ContactInsightsPanel } from "@/components/contacts/ContactInsightsPanel";
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
  Building2,
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
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { CustomFieldsForm } from "@/components/custom-fields/CustomFieldsForm";
import { useCustomFields, useCustomFieldValues, useSetCustomFieldValue } from "@/hooks/useCustomFields";
import { CustomFieldWithSuggestion, getCustomFieldSuggestion } from "@/components/ai/CustomFieldWithSuggestion";
import { cn } from "@/lib/utils";

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
      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
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

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, isLoading, updateContact, deleteContact } = useContacts();
  const { data: customFieldValues = [] } = useCustomFieldValues(id);
  const { data: customFields = [] } = useCustomFields("contact");
  const setCustomFieldValue = useSetCustomFieldValue();

  const contact = contacts.find(c => c.id === id);

  // AI field suggestions
  const { data: suggestions = [] } = useFieldSuggestions("contact", id);
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
  const [showNotes, setShowNotes] = useState(true);
  const [layoutCustomizerOpen, setLayoutCustomizerOpen] = useState(false);
  
  // Layout configuration
  const { data: layoutData } = useLayoutConfig("contact");
  const { isAdmin } = useUserRole();
  const sidebarModules = layoutData?.layout.sidebar || DEFAULT_SIDEBAR_MODULES;
  const [editedContact, setEditedContact] = useState<{
    name: string;
    email: string;
    phone: string;
    company: string;
    job_title: string;
    notes: string;
    tags: string[];
  } | null>(null);

  const handleEdit = () => {
    if (contact) {
      setEditedContact({
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
        job_title: contact.job_title || "",
        notes: contact.notes || "",
        tags: contact.tags || [],
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!contact || !editedContact) return;

    try {
      await updateContact.mutateAsync({
        id: contact.id,
        name: editedContact.name,
        email: editedContact.email || undefined,
        phone: editedContact.phone || undefined,
        company: editedContact.company || undefined,
        job_title: editedContact.job_title || undefined,
        notes: editedContact.notes || undefined,
        tags: editedContact.tags,
      });
      toast.success("Contacto atualizado com sucesso");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar contacto");
    }
  };

  const handleDelete = async () => {
    if (!contact) return;

    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success("Contacto eliminado com sucesso");
      navigate("/dashboard/contacts");
    } catch (error) {
      toast.error("Erro ao eliminar contacto");
    }
  };

  // Helper to accept inline suggestion
  const handleAcceptInlineSuggestion = useCallback(async (fieldName: string, value: unknown) => {
    if (!contact) return;
    
    const suggestion = suggestions.find(s => s.field_name === fieldName);
    if (!suggestion) return;
    
    setAcceptingField(fieldName);
    try {
      await acceptSuggestion.mutateAsync({
        suggestion,
        onApply: async () => {
          await updateContact.mutateAsync({
            id: contact.id,
            [fieldName]: value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [contact, suggestions, acceptSuggestion, updateContact]);

  // Helper to reject inline suggestion
  const handleRejectInlineSuggestion = useCallback((fieldName: string) => {
    const suggestion = suggestions.find(s => s.field_name === fieldName);
    if (suggestion) {
      rejectSuggestion.mutate(suggestion);
    }
  }, [suggestions, rejectSuggestion]);

  // Handler for accepting custom field suggestions
  const handleAcceptCustomFieldSuggestion = useCallback(async (customFieldId: string, value: unknown) => {
    if (!contact) return;
    
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
            entityId: contact.id,
            value,
          });
        },
      });
    } finally {
      setAcceptingField(null);
    }
  }, [contact, suggestions, acceptSuggestion, setCustomFieldValue]);

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

  if (!contact) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Contacto não encontrado</h2>
        <p className="text-muted-foreground mb-4">
          O contacto que procura não existe ou foi eliminado.
        </p>
        <Button onClick={() => navigate("/dashboard/contacts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Contactos
        </Button>
      </div>
    );
  }

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Breadcrumbs */}
      <div className="bg-background px-6 pt-4">
        <PageBreadcrumbs
          items={[
            { label: "CRM", href: "/dashboard/crm" },
            { label: "Contactos", href: "/dashboard/contacts" },
            { label: contact.name },
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
              onClick={() => navigate("/dashboard/contacts")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500/80 to-emerald-600 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Input
                    value={editedContact?.name}
                    onChange={(e) =>
                      setEditedContact((prev) => prev && { ...prev, name: e.target.value })
                    }
                    className="text-xl font-semibold h-auto py-1 px-2 w-64"
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-foreground">{contact.name}</h1>
                )}
                
                {/* Job Title Badge */}
                {contact.job_title && (
                  <Badge variant="outline" className="font-normal">
                    {contact.job_title}
                  </Badge>
                )}
                
                {/* Company Badge */}
                {contact.company && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    {contact.company}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Atualizado há {getTimeAgo(new Date(contact.updated_at))}
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
                <Button onClick={handleSave} disabled={updateContact.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateContact.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => id && generateSuggestions.mutate({ entityType: "contact", entityId: id })}
                  disabled={generateSuggestions.isPending}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generateSuggestions.isPending ? "A analisar..." : "Sugestões IA"}
                </Button>
                {contact.email && (
                  <Button variant="default" className="gap-2" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="w-4 h-4" />
                      Enviar E-mail
                    </a>
                  </Button>
                )}
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
                      <AlertDialogTitle>Eliminar Contacto</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem a certeza que deseja eliminar este contacto? Esta ação não pode ser revertida.
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
          entityType="contact"
          entityId={id}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          modules={sidebarModules}
        />

        {/* Center Content */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4 max-w-3xl">
              {activeSection === "overview" && (
                <>
                  {/* AI Insights Panel */}
                  <ContactInsightsPanel 
                    contactId={id!} 
                    contactEmail={contact.email}
                    contactPhone={contact.phone}
                  />
                  
                  {/* Customizable KPI Dashboard */}
                  <CustomizableKPIDashboard
                    entityType="contact"
                    entityId={id}
                    entityData={contact ? {
                      name: contact.name,
                      notes: contact.notes || undefined,
                      tags: contact.tags || undefined,
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
                        <DetailRow
                          label="Nome"
                          value={contact.name}
                          icon={<User className="w-4 h-4" />}
                          isEditing={isEditing}
                          editComponent={
                            <Input
                              value={editedContact?.name}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { ...prev, name: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="E-mail"
                          value={contact.email}
                          icon={<Mail className="w-4 h-4" />}
                          isEditing={isEditing}
                          isLink={!!contact.email}
                          linkType="email"
                          editComponent={
                            <Input
                              type="email"
                              value={editedContact?.email}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { ...prev, email: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="Telefone"
                          value={contact.phone}
                          icon={<Phone className="w-4 h-4" />}
                          isEditing={isEditing}
                          isLink={!!contact.phone}
                          linkType="phone"
                          editComponent={
                            <Input
                              value={editedContact?.phone}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { ...prev, phone: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="Empresa"
                          value={contact.company}
                          icon={<Building2 className="w-4 h-4" />}
                          isEditing={isEditing}
                          editComponent={
                            <Input
                              value={editedContact?.company}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { ...prev, company: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="Cargo"
                          value={contact.job_title}
                          icon={<Briefcase className="w-4 h-4" />}
                          isEditing={isEditing}
                          editComponent={
                            <Input
                              value={editedContact?.job_title}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { ...prev, job_title: e.target.value })
                              }
                            />
                          }
                        />
                        <DetailRow
                          label="Tags"
                          value={
                            contact.tags && contact.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {contact.tags.map((tag) => (
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
                              value={editedContact?.tags.join(", ")}
                              onChange={(e) =>
                                setEditedContact((prev) => prev && { 
                                  ...prev, 
                                  tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                                })
                              }
                              placeholder="tag1, tag2, tag3"
                            />
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes Section */}
                  {(contact.notes || isEditing) && (
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
                                value={editedContact?.notes}
                                onChange={(e) =>
                                  setEditedContact((prev) => prev && { ...prev, notes: e.target.value })
                                }
                                placeholder="Adicionar notas..."
                                className="min-h-[100px]"
                              />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">
                                {contact.notes || <span className="text-muted-foreground">Sem notas</span>}
                              </p>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

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
                              <CustomFieldsForm entityType="contact" entityId={contact.id} />
                            ) : (
                              <div className="divide-y divide-border/50">
                                {customFields.map((field) => (
                                  <CustomFieldWithSuggestion
                                    key={field.id}
                                    field={field}
                                    value={customFieldValuesMap.get(field.id)}
                                    onChange={() => {}}
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
                              value={new Date(contact.created_at).toLocaleDateString('pt-PT', {
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
                              value={new Date(contact.updated_at).toLocaleDateString('pt-PT', {
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
                                  {contact.id}
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
                    {contact.notes ? (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Sem notas registadas</p>
                        <p className="text-xs mt-1">Adicione notas para acompanhar este contacto</p>
                      </div>
                    )}
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
                      <p className="text-xs mt-1">Inicie uma conversa com este contacto</p>
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
                      <p className="text-xs mt-1">Crie uma oportunidade para este contacto</p>
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
                      <p className="text-xs mt-1">Crie tarefas para acompanhar este contacto</p>
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
            </div>
          </ScrollArea>
        </main>

        {/* Right Sidebar - Insights */}
        <aside className="w-72 border-l bg-muted/10 flex-shrink-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Company Widget */}
              {contact.company && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Empresa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{contact.company}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Last Activity Widget */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Última Atividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{getTimeAgo(new Date(contact.updated_at))}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contact.email && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={`mailto:${contact.email}`}>
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar E-mail
                      </a>
                    </Button>
                  )}
                  {contact.phone && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={`tel:${contact.phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        Ligar
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* AI Field Suggestions */}
              <FieldSuggestionsPanel
                entityType="contact"
                entityId={contact.id}
                onApplySuggestion={async (fieldName, value, fieldType) => {
                  if (fieldType === "standard") {
                    await updateContact.mutateAsync({ id: contact.id, [fieldName]: value });
                  }
                }}
              />

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
                    Baseado no histórico de interações, este contacto responde melhor a comunicação por e-mail durante a manhã.
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
        entityType="contact"
        entityId={id}
        currentLayout={layoutData?.layout || { widgets: [], sidebar: DEFAULT_SIDEBAR_MODULES }}
        layoutSource={layoutData?.source || "default"}
        isAdmin={isAdmin}
      />
    </div>
  );
}
