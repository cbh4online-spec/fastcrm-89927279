import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefNotifications } from "@/hooks/useAccountBriefNotifications";
import { Bell, BellOff, Check, Clock, Loader2, AlertCircle, TrendingUp, Zap, Eye, FileText, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  comercial: { icon: TrendingUp, color: "text-emerald-500", label: "Comercial" },
  operacional: { icon: Zap, color: "text-blue-500", label: "Operacional" },
  "técnico": { icon: AlertCircle, color: "text-orange-500", label: "Técnico" },
  consumo: { icon: FileText, color: "text-purple-500", label: "Consumo" },
  score: { icon: TrendingUp, color: "text-indigo-500", label: "Score" },
  "mudança de site": { icon: Eye, color: "text-amber-500", label: "Mudança" },
  watchlist: { icon: Eye, color: "text-teal-500", label: "Watchlist" },
  outreach: { icon: Mail, color: "text-rose-500", label: "Outreach" },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive",
  high: "bg-orange-500/20 text-orange-500",
  medium: "bg-amber-500/20 text-amber-500",
  low: "bg-muted text-muted-foreground",
};

export default function AccountBriefNotificationsPage() {
  const { notifications, isLoading, markRead, snooze, mute, unreadCount } = useAccountBriefNotifications();

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <PageHeader
            title="Notificações"
            description="Alertas e eventos do Account Brief"
            count={unreadCount}
          />

          {notifications.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">Sem notificações</h3>
                <p className="text-sm text-muted-foreground">Será notificado quando houver eventos relevantes.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.operacional;
                const Icon = cfg.icon;
                return (
                  <Card key={n.id} className={cn("border-0 shadow-sm transition-all", !n.is_read && "bg-primary/5 shadow-md")}>
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 shrink-0", cfg.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-sm font-medium", !n.is_read && "font-semibold")}>{n.title}</p>
                            <Badge className={cn("text-[10px]", PRIORITY_BADGE[n.priority])}>{n.priority}</Badge>
                            <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                          </div>
                          {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.is_read && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead.mutate(n.id)} title="Marcar como lido">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => snooze.mutate({ id: n.id, days: 1 })} title="Snooze 24h">
                            <Clock className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => mute.mutate(n.id)} title="Silenciar">
                            <BellOff className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
