import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  GraduationCap,
  Package,
  Calculator,
  TrendingUp,
  FileText,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  useActivityProfiles,
  useUpdateActivityProfile,
  useCreateActivityProfile,
  useDeleteActivityProfile,
  useSetWorkspaceDefaultProfile,
  useInitializeActivityProfiles,
} from "@/hooks/useActivityProfiles";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ActivityProfile,
  ActivityProfileType,
  PROFILE_TYPE_LABELS,
  PROFILE_SPECIFIC_FIELDS,
  BASE_MODULES,
} from "@/types/activityProfile";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase,
  GraduationCap,
  Package,
  Calculator,
  TrendingUp,
  FileText,
  Settings,
};

const MODULE_LABELS: Record<string, string> = {
  contacts: "Contactos",
  companies: "Empresas",
  opportunities: "Oportunidades",
  products: "Produtos / Serviços",
  meetings: "Reuniões",
  tasks: "Tarefas",
  history: "Histórico / Timeline",
  payments: "Pagamentos / Faturação",
};

// Common fields for contacts/companies
const COMMON_FIELDS = {
  contacts: [
    { id: "name", label: "Nome" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Telefone" },
    { id: "company", label: "Empresa" },
    { id: "job_title", label: "Cargo" },
    { id: "tags", label: "Etiquetas" },
    { id: "notes", label: "Notas" },
    { id: "source", label: "Origem" },
    { id: "nif", label: "NIF" },
    { id: "address", label: "Morada" },
    { id: "city", label: "Cidade" },
  ],
  companies: [
    { id: "name", label: "Nome" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Telefone" },
    { id: "industry", label: "Indústria" },
    { id: "website", label: "Website" },
    { id: "address", label: "Morada" },
    { id: "tax_id", label: "NIF" },
    { id: "size", label: "Dimensão" },
    { id: "annual_revenue", label: "Receita Anual" },
    { id: "employee_count", label: "Nº Colaboradores" },
  ],
};

export function ActivityProfileSettings() {
  const { currentWorkspace } = useWorkspace();
  const { data: profiles = [], isLoading } = useActivityProfiles();
  const updateProfile = useUpdateActivityProfile();
  const createProfile = useCreateActivityProfile();
  const deleteProfile = useDeleteActivityProfile();
  const setDefaultProfile = useSetWorkspaceDefaultProfile();
  const initProfiles = useInitializeActivityProfiles();

  const [selectedProfile, setSelectedProfile] = useState<ActivityProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultProfileId, setDefaultProfileId] = useState<string | null>(null);

  // Form state for editing
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    visible_fields: Record<string, string[]>;
    active_modules: string[];
  }>({
    name: "",
    description: "",
    visible_fields: {},
    active_modules: [],
  });

  // Form state for creating
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    description: "",
    profile_type: "custom" as ActivityProfileType,
    icon: "Briefcase",
    color: "#6366f1",
  });

  // Fetch workspace default profile
  useEffect(() => {
    async function fetchDefault() {
      if (!currentWorkspace?.id) return;
      const { data } = await supabase
        .from("workspaces")
        .select("default_activity_profile_id")
        .eq("id", currentWorkspace.id)
        .single();
      setDefaultProfileId(data?.default_activity_profile_id || null);
    }
    fetchDefault();
  }, [currentWorkspace?.id, profiles]);

  // Initialize profiles if none exist
  useEffect(() => {
    if (!isLoading && profiles.length === 0 && currentWorkspace?.id) {
      initProfiles.mutate();
    }
  }, [isLoading, profiles.length, currentWorkspace?.id]);

  const handleEditProfile = (profile: ActivityProfile) => {
    setSelectedProfile(profile);
    setEditForm({
      name: profile.name,
      description: profile.description || "",
      visible_fields: profile.visible_fields,
      active_modules: profile.active_modules,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProfile) return;

    await updateProfile.mutateAsync({
      profileId: selectedProfile.id,
      updates: {
        name: editForm.name,
        description: editForm.description,
        visible_fields: editForm.visible_fields,
        active_modules: editForm.active_modules,
      },
    });
    setEditDialogOpen(false);
    setSelectedProfile(null);
  };

  const handleCreateProfile = async () => {
    if (!createForm.code || !createForm.name) {
      toast.error("Preencha o código e nome do perfil");
      return;
    }

    await createProfile.mutateAsync({
      code: createForm.code.toLowerCase().replace(/\s+/g, "_"),
      name: createForm.name,
      description: createForm.description,
      profile_type: createForm.profile_type,
      icon: createForm.icon,
      color: createForm.color,
      is_system: false,
      is_active: true,
      visible_fields: {},
      hidden_fields: {},
      active_modules: [...BASE_MODULES],
      module_settings: {},
      custom_fields_config: [],
      automation_triggers: [],
      kpi_config: [],
      ai_context: { terminology: {}, focus_areas: [] },
      ai_suggestions_enabled: true,
      created_by: null,
    });

    setCreateDialogOpen(false);
    setCreateForm({
      code: "",
      name: "",
      description: "",
      profile_type: "custom",
      icon: "Briefcase",
      color: "#6366f1",
    });
  };

  const handleSetDefault = async (profileId: string) => {
    await setDefaultProfile.mutateAsync(profileId);
    setDefaultProfileId(profileId);
  };

  const handleDeleteProfile = async (profile: ActivityProfile) => {
    if (profile.is_system) {
      toast.error("Não é possível eliminar perfis de sistema");
      return;
    }
    await deleteProfile.mutateAsync(profile.id);
  };

  const toggleModule = (module: string) => {
    setEditForm((prev) => ({
      ...prev,
      active_modules: prev.active_modules.includes(module)
        ? prev.active_modules.filter((m) => m !== module)
        : [...prev.active_modules, module],
    }));
  };

  const toggleField = (entity: "contacts" | "companies", fieldId: string) => {
    setEditForm((prev) => {
      const currentFields = prev.visible_fields[entity] || [];
      const newFields = currentFields.includes(fieldId)
        ? currentFields.filter((f) => f !== fieldId)
        : [...currentFields, fieldId];
      return {
        ...prev,
        visible_fields: {
          ...prev.visible_fields,
          [entity]: newFields,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Perfis de Atividade</h3>
          <p className="text-sm text-muted-foreground">
            Configure como o CRM se adapta a diferentes tipos de negócio
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Como funcionam os Perfis de Atividade?</p>
              <p className="text-sm text-muted-foreground">
                Os perfis adaptam campos visíveis, módulos ativos e sugestões da IA ao tipo de negócio.
                Defina um perfil padrão para o workspace ou atribua perfis específicos a cada empresa/contacto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((profile) => {
          const IconComponent = ICON_MAP[profile.icon] || Briefcase;
          const isDefault = defaultProfileId === profile.id;

          return (
            <Card
              key={profile.id}
              className={`relative transition-all ${
                isDefault ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${profile.color}20` }}
                    >
                      <IconComponent
                        className="h-5 w-5"
                        style={{ color: profile.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {profile.name}
                        {isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                        {profile.is_system && (
                          <Badge variant="outline" className="text-xs">
                            Sistema
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {PROFILE_TYPE_LABELS[profile.profile_type]}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {profile.description || "Sem descrição"}
                </p>

                <div className="flex flex-wrap gap-1">
                  {profile.active_modules.slice(0, 4).map((module) => (
                    <Badge key={module} variant="secondary" className="text-xs">
                      {MODULE_LABELS[module] || module}
                    </Badge>
                  ))}
                  {profile.active_modules.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{profile.active_modules.length - 4}
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProfile(profile)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    {!isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(profile.id)}
                      >
                        <Star className="h-3.5 w-3.5 mr-1" />
                        Definir Padrão
                      </Button>
                    )}
                  </div>
                  {!profile.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProfile(profile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Perfil: {selectedProfile?.name}</DialogTitle>
            <DialogDescription>
              Configure os módulos e campos visíveis para este perfil
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Perfil</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={selectedProfile?.is_system}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Modules */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Módulos Ativos</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha quais módulos ficam disponíveis para este perfil
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MODULE_LABELS).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center space-x-2 p-2 border rounded-lg"
                    >
                      <Checkbox
                        id={`module-${key}`}
                        checked={editForm.active_modules.includes(key)}
                        onCheckedChange={() => toggleModule(key)}
                      />
                      <label
                        htmlFor={`module-${key}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Field Visibility */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Campos Visíveis por Entidade
                </Label>
                <p className="text-sm text-muted-foreground">
                  Selecione os campos que aparecem para cada tipo de entidade
                </p>

                <Tabs defaultValue="contacts">
                  <TabsList>
                    <TabsTrigger value="contacts">Contactos</TabsTrigger>
                    <TabsTrigger value="companies">Empresas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="contacts" className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {COMMON_FIELDS.contacts.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center space-x-2 p-2 border rounded-lg"
                        >
                          <Checkbox
                            id={`contact-${field.id}`}
                            checked={
                              editForm.visible_fields.contacts?.includes(
                                field.id
                              ) ?? true
                            }
                            onCheckedChange={() =>
                              toggleField("contacts", field.id)
                            }
                          />
                          <label
                            htmlFor={`contact-${field.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {field.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Profile-specific fields */}
                    {selectedProfile &&
                      PROFILE_SPECIFIC_FIELDS[selectedProfile.profile_type]
                        ?.filter((f) => f.entity_types.includes("contact"))
                        .length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <p className="text-sm font-medium mb-2">
                            Campos específicos do perfil:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {PROFILE_SPECIFIC_FIELDS[
                              selectedProfile.profile_type
                            ]
                              ?.filter((f) => f.entity_types.includes("contact"))
                              .map((field) => (
                                <div
                                  key={field.id}
                                  className="flex items-center space-x-2 p-2 border rounded-lg bg-primary/5"
                                >
                                  <Checkbox
                                    id={`contact-${field.id}`}
                                    checked={
                                      editForm.visible_fields.contacts?.includes(
                                        field.id
                                      ) ?? true
                                    }
                                    onCheckedChange={() =>
                                      toggleField("contacts", field.id)
                                    }
                                  />
                                  <label
                                    htmlFor={`contact-${field.id}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {field.label}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                  </TabsContent>

                  <TabsContent value="companies" className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {COMMON_FIELDS.companies.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center space-x-2 p-2 border rounded-lg"
                        >
                          <Checkbox
                            id={`company-${field.id}`}
                            checked={
                              editForm.visible_fields.companies?.includes(
                                field.id
                              ) ?? true
                            }
                            onCheckedChange={() =>
                              toggleField("companies", field.id)
                            }
                          />
                          <label
                            htmlFor={`company-${field.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {field.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Profile-specific fields */}
                    {selectedProfile &&
                      PROFILE_SPECIFIC_FIELDS[selectedProfile.profile_type]
                        ?.filter((f) => f.entity_types.includes("company"))
                        .length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <p className="text-sm font-medium mb-2">
                            Campos específicos do perfil:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {PROFILE_SPECIFIC_FIELDS[
                              selectedProfile.profile_type
                            ]
                              ?.filter((f) => f.entity_types.includes("company"))
                              .map((field) => (
                                <div
                                  key={field.id}
                                  className="flex items-center space-x-2 p-2 border rounded-lg bg-primary/5"
                                >
                                  <Checkbox
                                    id={`company-${field.id}`}
                                    checked={
                                      editForm.visible_fields.companies?.includes(
                                        field.id
                                      ) ?? true
                                    }
                                    onCheckedChange={() =>
                                      toggleField("companies", field.id)
                                    }
                                  />
                                  <label
                                    htmlFor={`company-${field.id}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {field.label}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Perfil</DialogTitle>
            <DialogDescription>
              Crie um perfil personalizado para um tipo específico de negócio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código (identificador único)</Label>
              <Input
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="ex: clinica_saude"
              />
            </div>

            <div className="space-y-2">
              <Label>Nome do Perfil</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ex: Clínica de Saúde"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descreva o tipo de negócio e como o CRM deve adaptar-se..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basear em</Label>
                <Select
                  value={createForm.profile_type}
                  onValueChange={(value: ActivityProfileType) =>
                    setCreateForm((prev) => ({ ...prev, profile_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={createForm.color}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={createForm.color}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateProfile}
              disabled={createProfile.isPending}
            >
              {createProfile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
