import { useState, useEffect, useRef } from "react";
import { useWorkspace, WorkspaceRole, type WorkspaceUiMode } from "@/contexts/WorkspaceContext";
import { useWorkspaceMembers, WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  Shield,
  Palette,
  UserPlus,
  Trash2,
  Pencil,
  Plus,
  Loader2,
  LayoutGrid,
  UserCheck,
  ImagePlus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceLayoutConfigPanel } from "../WorkspaceLayoutConfigPanel";
import { ClientInviteTemplateEditor } from "./client-portal/ClientInviteTemplateEditor";

interface WorkspaceSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  agent: "Agente",
  viewer: "Visualizador",
  agency: "Agência",
  hr: "Recursos Humanos",
};

const roleColors: Record<WorkspaceRole, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-blue-500 text-white",
  agent: "bg-emerald-500 text-white",
  viewer: "bg-muted text-muted-foreground",
  agency: "bg-amber-500 text-white",
  hr: "bg-purple-500 text-white",
};

const editableRoles: WorkspaceRole[] = ["admin", "agent", "viewer"];

export type CommercialProfile = "vendedor" | "gestor" | "diretor" | "ceo";

const commercialProfileOptions: { value: CommercialProfile; label: string; description: string }[] = [
  { value: "vendedor", label: "Vendedor", description: "Foco individual em vendas e quota" },
  { value: "gestor", label: "Gestor", description: "Coordena equipa de vendas" },
  { value: "diretor", label: "Diretor", description: "Direção comercial e estratégia" },
  { value: "ceo", label: "CEO", description: "Liderança executiva da empresa" },
];

