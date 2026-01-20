import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { WorkspaceMembersPanel } from "./WorkspaceMembersPanel";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
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

export function UsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [addToWorkspaceOpen, setAddToWorkspaceOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [targetRole, setTargetRole] = useState("viewer");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [membershipToRemove, setMembershipToRemove] = useState<{ userId: string; workspaceId: string; workspaceName: string } | null>(null);

  const queryClient = useQueryClient();

  // Fetch all profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["super-admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, avatar_url, created_at")
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-memberships"] });
      setAddToWorkspaceOpen(false);
      setSelectedUser(null);
      setTargetWorkspaceId("");
      setTargetRole("viewer");
      toast.success("Utilizador adicionado ao workspace");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-memberships"] });
      setRemoveConfirmOpen(false);
      setMembershipToRemove(null);
      toast.success("Utilizador removido do workspace");
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
    
    return matchesSearch && matchesRole;
  });

  const isLoading = profilesLoading || membershipsLoading;
  const totalUsers = enrichedUsers.length;
  const ownersCount = enrichedUsers.filter(u => u.memberships.some(m => m.role === "owner")).length;
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

  const getInitials = (user: EnrichedUser) => {
    const name = user.profile?.full_name || user.profile?.email || "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openAddToWorkspace = (user: EnrichedUser) => {
    setSelectedUser(user);
    setAddToWorkspaceOpen(true);
  };

  const openRemoveConfirm = (userId: string, workspaceId: string, workspaceName: string) => {
    setMembershipToRemove({ userId, workspaceId, workspaceName });
    setRemoveConfirmOpen(true);
  };

  // Get workspaces user is NOT in
  const availableWorkspaces = selectedUser 
    ? (allWorkspaces || []).filter(ws => !selectedUser.memberships.some(m => m.workspace_id === ws.id))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
          <p className="text-muted-foreground">
            Gestão global de utilizadores e membros de workspaces
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
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
                <p className="text-sm text-muted-foreground">Owners</p>
                <p className="text-3xl font-bold">{ownersCount}</p>
              </div>
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Memberships</p>
                <p className="text-3xl font-bold">{memberships?.length || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
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
              <SelectTrigger className="w-40">
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAddToWorkspace(user)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar a workspace
                          </DropdownMenuItem>
                          {user.memberships.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Remover de...
                              </div>
                              {user.memberships.map((m) => (
                                <DropdownMenuItem 
                                  key={m.workspace_id}
                                  onClick={() => openRemoveConfirm(user.userId, m.workspace_id, m.workspace_name)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {m.workspace_name}
                                </DropdownMenuItem>
                              ))}
                            </>
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
              <label className="text-sm font-medium">Workspace</label>
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
              <label className="text-sm font-medium">Role</label>
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
              {addToWorkspace.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Adicionar
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
    </div>
  );
}
