import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  X,
  ChevronRight,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useSmartAlerts,
  useDismissAlert,
  useActionAlert,
  useMarkAlertRead,
  ALERT_CONFIGS,
  SmartAlert,
} from "@/hooks/useSmartAlerts";

interface SmartAlertsPopoverProps {
  className?: string;
}

export function SmartAlertsPopover({ className }: SmartAlertsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useSmartAlerts(10);
  const dismissAlert = useDismissAlert();
  const actionAlert = useActionAlert();
  const markRead = useMarkAlertRead();

  const unreadCount = alerts?.filter((a) => !a.is_read).length || 0;

  const handleAction = (alert: SmartAlert) => {
    actionAlert.mutate(alert.id);
    if (alert.action_url) {
      navigate(alert.action_url);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    alerts?.filter((a) => !a.is_read).forEach((alert) => {
      markRead.mutate(alert.id);
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative gap-2", className)}
        >
          <Bell className={cn("w-4 h-4", unreadCount > 0 && "text-amber-500")} />
          <span className="hidden sm:inline">Alertas</span>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Alertas Inteligentes</span>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllRead}
            >
              Marcar lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nenhum alerta pendente
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                const config = ALERT_CONFIGS[alert.alert_type];
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors",
                      !alert.is_read && "bg-primary/5"
                    )}
                    onMouseEnter={() => {
                      if (!alert.is_read) markRead.mutate(alert.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0",
                          config.bgColor
                        )}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn("text-sm font-medium", config.color)}>
                              {alert.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {alert.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissAlert.mutate(alert.id);
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                          {alert.action_label && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs gap-1"
                              onClick={() => handleAction(alert)}
                            >
                              {alert.action_label}
                              <ChevronRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {alerts && alerts.length > 0 && (
          <div className="px-4 py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                navigate("/dashboard/inbox");
                setIsOpen(false);
              }}
            >
              Ver todos os alertas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
