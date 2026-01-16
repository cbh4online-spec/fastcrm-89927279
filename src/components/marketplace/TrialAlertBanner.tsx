import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrialAlert, TrialStatus } from "@/hooks/useModuleTrial";

interface TrialAlertBannerProps {
  alert: TrialAlert;
  trialStatus: TrialStatus;
  moduleName: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const ALERT_CONFIG = {
  usage_70: {
    icon: TrendingUp,
    variant: "default" as const,
    title: "A usar bem o trial!",
    bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    iconClass: "text-amber-600",
  },
  usage_90: {
    icon: AlertTriangle,
    variant: "default" as const,
    title: "Trial quase no fim",
    bgClass: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
    iconClass: "text-orange-600",
  },
  last_use: {
    icon: Zap,
    variant: "destructive" as const,
    title: "Última utilização gratuita",
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    iconClass: "text-red-600",
  },
  trial_expiring: {
    icon: Clock,
    variant: "default" as const,
    title: "Trial a expirar",
    bgClass: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
    iconClass: "text-amber-600",
  },
  trial_expired: {
    icon: AlertTriangle,
    variant: "destructive" as const,
    title: "Trial expirado",
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    iconClass: "text-red-600",
  },
};

export function TrialAlertBanner({
  alert,
  trialStatus,
  moduleName,
  onUpgrade,
  onDismiss,
}: TrialAlertBannerProps) {
  const config = ALERT_CONFIG[alert.type];
  const Icon = config.icon;

  const valueMessage = trialStatus.value_generated?.time_saved_hours
    ? `Este módulo já te poupou ~${trialStatus.value_generated.time_saved_hours}h de trabalho.`
    : trialStatus.value_generated?.actions_completed
    ? `Já realizaste ${trialStatus.value_generated.actions_completed} ações com este módulo.`
    : null;

  return (
    <Alert className={cn("relative", config.bgClass)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <Icon className={cn("h-5 w-5", config.iconClass)} />
      
      <AlertTitle className="flex items-center gap-2">
        {config.title}
      </AlertTitle>
      
      <AlertDescription className="space-y-3">
        <p className="text-sm">{alert.message}</p>
        
        {trialStatus.uses_limit && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Utilizações</span>
              <span>{trialStatus.uses_consumed}/{trialStatus.uses_limit}</span>
            </div>
            <Progress 
              value={trialStatus.usage_percent} 
              className="h-2"
            />
          </div>
        )}
        
        {valueMessage && (
          <p className="text-sm font-medium text-foreground">
            {valueMessage}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button size="sm" onClick={onUpgrade}>
            <Zap className="w-4 h-4 mr-1" />
            Ativar {moduleName}
          </Button>
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Mais tarde
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
