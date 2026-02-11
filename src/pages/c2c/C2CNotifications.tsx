import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useC2CNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useC2CNotifications";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ArrowLeft, Bell, Heart, MessageCircle, HandCoins, Eye, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  new_message: <MessageCircle className="h-4 w-4 text-blue-500" />,
  new_offer: <HandCoins className="h-4 w-4 text-green-500" />,
  new_favorite: <Heart className="h-4 w-4 text-pink-500" />,
  listing_view_milestone: <Eye className="h-4 w-4 text-purple-500" />,
  offer_accepted: <HandCoins className="h-4 w-4 text-green-600" />,
  offer_rejected: <HandCoins className="h-4 w-4 text-red-500" />,
};

export default function C2CNotifications() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { data: notifications = [], isLoading } = useC2CNotifications(workspaceId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead(workspaceId);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.listing_id) {
      navigate(`/dashboard/c2c/${notification.listing_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Atividade</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="gap-1">
              <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Sem notificações por agora.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-4 rounded-lg transition-colors hover:bg-muted/50",
                  !n.is_read && "bg-primary/5"
                )}
              >
                <div className="mt-0.5">
                  {typeIcons[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.is_read && "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pt })}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
