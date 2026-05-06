import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAssignableAgents, useAssignConversation, type AssignableAgent } from "@/hooks/useTeamPerformance";
import { UserPlus, Loader2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  conversationId: string;
  currentAssigneeId?: string | null;
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

function workloadBadge(status: string) {
  if (status === "overloaded") return <Badge variant="destructive" className="text-[10px]">Sobrecarregado</Badge>;
  if (status === "balanced") return <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">Equilibrado</Badge>;
  if (status === "available") return <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-500">Disponível</Badge>;
  return null;
}

export function AssignConversationButton({
  conversationId,
  currentAssigneeId,
  variant = "button",
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: agents, isLoading } = useAssignableAgents();
  const assign = useAssignConversation();
  const { user } = useAuth();

  const handleAssign = async (userId: string) => {
    await assign.mutateAsync({ conversationId, assigneeUserId: userId });
    setOpen(false);
  };

  const meAgent = agents?.find((a) => a.user_id === user?.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Atribuir conversa">
            <UserPlus className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size={size} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            {currentAssigneeId ? "Transferir" : "Atribuir"}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Atribuir a agente</span>
          {meAgent && meAgent.user_id !== currentAssigneeId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => handleAssign(meAgent.user_id)}
              disabled={assign.isPending}
            >
              <UserCheck className="h-3 w-3" />
              A mim
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !agents || agents.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">
              Nenhum agente disponível neste workspace.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {agents.map((a: AssignableAgent) => {
                const isCurrent = a.user_id === currentAssigneeId;
                return (
                  <li key={a.user_id}>
                    <button
                      onClick={() => handleAssign(a.user_id)}
                      disabled={assign.isPending || isCurrent}
                      className="w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={a.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(a.full_name || a.email || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {a.full_name || a.email || "Sem nome"}
                          </span>
                          {isCurrent && <Badge variant="outline" className="text-[9px]">Atual</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{a.open_conversations} conv.</span>
                          <span>·</span>
                          <span>{a.open_tickets} tickets</span>
                          <span>·</span>
                          <span>{a.workload_pct}%</span>
                        </div>
                      </div>
                      {workloadBadge(a.workload_status)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
