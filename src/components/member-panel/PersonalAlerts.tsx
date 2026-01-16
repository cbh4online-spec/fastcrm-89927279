import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Sparkles,
  X,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertItem } from '@/hooks/useMemberPanel';

interface PersonalAlertsProps {
  alerts: AlertItem[];
  isLoading?: boolean;
  onDismiss?: (id: string) => void;
}

const alertConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  ai_insight: { icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

export function PersonalAlerts({
  alerts,
  isLoading,
  onDismiss,
}: PersonalAlertsProps) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Bell className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Alertas & Insights</CardTitle>
              <p className="text-xs text-muted-foreground">
                {alerts.length} notificação{alerts.length !== 1 ? 'ões' : ''}
              </p>
            </div>
          </div>
          {alerts.length > 0 && (
            <Badge variant="secondary">{alerts.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <CheckCircle2 className="h-12 w-12 text-green-500/50 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Tudo em ordem!</p>
            <p className="text-sm text-muted-foreground/70">Sem alertas pendentes.</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="p-4 space-y-2">
              {alerts.map((alert) => {
                const config = alertConfig[alert.type] || alertConfig.info;
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all hover:shadow-sm group",
                      config.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-1.5 rounded-lg", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-medium">{alert.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {alert.message}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => onDismiss?.(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(alert.timestamp), { 
                            addSuffix: true,
                            locale: pt 
                          })}
                        </p>
                      </div>
                    </div>
                    {alert.actionUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs gap-1"
                      >
                        Ver detalhes
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
