import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  agency: "Agência",
  agent: "Vendas",
  viewer: "Visualizador",
};

export function TeamAvatarsWidget() {
  const { data: members, isLoading } = useWorkspaceMembers();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Equipa:</span>
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!members || members.length === 0) {
    return null;
  }
  
  // Show max 6 members, with +X indicator
  const visibleMembers = members.slice(0, 6);
  const hiddenCount = members.length - 6;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">Equipa:</span>
      <div className="flex -space-x-2">
        {visibleMembers.map((member) => {
          const name = member.profile?.full_name || member.profile?.email || 'Utilizador';
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          
          const handleClick = () => {
            navigate(`/dashboard/feed?user=${member.user_id}`);
          };
          
          return (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <Avatar 
                  className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                  onClick={handleClick}
                >
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role] || member.role}
                  </p>
                  <p className="text-xs text-primary mt-1">Clique para enviar mensagem</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                  +{hiddenCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>+{hiddenCount} outros membros</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
