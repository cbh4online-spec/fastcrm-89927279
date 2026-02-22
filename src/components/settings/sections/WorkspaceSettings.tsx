import { useState, useEffect, useRef } from "react";
import { useWorkspace, WorkspaceRole } from "@/contexts/WorkspaceContext";
import { useWorkspaceMembers, WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
};

const roleColors: Record<WorkspaceRole, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-blue-500 text-white",
  agent: "bg-emerald-500 text-white",
  viewer: "bg-muted text-muted-foreground",
  agency: "bg-amber-500 text-white",
};

const editableRoles: WorkspaceRole[] = ["admin", "agent", "viewer"];

export function WorkspaceSettings({ searchQuery = "", matchedSections }: WorkspaceSettingsProps) {
  const { currentWorkspace } = useWorkspace();
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
  const [manualRole, setManualRole] = useState<WorkspaceRole>("agent");
  const [editRole, setEditRole] = useState<WorkspaceRole>("agent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load workspace details
  useEffect(() => {
    const loadDetails = async () => {
      if (currentWorkspace) {
        setWorkspaceName(currentWorkspace.name);
        setWorkspaceSlug(currentWorkspace.slug);
        
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
          workspaceId: currentWorkspace.id,
          domain: getPublicBaseUrl(),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar convite");

      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("agent");
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(error.message || "Erro ao enviar convite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManualMember = async () => {
    if (!manualName.trim() || !manualEmail.trim() || !currentWorkspace) return;

    setIsSubmitting(true);
    try {
      // First, create or get the user profile
      // Note: In production, you'd want to check if user exists first
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", manualEmail.trim())
        .maybeSingle();

      if (existingProfile) {
        // User exists, add them to workspace
        const { error: memberError } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: currentWorkspace.id,
            user_id: existingProfile.user_id,
            role: manualRole,
          });

        if (memberError) {
          if (memberError.code === "23505") {
            toast.error("Este utilizador já é membro do workspace");
          } else {
            throw memberError;
          }
        } else {
          toast.success("Membro adicionado com sucesso");
          refetchMembers();
        }
      } else {
        // For manual add without existing user, we'd need a different approach
        // For now, show a message to use invite instead
        toast.error("Utilizador não encontrado. Use a opção de convite para novos utilizadores.");
      }

      setAddManualDialogOpen(false);
      setManualName("");
      setManualEmail("");
      setManualRole("agent");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Erro ao adicionar membro");
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
        .update({ role: editRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast.success("Cargo atualizado com sucesso");
      refetchMembers();
      setEditMemberDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error updating member:", error);
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

      toast.success("Membro removido com sucesso");
      refetchMembers();
      setDeleteMemberDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Erro ao remover membro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (member: WorkspaceMember) => {
    setSelectedMember(member);
    setEditRole(member.role);
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
                    app.fastcrm.com/
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
              Adicione um utilizador existente ao workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
