import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { User } from "lucide-react";

interface AgentAssignDropdownProps {
  value: string | null;
  onChange: (agentId: string | null) => void;
}

export function AgentAssignDropdown({ value, onChange }: AgentAssignDropdownProps) {
  const { data: agents, isLoading } = useAgentMembers();

  const getInitials = (name: string | null | undefined) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <Select
      value={value || "unassigned"}
      onValueChange={(v) => onChange(v === "unassigned" ? null : v)}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Selecionar agente..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned" className="text-xs">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Sem atribuição</span>
          </div>
        </SelectItem>
        {agents?.map((agent) => (
          <SelectItem key={agent.user_id} value={agent.user_id} className="text-xs">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {getInitials(agent.profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>{agent.profile?.full_name || agent.profile?.email || "Agente"}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
