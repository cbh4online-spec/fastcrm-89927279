import { useState } from 'react';
import { AlertTriangle, X, ChevronRight, Users, Phone, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useInactivityAlerts, type InactivityAlert } from '@/hooks/useMeetingAutomations';
import { cn } from '@/lib/utils';

interface InactivityAlertsBannerProps {
  className?: string;
}

const alertTypeConfig: Record<InactivityAlert['alert_type'], {
  icon: typeof Users;
  label: string;
  color: string;
}> = {
  no_followup: {
    icon: Phone,
    label: 'Sem follow-up',
    color: 'text-orange-500',
  },
  no_contact: {
    icon: Users,
    label: 'Sem contacto',
    color: 'text-yellow-500',
  },
  stale_opportunity: {
    icon: FileText,
    label: 'Oportunidade parada',
    color: 'text-red-500',
  },
  overdue_task: {
    icon: CheckCircle,
    label: 'Tarefa atrasada',
    color: 'text-purple-500',
  },
};

export function InactivityAlertsBanner({ className }: InactivityAlertsBannerProps) {
  const { alerts, isLoading, acknowledgeAlert, dismissAlert } = useInactivityAlerts();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  if (isLoading || alerts.length === 0) return null;

  return (
    <Card className={cn(
      "border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20",
      className
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 -ml-2 hover:bg-orange-100 dark:hover:bg-orange-950">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                Alertas de Inatividade
              </span>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                {alerts.length}
              </Badge>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-90"
              )} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {alerts.map(alert => {
              const config = alertTypeConfig[alert.alert_type];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-background rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            há {alert.days_inactive} dias
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {alert.message || `${alert.entity_count} ${alert.entity_type}(s) sem follow-up há ${alert.days_inactive} dias`}
                        </p>
                        
                        {expandedAlert === alert.id && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Entidades afetadas: {alert.entity_count}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedAlert(
                          expandedAlert === alert.id ? null : alert.id
                        )}
                        className="text-xs"
                      >
                        {expandedAlert === alert.id ? 'Menos' : 'Ver mais'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs"
                      >
                        Resolver
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissAlert(alert.id)}
                        className="h-8 w-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
