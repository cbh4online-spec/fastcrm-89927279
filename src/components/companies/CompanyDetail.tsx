import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanies, Company, UpdateCompanyData } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { CustomFieldsForm, CustomFieldsDisplay } from "@/components/custom-fields/CustomFieldsForm";
import { useCustomFieldValues } from "@/hooks/useCustomFields";
import { cn } from "@/lib/utils";

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

  const company = companies.find(c => c.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(true);
  const [showCustomFields, setShowCustomFields] = useState(true);
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
                  label="Website"
                  value={company.website}
                  icon={<Globe className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.website}
                  linkType="url"
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
                <DetailRow
                  label="E-mail"
                  value={company.email}
                  icon={<Mail className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.email}
                  linkType="email"
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
                <DetailRow
                  label="Telefone"
                  value={company.phone}
                  icon={<Phone className="w-4 h-4" />}
                  isEditing={isEditing}
                  isLink={!!company.phone}
                  linkType="phone"
                  editComponent={
                    <Input
                      value={editedCompany?.phone}
                      onChange={(e) =>
                        setEditedCompany((prev) => prev && { ...prev, phone: e.target.value })
                      }
                    />
                  }
                />
                <DetailRow
                  label="Indústria"
                  value={company.industry}
                  icon={<Factory className="w-4 h-4" />}
                  isEditing={isEditing}
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
                      <CustomFieldsForm entityType="company" entityId={company.id} />
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
