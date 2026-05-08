import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeadChefTeamMembers } from "@/hooks/leadchef/useLeadChefTeamMembers";

interface Props {
  value: string | "all";
  onChange: (v: string | "all") => void;
  placeholder?: string;
  includeAll?: boolean;
}

export function LeadChefAgentFilter({ value, onChange, placeholder = "Filtrar agente", includeAll = true }: Props) {
  const { data: members } = useLeadChefTeamMembers();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as string | "all")}>
      <SelectTrigger className="bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Todos os agentes</SelectItem>}
        {members?.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
