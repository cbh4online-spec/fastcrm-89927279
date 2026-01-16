import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContacts } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { ArrowLeft, Trash2, User, Clock, Building2, Shield, Sparkles } from "lucide-react";
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
import { NifLookupResult } from "@/hooks/useNifLookup";
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
  const { role } = useContactPermissions();

  // Inline field change handler - saves immediately
  const handleFieldChange = useCallback(async (field: keyof ENIContact, value: unknown) => {
    if (!contact) return;
    try {
      await updateContact.mutateAsync({ id: contact.id, [field]: value });
      toast.success("Campo atualizado");
    } catch {
      toast.error("Erro ao atualizar campo");
    }
  }, [contact, updateContact]);

  // Handler for NIF lookup data received
  const handleNifDataReceived = useCallback(async (data: NifLookupResult) => {
    if (!contact) return;
    
    const updateData: Record<string, unknown> = { id: contact.id };

    // Only update fields that are empty
    if (data.company_name && !contact.name) updateData.name = data.company_name;
    if (data.address && !contact.address) updateData.address = data.address;
    if (data.city && !contact.city) updateData.city = data.city;
    if (data.postal_code && !contact.postal_code) updateData.postal_code = data.postal_code;
    if (data.email && !contact.email) updateData.email = data.email;
    if (data.phone && !contact.phone) updateData.phone = data.phone;
    if (data.cae_codes?.[0] && !contact.cae_code) updateData.cae_code = data.cae_codes[0];
    if (data.cae_description && !contact.cae_description) updateData.cae_description = data.cae_description;

    // Only update if we have new data
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
            <Avatar className="h-16 w-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarFallback className={cn(
                "text-white font-bold text-lg",
                entityType === 'eni' ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                entityType === 'empresa' ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
                "bg-gradient-to-br from-emerald-500 to-emerald-600"
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* AI Insights */}
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
            <AddressSection 
              contact={contact} 
              onFieldChange={handleFieldChange}
            />
          </div>

          <ProfessionalProfileSection 
            contact={contact} 
            onFieldChange={handleFieldChange}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommercialProfileSection 
              contact={contact} 
              onFieldChange={handleFieldChange}
            />
            <FinancialSection 
              contact={contact} 
              onFieldChange={handleFieldChange}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductsSection contactId={id!} />
            <DocumentsSection contactId={id!} />
          </div>

          <CommercialHistorySection contact={contact} />
          <NotesSection 
            contact={contact} 
            onFieldChange={handleFieldChange}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
