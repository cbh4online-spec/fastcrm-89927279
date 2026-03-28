import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean | null;
  created_at: string | null;
}

export function ClientNotificationBadge() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => n.is_read === false).length;

  useEffect(() => {
    if (!clientUser?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("c2c_notifications")
        .select("id, title, body, type, is_read, created_at")
        .eq("user_id", clientUser.auth_user_id || "")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`client-notifications-${clientUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "c2c_notifications",
          filter: `user_id=eq.${clientUser.auth_user_id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientUser?.id, clientUser?.auth_user_id]);

  const markAsRead = async (id: string) => {
    await supabase.from("c2c_notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={cn(
                  "p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                  !n.is_read && "bg-primary/5"
                )}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className={cn(!n.is_read ? "" : "ml-4")}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
