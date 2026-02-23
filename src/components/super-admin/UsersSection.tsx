import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  RefreshCw,
  Users,
  ShieldCheck,
  Building2,
  MoreHorizontal,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  Mail,
  Key,
  Ban,
  CheckCircle,
  PauseCircle,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { WorkspaceMembersPanel } from "./WorkspaceMembersPanel";
import { CreateUserWithWorkspaceDialog } from "./CreateUserWithWorkspaceDialog";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  status?: string;
}

interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  workspace_name: string;
}

interface EnrichedUser {
  userId: string;
  profile: UserProfile | null;
  memberships: WorkspaceMembership[];
  isSuperAdmin: boolean;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", icon: Crown, color: "text-amber-500" },
  { value: "admin", label: "Admin", icon: Shield, color: "text-blue-500" },
  { value: "agent", label: "Agente", icon: User, color: "text-green-500" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-muted-foreground" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo", icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
  { value: "inactive", label: "Inativo", icon: PauseCircle, color: "text-muted-foreground", bgColor: "bg-muted" },
  { value: "suspended", label: "Suspenso", icon: Ban, color: "text-destructive", bgColor: "bg-destructive/10" },
];

export function UsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [addToWorkspaceOpen, setAddToWorkspaceOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [targetRole, setTargetRole] = useState("viewer");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [membershipToRemove, setMembershipToRemove] = useState<{ userId: string; workspaceId: string; workspaceName: string } | null>(null);
  
  // Password management
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Create user dialog
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all profiles
  const { data: profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
    queryKey: ["super-admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, avatar_url, created_at, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch all workspace memberships
  const { data: memberships, isLoading: membershipsLoading, refetch } = useQuery({
    queryKey: ["super-admin-memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          user_id,
          workspace_id,
          role,
          workspaces (id, name)
        `);

      if (error) throw error;
      return data;
    },
  });

  // Fetch super admins
  const { data: superAdmins } = useQuery({
    queryKey: ["super-admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (error) throw error;
      return new Set(data?.map(r => r.user_id) || []);
    },
  });

  // Fetch all workspaces for dropdown
  const { data: allWorkspaces } = useQuery({
    queryKey: ["super-admin-workspaces-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Add user to workspace mutation
  const addToWorkspace = useMutation({
    mutationFn: async ({ userId, workspaceId, role }: { userId: string; workspaceId: string; role: string }) => {
      const { data, error } = await supabase.rpc("add_workspace_member_admin", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_role: role as "admin" | "agency" | "agent" | "owner" | "viewer",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId, workspaceId, role }) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-memberships"] });
      setAddToWorkspaceOpen(false);
      setSelectedUser(null);
      setTargetWorkspaceId("");
      setTargetRole("viewer");
      toast.success("Utilizador adicionado ao workspace");

      supabase.rpc("log_admin_action", {
        p_action_type: "user_added_to_workspace",
        p_target_type: "workspace_member",
        p_target_id: userId,
        p_workspace_id: workspaceId,
        p_details: { user_id: userId, workspace_id: workspaceId, role },
      });
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Remove from workspace mutation
  const removeFromWorkspace = useMutation({
    mutationFn: async ({ userId, workspaceId }: { userId: string; workspaceId: string }) => {
      const { data, error } = await supabase.rpc("remove_workspace_member_admin", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-memberships"] });
      setRemoveConfirmOpen(false);
      setMembershipToRemove(null);
      toast.success("Utilizador removido do workspace");

      supabase.rpc("log_admin_action", {
        p_action_type: "user_removed_from_workspace",
        p_target_type: "workspace_member",
        p_target_id: userId,
        p_workspace_id: workspaceId,
        p_details: { user_id: userId, workspace_id: workspaceId },
      });
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Update user status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { data, error } = await supabase.rpc("update_user_status_admin", {
        p_user_id: userId,
        p_status: status,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId, status }) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-profiles"] });
      toast.success("Status atualizado com sucesso");

      supabase.rpc("log_admin_action", {
        p_action_type: "user_status_changed",
        p_target_type: "user",
        p_target_id: userId,
        p_details: { user_id: userId, new_status: status },
      });
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Set password mutation
  const setPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "set_password", userId, password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Palavra-passe alterada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Send password reset email mutation
  const sendPasswordReset = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "send_password_reset", userId, email },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Email de recuperação enviado");
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Build enriched users list
  const enrichedUsers: EnrichedUser[] = (profiles || []).map(profile => {
    const userMemberships = (memberships || [])
      .filter(m => m.user_id === profile.user_id)
      .map(m => ({
        workspace_id: m.workspace_id,
        role: m.role,
        workspace_name: (m.workspaces as any)?.name || "Unknown",
      }));

    return {
      userId: profile.user_id,
      profile,
      memberships: userMemberships,
      isSuperAdmin: superAdmins?.has(profile.user_id) || false,
    };
  });

  // Filter users
  const filteredUsers = enrichedUsers.filter((user) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      user.profile?.email?.toLowerCase().includes(searchLower) ||
      user.profile?.full_name?.toLowerCase().includes(searchLower) ||
      user.memberships.some(m => m.workspace_name.toLowerCase().includes(searchLower));
    
    const matchesRole = 
      roleFilter === "all" || 
      user.memberships.some(m => m.role === roleFilter) ||
      (roleFilter === "super_admin" && user.isSuperAdmin);

    const matchesStatus = 
      statusFilter === "all" || 
      (user.profile?.status || "active") === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const isLoading = profilesLoading || membershipsLoading;
  const totalUsers = enrichedUsers.length;
  const activeCount = enrichedUsers.filter(u => (u.profile?.status || "active") === "active").length;
  const suspendedCount = enrichedUsers.filter(u => u.profile?.status === "suspended").length;
  const superAdminCount = enrichedUsers.filter(u => u.isSuperAdmin).length;

  const getRoleBadge = (role: string) => {
    const info = ROLE_OPTIONS.find(r => r.value === role);
    if (!info) return <Badge variant="outline">{role}</Badge>;
    const Icon = info.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${info.color}`} />
        {info.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string = "active") => {
    const info = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = info.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${info.bgColor}`}>
        <Icon className={`h-3 w-3 ${info.color}`} />
        {info.label}
      </Badge>
    );
  };

  const getInitials = (user: EnrichedUser) => {
    const name = user.profile?.full_name || user.profile?.email || "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openAddToWorkspace = (user: EnrichedUser) => {
    setSelectedUser(user);
    setAddToWorkspaceOpen(true);
  };

  const openPasswordDialog = (user: EnrichedUser) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordDialogOpen(true);
  };

  const openRemoveConfirm = (userId: string, workspaceId: string, workspaceName: string) => {
    setMembershipToRemove({ userId, workspaceId, workspaceName });
    setRemoveConfirmOpen(true);
  };

  const handleSetPassword = () => {
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    setPassword.mutate({ userId: selectedUser.userId, password: newPassword });
  };

  // Get workspaces user is NOT in
  const availableWorkspaces = selectedUser 
    ? (allWorkspaces || []).filter(ws => !selectedUser.memberships.some(m => m.workspace_id === ws.id))
    : [];

  const handleRefresh = () => {
    refetch();
    refetchProfiles();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
          <p className="text-muted-foreground">
            Gestão global de utilizadores, permissões e acessos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Utilizador
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Utilizadores</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold">{activeCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspensos</p>
                <p className="text-3xl font-bold">{suspendedCount}</p>
              </div>
              <Ban className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-3xl font-bold">{superAdminCount}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou workspace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="owner">Owners</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="agent">Agentes</SelectItem>
                <SelectItem value="viewer">Viewers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Registado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {user.profile?.full_name || "Sem nome"}
                            {user.isSuperAdmin && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.profile?.email || "Sem email"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.profile?.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.slice(0, 2).map((m) => (
                          <Badge 
                            key={m.workspace_id} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-accent"
                            onClick={() => setSelectedWorkspace({ id: m.workspace_id, name: m.workspace_name })}
                          >
                            {m.workspace_name}
                          </Badge>
                        ))}
                        {user.memberships.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.memberships.length - 2}
                          </Badge>
                        )}
                        {user.memberships.length === 0 && (
                          <span className="text-xs text-muted-foreground">Sem workspaces</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(user.memberships.map(m => m.role))).slice(0, 2).map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.profile?.created_at 
                        ? format(new Date(user.profile.created_at), "dd/MM/yyyy", { locale: pt })
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {/* Password Management */}
                          <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                            <Key className="h-4 w-4 mr-2" />
                            Definir palavra-passe
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => user.profile?.email && sendPasswordReset.mutate({ 
                              userId: user.userId, 
                              email: user.profile.email 
                            })}
                            disabled={!user.profile?.email || sendPasswordReset.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Enviar reset por email
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Status Management */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <User className="h-4 w-4 mr-2" />
                              Alterar status
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuItem
                                  key={status.value}
                                  onClick={() => updateStatus.mutate({ userId: user.userId, status: status.value })}
                                  disabled={updateStatus.isPending || user.profile?.status === status.value}
                                >
                                  <status.icon className={`h-4 w-4 mr-2 ${status.color}`} />
                                  {status.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuSeparator />

                          {/* Workspace Management */}
                          <DropdownMenuItem onClick={() => openAddToWorkspace(user)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar a workspace
                          </DropdownMenuItem>
                          
                          {user.memberships.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover de...
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {user.memberships.map((m) => (
                                  <DropdownMenuItem 
                                    key={m.workspace_id}
                                    onClick={() => openRemoveConfirm(user.userId, m.workspace_id, m.workspace_name)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Building2 className="h-4 w-4 mr-2" />
                                    {m.workspace_name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum utilizador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Members Panel */}
      <WorkspaceMembersPanel
        workspaceId={selectedWorkspace?.id || null}
        workspaceName={selectedWorkspace?.name || ""}
        open={!!selectedWorkspace}
        onOpenChange={(open) => !open && setSelectedWorkspace(null)}
      />

      {/* Add to Workspace Dialog */}
      <Dialog open={addToWorkspaceOpen} onOpenChange={setAddToWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar a Workspace</DialogTitle>
            <DialogDescription>
              Adicionar {selectedUser?.profile?.full_name || selectedUser?.profile?.email} a um workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Workspace</Label>
              <Select value={targetWorkspaceId} onValueChange={setTargetWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableWorkspaces.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Este utilizador já pertence a todos os workspaces.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <span className="flex items-center gap-2">
                        <role.icon className={`h-3 w-3 ${role.color}`} />
                        {role.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToWorkspaceOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedUser && addToWorkspace.mutate({
                userId: selectedUser.userId,
                workspaceId: targetWorkspaceId,
                role: targetRole,
              })}
              disabled={!targetWorkspaceId || addToWorkspace.isPending}
            >
              {addToWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Palavra-passe</DialogTitle>
            <DialogDescription>
              Definir nova palavra-passe para {selectedUser?.profile?.full_name || selectedUser?.profile?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova palavra-passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar palavra-passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir palavra-passe"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSetPassword}
              disabled={!newPassword || !confirmPassword || setPassword.isPending}
            >
              {setPassword.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres remover este utilizador de <strong>{membershipToRemove?.workspaceName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => membershipToRemove && removeFromWorkspace.mutate({
                userId: membershipToRemove.userId,
                workspaceId: membershipToRemove.workspaceId,
              })}
            >
              {removeFromWorkspace.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <CreateUserWithWorkspaceDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
      />
    </div>
  );
}
