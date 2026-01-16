import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContacts } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { ArrowLeft, Edit2, Save, X, Trash2, User, Clock, Building2, Shield } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ENIContact, ENTITY_TYPE_LABELS, EntityType } from "./ENIContactTypes";
import { IdentificationSection } from "./sections/IdentificationSection";
import { AddressSection } from "./sections/AddressSection";
import { ProfessionalProfileSection } from "./sections/ProfessionalProfileSection";
import { CommercialProfileSection } from "./sections/CommercialProfileSection";
import { FinancialSection } from "./sections/FinancialSection";
import { CommercialHistorySection } from "./sections/CommercialHistorySection";
import { NotesSection } from "./sections/NotesSection";
import { AIInsightsSection } from "./sections/AIInsightsSection";
import { DocumentsSection } from "./sections/DocumentsSection";
import { ProductsSection } from "./sections/ProductsSection";
import { useAnalyzeContact } from "@/hooks/useSmartContacts";
import { useContactPermissions } from "./useContactPermissions";
import { cn } from "@/lib/utils";

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

export function ENIContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, isLoading, updateContact, deleteContact } = useContacts();
  const analyzeContact = useAnalyzeContact();
  
  const contact = contacts.find(c => c.id === id) as unknown as ENIContact | undefined;
  const { role, canEdit, isLoading: permissionsLoading } = useContactPermissions();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ENIContact>>({});

  // Check if user can edit anything
  const canEditAnything = role && (role === 'owner' || role === 'admin' || role === 'agency' || role === 'agent');

  const handleFieldChange = useCallback((field: keyof ENIContact, value: unknown) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEdit = () => {
    setEditedData({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!contact) return;
    try {
      await updateContact.mutateAsync({ id: contact.id, ...editedData });
      toast.success("Contacto atualizado com sucesso");
      setIsEditing(false);
      setEditedData({});
    } catch {
      toast.error("Erro ao atualizar contacto");
    }
  };

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
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
      <div className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/contacts")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-14 w-14">
              <AvatarFallback className={cn(
                "text-white font-semibold",
                entityType === 'eni' ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                entityType === 'empresa' ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
                "bg-gradient-to-br from-emerald-500 to-emerald-600"
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{contact.name}</h1>
                <Badge variant="outline" className="text-xs">
                  {ENTITY_TYPE_LABELS[entityType]}
                </Badge>
                {contact.company && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    {contact.company}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
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
                      <p>O seu nível de acesso nesta ficha</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-2" />Cancelar</Button>
                <Button onClick={handleSave} disabled={updateContact.isPending}>
                  <Save className="w-4 h-4 mr-2" />{updateContact.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </>
            ) : (
              <>
                {canEditAnything && (
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4 mr-2" />Editar
                  </Button>
                )}
                {(role === 'owner' || role === 'admin') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Contacto</AlertDialogTitle>
                        <AlertDialogDescription>Tem a certeza? Esta ação não pode ser revertida.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* AI Insights */}
          <AIInsightsSection 
            contact={contact} 
            onGenerateInsights={handleGenerateInsights}
            isGenerating={analyzeContact.isPending}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IdentificationSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />
            <AddressSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />
          </div>

          <ProfessionalProfileSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommercialProfileSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />
            <FinancialSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductsSection contactId={id!} />
            <DocumentsSection contactId={id!} />
          </div>

          <CommercialHistorySection contact={contact} />
          <NotesSection contact={contact} isEditing={isEditing} editedData={editedData} onFieldChange={handleFieldChange} />
        </div>
      </ScrollArea>
    </div>
  );
}
