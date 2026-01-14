import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, LeadStatus } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { CrmCopilot } from "@/components/copilot/CrmCopilot";
import { CustomFieldsForm, CustomFieldsDisplay } from "@/components/custom-fields/CustomFieldsForm";
import { useCustomFieldValues } from "@/hooks/useCustomFields";
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
      <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
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
  const { data: lead, isLoading } = useLead(id);
  const { data: customFieldValues = [] } = useCustomFieldValues(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const [isEditing, setIsEditing] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(true);
  const [showCustomFields, setShowCustomFields] = useState(true);
  const [editedLead, setEditedLead] = useState<{
    name: string;
    email: string;
    phone: string;
    source: string;
    status: LeadStatus;
  } | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/leads")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-16 w-16 text-xl">
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
                  className="text-2xl font-semibold h-auto py-1 px-2"
                />
              ) : (
                <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>
              )}
              <Badge variant="outline" className={cn("font-medium", statusColors[lead.status])}>
                {statusLabels[lead.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Última atualização: {new Date(lead.updated_at).toLocaleDateString('pt-PT')}
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
              <Button onClick={handleSave} disabled={updateLead.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateLead.isPending ? "A guardar..." : "Guardar"}
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
                  value={lead.email}
                  icon={<Mail className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!lead.email}
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
                <DetailRow
                  label="Telefone"
                  value={lead.phone}
                  icon={<Phone className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!lead.phone}
                  editComponent={
                    <Input
                      value={editedLead?.phone}
                      onChange={(e) =>
                        setEditedLead((prev) => prev && { ...prev, phone: e.target.value })
                      }
                    />
                  }
                />
                <DetailRow
                  label="Origem"
                  value={lead.source}
                  icon={<Briefcase className="w-4 h-4" />}
                  isEditing={isEditing}
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
                      <CustomFieldsForm entityType="lead" entityId={lead.id} />
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
                      value={new Date(lead.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    />
                    <DetailRow
                      label="Última Atualização"
                      value={new Date(lead.updated_at).toLocaleDateString('pt-PT', {
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
                          {lead.id}
                        </code>
                      }
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right Column - AI Copilot */}
        <div className="space-y-4">
          <CrmCopilot lead={lead} />
        </div>
      </div>
    </div>
  );
}
