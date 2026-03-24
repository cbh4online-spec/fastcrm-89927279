import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefChangeAlerts } from "@/hooks/useAccountBriefChangeAlerts";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck, Loader2, AlertTriangle, Info, Zap } from "lucide-react";
import { format } from "date-fns";

const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof Zap }> = {
  high: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle },
  medium: { color: "bg-amber-500/20 text-amber-600", icon: Zap },
  low: { color: "bg-blue-500/20 text-blue-500", icon: Info },
};

const RELEVANCE_LABELS: Record<string, string> = {
  commercial: "Comercialmente relevante",
  informative: "Informativo",
  technical: "Técnico",
};

export default function AccountBriefAlertsPage() {
  const navigate = useNavigate();
  const { alerts, isLoading, unreadCount, markRead, markAllRead } = useAccountBriefChangeAlerts();

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Alertas de Mudança"
            description={`${unreadCount} alertas por ler`}
            actions={unreadCount > 0 ? [
              { label: "Marcar tudo como lido", icon: <CheckCheck className="w-4 h-4" />, onClick: () => markAllRead.mutate(), variant: "outline" as const },
            ] : []}
          />

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : alerts.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum alerta de mudança ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Os alertas serão gerados após reanálises de contas na watchlist.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                const SevIcon = sev.icon;
                return (
                  <Card
                    key={alert.id}
                    className={`border-0 shadow-lg transition-all cursor-pointer ${!alert.is_read ? "ring-1 ring-indigo-500/30 bg-indigo-500/5" : ""}`}
                    onClick={() => {
                      if (!alert.is_read) markRead.mutate(alert.id);
                      navigate(`/dashboard/account-brief/accounts/${alert.account_id}`);
                    }}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${sev.color} shrink-0 mt-0.5`}>
                          <SevIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{alert.title}</p>
                            {!alert.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                          </div>
                          {alert.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{alert.summary}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {(alert as any).account_brief_accounts?.name || "—"}
                            </Badge>
                            <Badge className={`text-xs ${sev.color}`}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {RELEVANCE_LABELS[alert.commercial_relevance] || alert.commercial_relevance}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
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
