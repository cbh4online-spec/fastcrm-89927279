import { memo } from "react";
import { Users } from "lucide-react";
import { useOnlinePresence, type OnlineUser } from "@/hooks/useOnlinePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const OnlineUserRow = memo(function OnlineUserRow({ user }: { user: OnlineUser }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="relative">
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px] font-medium bg-muted">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <span className="text-sm truncate">{user.full_name || "Utilizador"}</span>
    </div>
  );
});

export const OnlineUsersIndicator = memo(function OnlineUsersIndicator() {
  const { onlineUsers, onlineCount } = useOnlinePresence();
  const { t } = useTranslation("common");

  if (onlineCount === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <div className="relative">
            <Users className="h-3.5 w-3.5" />
            <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="hidden sm:inline tabular-nums">{onlineCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Online agora ({onlineCount})
        </p>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {onlineUsers.map((u) => (
            <OnlineUserRow key={u.user_id} user={u} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
