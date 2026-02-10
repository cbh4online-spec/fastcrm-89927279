import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield, Crown } from "lucide-react";
import { useState } from "react";

export function CommunityMembersList() {
  const { data: members = [], isLoading } = useWorkspaceMembers();
  const [search, setSearch] = useState("");

  const filtered = search
    ? members.filter(m => m.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || m.profile?.email?.toLowerCase().includes(search.toLowerCase()))
    : members;

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-3 w-3 text-yellow-500" />;
    if (role === "admin") return <Shield className="h-3 w-3 text-primary" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar membros..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-full bg-muted/40 h-10"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">A carregar membros...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(m.profile?.full_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{m.profile?.full_name || "Utilizador"}</p>
                  {roleIcon(m.role)}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{m.profile?.email || ""}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.role}</Badge>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum membro encontrado</p>
      )}
    </div>
  );
}
