import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  Loader2,
  Crown,
  Shield,
  User,
  Eye,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface WorkspaceMembersPanelProps {
  workspaceId: string | null;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", icon: Crown, color: "text-amber-500" },
  { value: "admin", label: "Admin", icon: Shield, color: "text-blue-500" },
  { value: "agent", label: "Agente", icon: User, color: "text-green-500" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-gray-500" },
  { value: "agency", label: "Agency", icon: Building2, color: "text-purple-500" },
];

export function WorkspaceMembersPanel({ 
  workspaceId, 
  workspaceName, 
  open, 
  onOpenChange 
}: WorkspaceMembersPanelProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<string>("viewer");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  
  const queryClient = useQueryClient();

  // Get workspace members
  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members-admin", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data: membersData, error } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, created_at")
        .eq("workspace_id", workspaceId);
      
      if (error) throw error;

      // Get emails from profiles
      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return membersData.map(m => ({
        ...m,
        email: emailMap.get(m.user_id) || "Email desconhecido"
      })) as Member[];
    },
    enabled: !!workspaceId && open,
  });

  // Search user by email
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["user-search-member", searchEmail],
    queryFn: async () => {
      if (!searchEmail || searchEmail.length < 3) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", `%${searchEmail}%`)
        .limit(5);
      
      if (error) throw error;
      
      // Filter out existing members
      const existingIds = new Set(members?.map(m => m.user_id) || []);
      return data.filter(u => !existingIds.has(u.id));
    },
    enabled: searchEmail.length >= 3 && open,
  });

  type WorkspaceRole = "admin" | "agency" | "agent" | "owner" | "viewer";

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      const { data, error } = await supabase.rpc("add_workspace_member_admin", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_role: role,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId, role }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-admin", workspaceId] });
      setSearchEmail("");
      toast.success("Membro adicionado com sucesso");

      supabase.rpc("log_admin_action", {
        p_action_type: "member_added",
        p_target_type: "workspace_member",
        p_target_id: userId,
        p_workspace_id: workspaceId,
        p_details: { user_id: userId, role, workspace_id: workspaceId },
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar membro: " + error.message);
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: WorkspaceRole }) => {
      const { data, error } = await supabase.rpc("update_workspace_member_role_admin", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_new_role: newRole,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { userId, newRole }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-admin", workspaceId] });
      toast.success("Role atualizada com sucesso");

      supabase.rpc("log_admin_action", {
        p_action_type: "member_role_updated",
        p_target_type: "workspace_member",
        p_target_id: userId,
        p_workspace_id: workspaceId,
        p_details: { user_id: userId, new_role: newRole, workspace_id: workspaceId },
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc("remove_workspace_member_admin", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-admin", workspaceId] });
      setMemberToRemove(null);
      toast.success("Membro removido com sucesso");

      supabase.rpc("log_admin_action", {
        p_action_type: "member_removed",
        p_target_type: "workspace_member",
        p_target_id: userId,
        p_workspace_id: workspaceId,
        p_details: { user_id: userId, workspace_id: workspaceId },
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover membro: " + error.message);
    },
  });

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[3];
  };

  const getRoleBadge = (role: string) => {
    const info = getRoleInfo(role);
    const Icon = info.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${info.color}`} />
        {info.label}
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros de {workspaceName}
            </SheetTitle>
            <SheetDescription>
              Gerir membros e permissões do workspace
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Add Member Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Adicionar Membro</h4>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-32">
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

              {searchLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A pesquisar...
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="border rounded-md divide-y">
                  {searchResults.map((user) => (
                    <div 
                      key={user.id}
                      className="p-2 flex items-center justify-between hover:bg-accent"
                    >
                      <span className="text-sm">{user.email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addMember.mutate({ userId: user.id, role: newMemberRole as WorkspaceRole })}
                        disabled={addMember.isPending}
                      >
                        {addMember.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchEmail.length >= 3 && !searchLoading && searchResults?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum utilizador encontrado (ou já é membro)
                </p>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Membros Atuais ({members?.length || 0})</h4>
              
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members?.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="text-sm">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => 
                              updateRole.mutate({ userId: member.user_id, newRole: newRole as WorkspaceRole })
                            }
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="h-8 w-28">
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
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(member.created_at), "dd/MM/yy", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {members?.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum membro encontrado
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres remover <strong>{memberToRemove?.email}</strong> deste workspace?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMember.mutate(memberToRemove.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
