import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useLeadChefMembers,
  useUpdateLeadChefMemberRole,
  useRemoveLeadChefMember,
} from "@/hooks/leadchef/useLeadChefMembers";

const ROLES = ["owner", "admin", "agent", "viewer"];

export function LeadChefAccessManager({ workspaceId }: { workspaceId: string }) {
  const { data: members = [], isLoading } = useLeadChefMembers(workspaceId);
  const updateRole = useUpdateLeadChefMemberRole();
  const removeMember = useRemoveLeadChefMember();

  const handleRole = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ workspaceId, userId, role });
      toast.success("Role atualizado.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar role.");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remover este utilizador do workspace LeadChef?")) return;
    try {
      await removeMember.mutateAsync({ workspaceId, userId });
      toast.success("Utilizador removido.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Utilizadores LeadChef</CardTitle>
            <p className="text-xs text-muted-foreground">{members.length} membro{members.length === 1 ? "" : "s"}</p>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link to="/dashboard/leadchef/equipa"><UserPlus className="h-3.5 w-3.5" /> Convidar</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {!isLoading && members.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem utilizadores neste workspace.</p>
          )}
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.avatar_url ?? undefined} />
                    <AvatarFallback>{(m.display_name ?? m.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.display_name ?? m.email ?? m.user_id}</div>
                    {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.role} onValueChange={(v) => handleRole(m.user_id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(m.user_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
