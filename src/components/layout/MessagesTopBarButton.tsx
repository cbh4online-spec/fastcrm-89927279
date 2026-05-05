import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useDirectMessages";

export function MessagesTopBarButton() {
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => navigate("/messages")}
          aria-label="Mensagens"
        >
          <MessageCircle className="h-4 w-4" />
          {unread > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full"
              variant="destructive"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Mensagens internas</p>
      </TooltipContent>
    </Tooltip>
  );
}