export function WorkspaceSettings({ searchQuery = "", matchedSections }: WorkspaceSettingsProps) {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useWorkspaceMembers();
  const { 
    updateWorkspaceInfo, 
    uploadLogo, 
    updateBranding, 
    fetchWorkspaceDetails,
    isUpdating,
    isUploading,
  } = useWorkspaceSettings();
  const queryClient = useQueryClient();
  const hasSearch = searchQuery.trim().length > 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addManualDialogOpen, setAddManualDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);

  // Form states - workspace info
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [uiMode, setUiMode] = useState<WorkspaceUiMode>("auto");
  const [savingUiMode, setSavingUiMode] = useState(false);
  
  // Form states - branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [brandingChanged, setBrandingChanged] = useState(false);

  // Form states - members
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("agent");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualRole, setManualRole] = useState<WorkspaceRole>("agent");
  const [editRole, setEditRole] = useState<WorkspaceRole>("agent");
  const [inviteCommercialProfile, setInviteCommercialProfile] = useState<CommercialProfile>("vendedor");
  const [manualCommercialProfile, setManualCommercialProfile] = useState<CommercialProfile>("vendedor");
  const [editCommercialProfile, setEditCommercialProfile] = useState<CommercialProfile>("vendedor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load workspace details
  useEffect(() => {
    const loadDetails = async () => {
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
        setWorkspaceSlug(currentWorkspace.slug);
        setUiMode(currentWorkspace.ui_mode ?? "auto");
        
        const details = await fetchWorkspaceDetails();
        if (details) {
          setLogoUrl(details.logo_url);
          setPrimaryColor(details.primary_color || "#6366f1");
          setSecondaryColor(details.secondary_color || "#8b5cf6");
        }
      }
    };
    loadDetails();
  }, [currentWorkspace?.id]);

  // Track branding changes
  useEffect(() => {
    setBrandingChanged(false);
  }, [currentWorkspace?.id]);

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const visibleSections = [
    { id: "workspace-info", show: shouldShow("workspace-info") },
    { id: "workspace-ui-mode", show: shouldShow("workspace-ui-mode") },
    { id: "workspace-users", show: shouldShow("workspace-users") },
    { id: "workspace-roles", show: shouldShow("workspace-roles") },
    { id: "workspace-branding", show: shouldShow("workspace-branding") },
    { id: "workspace-layout", show: shouldShow("workspace-layout") },
    { id: "workspace-client-portal", show: shouldShow("workspace-client-portal") },
  ];

  const hasVisibleSections = visibleSections.some(s => s.show);

  // Get current user's role - use workspace role from context as primary source
  const workspaceRole = currentWorkspace?.role;
  const canManageMembers = workspaceRole === "owner" || workspaceRole === "admin" || workspaceRole === "agency";

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;

    setIsSubmitting(true);
    try {
      const { getPublicBaseUrl } = await import("@/utils/getPublicDomain");
      const { data, error } = await supabase.functions.invoke("send-workspace-invite", {
        body: {
          email: inviteEmail.trim(),
          role: inviteRole,
          commercial_profile: inviteCommercialProfile,
          workspaceId: currentWorkspace.id,
          domain: getPublicBaseUrl(),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar convite");

      console.log(`[WORKSPACES] Invited member: ${inviteEmail} as ${inviteRole}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'MEMBER.INVITED',
        entity_kind: 'workspace_member',
        entity_id: currentWorkspace.id,
        source_module: 'admin-workspaces',
        payload: { email: inviteEmail.trim(), role: inviteRole },
      });

      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("agent");
      setInviteCommercialProfile("vendedor");
    } catch (error: any) {
      console.warn('[WORKSPACES] INVITE_FAILED', error.message || error);
      toast.error(error.message || "Erro ao enviar convite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManualMember = async () => {
    if (!manualEmail.trim() || !currentWorkspace) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-workspace-member", {
        body: {
          email: manualEmail.trim(),
          fullName: manualName.trim() || undefined,
          password: manualPassword.trim() || undefined,
          role: manualRole,
          commercial_profile: manualCommercialProfile,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) {
        const message = error.message?.includes("non-2xx")
          ? "Não foi possível criar o utilizador. Verifica se a palavra-passe cumpre a política de segurança ou deixa o campo vazio para gerar automaticamente."
          : error.message;
        throw new Error(message || "Erro ao adicionar membro");
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      console.log(`[WORKSPACES] Added member: ${data?.user_id} as ${manualRole}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'MEMBER.ADDED',
        entity_kind: 'workspace_member',
        entity_id: data?.user_id,
        source_module: 'admin-workspaces',
        payload: { user_id: data?.user_id, role: manualRole },
      });
      toast.success("Membro adicionado com sucesso");
      refetchMembers();

      setAddManualDialogOpen(false);
      setManualName("");
      setManualEmail("");
      setManualPassword("");
      setManualRole("agent");
      setManualCommercialProfile("vendedor");
    } catch (error) {
      console.warn('[WORKSPACES] ADD_MEMBER_FAILED', (error as Error).message);
      toast.error("Erro ao adicionar membro: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMemberRole = async () => {
    if (!selectedMember || !currentWorkspace) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: editRole, commercial_profile: editCommercialProfile })
        .eq("id", selectedMember.id);

      if (error) throw error;

      console.log(`[WORKSPACES] Updated role for member: ${selectedMember.id} to ${editRole}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'ROLE.UPDATED',
        entity_kind: 'workspace_member',
        entity_id: selectedMember.id,
        source_module: 'admin-workspaces',
        payload: { member_id: selectedMember.id, new_role: editRole },
      });

      toast.success("Cargo atualizado com sucesso");
      refetchMembers();
      setEditMemberDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.warn('[WORKSPACES] UPDATE_ROLE_FAILED', (error as Error).message);
      toast.error("Erro ao atualizar cargo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !currentWorkspace) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", selectedMember.id);

      if (error) throw error;

      console.log(`[WORKSPACES] Removed member: ${selectedMember.id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'MEMBER.REMOVED',
        entity_kind: 'workspace_member',
        entity_id: selectedMember.id,
        source_module: 'admin-workspaces',
        payload: { member_id: selectedMember.id },
      });

      toast.success("Membro removido com sucesso");
      refetchMembers();
      setDeleteMemberDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.warn('[WORKSPACES] REMOVE_MEMBER_FAILED', (error as Error).message);
      toast.error("Erro ao remover membro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (member: WorkspaceMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setEditCommercialProfile(((member as any).commercial_profile as CommercialProfile) || "vendedor");
    setEditMemberDialogOpen(true);
  };

  const openDeleteDialog = (member: WorkspaceMember) => {
    setSelectedMember(member);
    setDeleteMemberDialogOpen(true);
  };

  // Workspace info handlers
  const handleSaveWorkspaceInfo = async () => {
    await updateWorkspaceInfo({
      name: workspaceName,
      slug: workspaceSlug,
    });
  };

  const handleSaveUiMode = async (next: WorkspaceUiMode) => {
    if (!currentWorkspace) return;
    setSavingUiMode(true);
    setUiMode(next);
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ ui_mode: next } as any)
        .eq("id", currentWorkspace.id);
      if (error) throw error;
      toast.success("Modo de interface atualizado. Recarregue para aplicar.");
      await refreshWorkspaces?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar modo de interface");
    } finally {
      setSavingUiMode(false);
    }
  };

  // Branding handlers
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newLogoUrl = await uploadLogo(file);
    if (newLogoUrl) {
      setLogoUrl(newLogoUrl);
      setBrandingChanged(true);
    }
  };

  const handleSaveBranding = async () => {
    const success = await updateBranding({
      logo_url: logoUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });
    if (success) {
      setBrandingChanged(false);
    }
  };

  if (!hasVisibleSections && hasSearch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma definição encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Information */}
      {shouldShow("workspace-info") && (
        <SettingsSection
          title="Informação do Workspace"
          description="Dados básicos do seu espaço de trabalho"
          icon={<Building2 className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Nome do Workspace</Label>
                <Input
                  id="workspaceName"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspaceSlug">URL do Workspace</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                    fastcrm.metodopare.ai/
                  </span>
                  <Input
                    id="workspaceSlug"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={handleSaveWorkspaceInfo}
              disabled={isUpdating || !workspaceName.trim() || !workspaceSlug.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                "Guardar alterações"
              )}
            </Button>
          </div>
        </SettingsSection>
      )}

      {/* UI Mode (LeadChef-only override) */}
      {shouldShow("workspace-ui-mode") && canManageMembers && (
        <SettingsSection
          title="Modo de interface"
          description="Controla se este workspace mostra o FastCRM completo ou apenas o LeadChef."
          icon={<LayoutGrid className="h-5 w-5" />}
        >
          <div className="space-y-3 max-w-md">
            <Label>Modo</Label>
            <Select
              value={uiMode}
              onValueChange={(v) => handleSaveUiMode(v as WorkspaceUiMode)}
              disabled={savingUiMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (decidido pelos módulos instalados)</SelectItem>
                <SelectItem value="fastcrm">FastCRM completo</SelectItem>
                <SelectItem value="leadchef">Apenas LeadChef</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Em modo <strong>Apenas LeadChef</strong>, o workspace mostra só o módulo LeadChef
              (mais Inbox, Calendário e Definições) com branding LeadChef. Recarregue a página para aplicar.
            </p>
          </div>
        </SettingsSection>
      )}

      {/* Team Members */}
      {shouldShow("workspace-users") && (
        <SettingsSection
          title="Utilizadores"
          description="Gerir membros da equipa e convites"
          icon={<Users className="h-5 w-5" />}
        >
          <div className="space-y-4">
            {canManageMembers && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddManualDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar membro
                </Button>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Convidar membro
                </Button>
              </div>
            )}

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro encontrado
              </div>
            ) : (
              <div className="divide-y divide-border">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {(member.profile?.full_name || member.profile?.email || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profile?.full_name || "Utilizador sem nome"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.profile?.email || "Sem email"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                      {canManageMembers && member.role !== "owner" && member.user_id !== user?.id && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SettingsSection>
      )}

      {/* Roles & Permissions */}
      {shouldShow("workspace-roles") && (
        <SettingsSection
          title="Cargos & Permissões"
          description="Configurar o que cada cargo pode fazer"
          icon={<Shield className="h-5 w-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(roleLabels) as [WorkspaceRole, string][])
              .filter(([role]) => role !== "agency")
              .map(([role, label]) => (
              <div key={role} className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={roleColors[role]}>{label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {role === "owner" && "Acesso total a todas as definições, faturação e pode eliminar o workspace"}
                  {role === "admin" && "Pode gerir membros, definições e todos os dados do workspace"}
                  {role === "agent" && "Pode criar, editar e gerir contactos, leads e oportunidades"}
                  {role === "viewer" && "Acesso apenas de leitura aos dados do workspace"}
                </p>
              </div>
            ))}
          </div>
        </SettingsSection>
      )}

      {/* Branding */}
      {shouldShow("workspace-branding") && (
        <SettingsSection
          title="Marca & Aparência"
          description="Personalizar cores e logótipo"
          icon={<Palette className="h-5 w-5" />}
        >
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="flex items-start gap-6">
              <div 
                className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                ) : logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-2" 
                  />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label>Logótipo da Empresa</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A carregar...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Carregar Imagem
                      </>
                    )}
                  </Button>
                  {logoUrl && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setLogoUrl(null);
                        setBrandingChanged(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, SVG ou WebP. Máximo 2MB.
                </p>
              </div>
            </div>

            {/* Color Pickers */}
            <div className="space-y-4">
              <Label>Cores da Marca</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor" className="text-sm font-normal text-muted-foreground">
                    Cor Primária
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        id="primaryColor"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setBrandingChanged(true);
                        }}
                        className="w-12 h-10 rounded-md border border-input cursor-pointer"
                      />
                    </div>
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setBrandingChanged(true);
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor" className="text-sm font-normal text-muted-foreground">
                    Cor Secundária
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={secondaryColor}
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          setBrandingChanged(true);
                        }}
                        className="w-12 h-10 rounded-md border border-input cursor-pointer"
                      />
                    </div>
                    <Input
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setBrandingChanged(true);
                      }}
                      className="flex-1 font-mono text-sm"
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveBranding}
              disabled={isUpdating || !brandingChanged}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                "Guardar Aparência"
              )}
            </Button>
          </div>
        </SettingsSection>
      )}

      {/* Layout Configuration */}
      {shouldShow("workspace-layout") && (
        <SettingsSection
          title="Layout do CRM"
          description="Configurar as secções visíveis nas páginas de detalhe"
          icon={<LayoutGrid className="h-5 w-5" />}
        >
          <WorkspaceLayoutConfigPanel />
        </SettingsSection>
      )}

      {/* Client Portal Template */}
      {shouldShow("workspace-client-portal") && (
        <SettingsSection
          title="Portal de Clientes B2B"
          description="Personalizar o template de convite para clientes"
          icon={<UserCheck className="h-5 w-5" />}
        >
          <ClientInviteTemplateEditor />
        </SettingsSection>
      )}

      {/* Danger Zone - always show if no search */}
      {!hasSearch && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis e destrutivas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar workspace
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Envie um convite por email para adicionar um novo membro à equipa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="email@empresa.pt"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Cargo</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteCommercialProfile">Perfil comercial</Label>
              <Select value={inviteCommercialProfile} onValueChange={(v) => setInviteCommercialProfile(v as CommercialProfile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commercialProfileOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteMember} disabled={isSubmitting || !inviteEmail.trim()}>
              {isSubmitting ? "A enviar..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Member Dialog */}
      <Dialog open={addManualDialogOpen} onOpenChange={setAddManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Crie um novo utilizador ou adicione um existente ao workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manualName">Nome completo</Label>
              <Input
                id="manualName"
                placeholder="João Silva"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualEmail">Email do utilizador</Label>
              <Input
                id="manualEmail"
                type="email"
                placeholder="email@empresa.pt"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualPassword">Palavra-passe (opcional)</Label>
              <Input
                id="manualPassword"
                type="text"
                placeholder="Deixe vazio para gerar automaticamente"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Se vazia, será gerada automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualRole">Cargo</Label>
              <Select value={manualRole} onValueChange={(v) => setManualRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualCommercialProfile">Perfil comercial</Label>
              <Select value={manualCommercialProfile} onValueChange={(v) => setManualCommercialProfile(v as CommercialProfile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commercialProfileOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManualDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddManualMember} disabled={isSubmitting || !manualEmail.trim()}>
              {isSubmitting ? "A adicionar..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Altere o cargo de {selectedMember?.profile?.full_name || "este membro"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Perfil comercial</Label>
              <Select value={editCommercialProfile} onValueChange={(v) => setEditCommercialProfile(v as CommercialProfile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commercialProfileOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateMemberRole} disabled={isSubmitting}>
              {isSubmitting ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <AlertDialog open={deleteMemberDialogOpen} onOpenChange={setDeleteMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover {selectedMember?.profile?.full_name || "este membro"} do workspace?
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
            >
              {isSubmitting ? "A remover..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
