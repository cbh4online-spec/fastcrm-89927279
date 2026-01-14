import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContacts, Contact, UpdateContactData } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  Building2,
  Briefcase,
  Tag,
  FileText,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { CustomFieldsForm, CustomFieldsDisplay } from "@/components/custom-fields/CustomFieldsForm";
import { useCustomFieldValues } from "@/hooks/useCustomFields";
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

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, isLoading, updateContact, deleteContact } = useContacts();
  const { data: customFieldValues = [] } = useCustomFieldValues(id);

  const contact = contacts.find(c => c.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(true);
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/contacts")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-16 w-16 text-xl">
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
                  className="text-2xl font-semibold h-auto py-1 px-2"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-foreground">{contact.name}</h1>
              )}
              {contact.job_title && (
                <Badge variant="outline" className="font-normal">
                  {contact.job_title}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última atualização: {new Date(contact.updated_at).toLocaleDateString('pt-PT')}
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
              <Button onClick={handleSave} disabled={updateContact.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateContact.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </>
          ) : (
            <>
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

          {/* Notes Section - Collapsible */}
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

          {/* Custom Fields Section - Collapsible */}
          {(customFieldValues.length > 0 || isEditing) && (
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
                        {customFieldValues.map((fieldValue) => (
                          <DetailRow
                            key={fieldValue.id}
                            label={fieldValue.custom_field.name}
                            value={
                              fieldValue.custom_field.field_type === 'boolean'
                                ? (fieldValue.value ? 'Sim' : 'Não')
                                : fieldValue.custom_field.field_type === 'date'
                                ? new Date(fieldValue.value as string).toLocaleDateString('pt-PT')
                                : String(fieldValue.value || '—')
                            }
                          />
                        ))}
                        {customFieldValues.length === 0 && (
                          <p className="text-sm text-muted-foreground py-3">
                            Sem campos personalizados preenchidos
                          </p>
                        )}
                      </div>
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
                      value={new Date(contact.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    />
                    <DetailRow
                      label="Última Atualização"
                      value={new Date(contact.updated_at).toLocaleDateString('pt-PT', {
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
                          {contact.id}
                        </code>
                      }
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column - Placeholder for future additions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contact.email && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`mailto:${contact.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar E-mail
                  </a>
                </Button>
              )}
              {contact.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`tel:${contact.phone}`}>
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
