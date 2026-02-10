import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientPermissions, ClientRole } from "@/hooks/client-portal/useClientPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const ROLE_LABELS: Record<ClientRole, string> = {
  client_admin: "Administrador",
  client_financial: "Financeiro",
  client_operational: "Operacional",
  client_viewer: "Visualizador",
};

const ROLE_COLORS: Record<ClientRole, string> = {
  client_admin: "bg-primary text-primary-foreground",
  client_financial: "bg-blue-100 text-blue-800",
  client_operational: "bg-green-100 text-green-800",
  client_viewer: "bg-muted text-muted-foreground",
};

export default function ClientTeamPage() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });
  const { canManageTeam, isLoading: permLoading } = useClientPermissions();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClientRole>("client_viewer");

  // Fetch team members (same company)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["client-team", clientUser?.company_id],
    queryFn: async () => {
      if (!clientUser?.company_id || !clientUser?.workspace_id) return [];

      const { data, error } = await supabase
        .from("client_users")
        .select("id, name, email, status, created_at")
        .eq("company_id", clientUser.company_id)
        .eq("workspace_id", clientUser.workspace_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch roles for each member
      const memberIds = data.map((m) => m.id);
      const { data: roles } = await supabase
        .from("client_user_roles")
        .select("client_user_id, role, spending_limit")
        .in("client_user_id", memberIds);

      return data.map((m) => ({
        ...m,
        roles: (roles ?? [])
          .filter((r) => r.client_user_id === m.id)
          .map((r) => ({ role: r.role as ClientRole, spending_limit: r.spending_limit })),
      }));
    },
    enabled: !!clientUser?.company_id,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!clientUser?.workspace_id || !clientUser?.company_id) throw new Error("Sem contexto");

      // 1. Create client_user record
      const { data: newUser, error: createError } = await supabase
        .from("client_users")
        .insert({
          workspace_id: clientUser.workspace_id,
          company_id: clientUser.company_id,
          name: inviteName,
          email: inviteEmail,
          status: "pending",
        })
        .select("id")
        .single();

      if (createError) throw createError;

      // 2. Create auth user via edge function
      const { data: authResult, error: authError } = await supabase.functions.invoke(
        "create-client-auth-user",
        {
          body: {
            email: inviteEmail,
            name: inviteName,
            workspaceId: clientUser.workspace_id,
            clientUserId: newUser.id,
          },
        }
      );

      if (authError) throw authError;

      // 3. Assign role
      const { error: roleError } = await supabase
        .from("client_user_roles")
        .insert({
          client_user_id: newUser.id,
          workspace_id: clientUser.workspace_id,
          role: inviteRole,
        });

      if (roleError) throw roleError;

      return { temporaryPassword: authResult?.data?.temporaryPassword };
    },
    onSuccess: (result) => {
      toast.success("Utilizador convidado com sucesso", {
        description: result.temporaryPassword
          ? `Password temporária: ${result.temporaryPassword}`
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["client-team"] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("client_viewer");
    },
    onError: (err: Error) => {
      toast.error("Erro ao convidar utilizador", { description: err.message });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: ClientRole }) => {
      if (!clientUser?.workspace_id) throw new Error("Sem contexto");

      // Upsert: delete existing roles and insert new one
      await supabase
        .from("client_user_roles")
        .delete()
        .eq("client_user_id", memberId);

      const { error } = await supabase
        .from("client_user_roles")
        .insert({
          client_user_id: memberId,
          workspace_id: clientUser.workspace_id,
          role,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      queryClient.invalidateQueries({ queryKey: ["client-team"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar papel", { description: err.message });
    },
  });

  if (permLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!canManageTeam) {
    return <Navigate to="/client/dashboard" replace />;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Equipa
            </h1>
            <p className="text-muted-foreground">Gerir utilizadores e permissões da sua empresa</p>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Utilizador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@empresa.com" type="email" />
                </div>
                <div>
                  <Label>Papel</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ClientRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as ClientRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteName || !inviteEmail || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enviar Convite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {members.map((member) => {
              const memberRole = member.roles[0]?.role ?? "client_viewer";
              const isCurrentUser = member.id === clientUser?.id;

              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.name}
                          {isCurrentUser && <span className="text-muted-foreground text-sm ml-2">(você)</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={member.status === "active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                      >
                        {member.status === "active" ? "Activo" : "Pendente"}
                      </Badge>

                      {isCurrentUser ? (
                        <Badge className={ROLE_COLORS[memberRole]}>{ROLE_LABELS[memberRole]}</Badge>
                      ) : (
                        <Select
                          value={memberRole}
                          onValueChange={(v) =>
                            updateRoleMutation.mutate({ memberId: member.id, role: v as ClientRole })
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABELS) as ClientRole[]).map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
