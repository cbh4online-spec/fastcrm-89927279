import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { AdaptiveAlert, AlertLevel } from "@/data/adaptiveDashboardMock";

const levelConfig: Record<AlertLevel, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-destructive/5',
    border: 'border-destructive/30',
    text: 'text-destructive',
  },
  attention: {
    icon: AlertCircle,
    bg: 'bg-warning/5',
    border: 'border-warning/30',
    text: 'text-warning',
  },
  opportunity: {
    icon: Lightbulb,
    bg: 'bg-success/5',
    border: 'border-success/30',
    text: 'text-success',
  },
};

interface AlertBannerItemProps {
  alert: AdaptiveAlert;
  textSizeClass?: string;
}

function AlertBannerItem({ alert, textSizeClass = 'text-base' }: AlertBannerItemProps) {
  const navigate = useNavigate();
  const config = levelConfig[alert.level];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      config.bg, config.border,
    )}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-foreground", textSizeClass === 'text-lg' ? 'text-base' : 'text-sm')}>
          {alert.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
      </div>
      {alert.metric && (
        <span className={cn("text-sm font-bold shrink-0", config.text)}>{alert.metric}</span>
      )}
      {alert.actionLabel && alert.actionRoute && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1 text-xs"
          onClick={() => navigate(alert.actionRoute!)}
        >
          {alert.actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface AlertBannerListProps {
  alerts: AdaptiveAlert[];
  maxAlerts?: number;
  textSizeClass?: string;
}

export function AlertBannerList({ alerts, maxAlerts = 5, textSizeClass }: AlertBannerListProps) {
  const sorted = [...alerts].sort((a, b) => {
    const order: Record<AlertLevel, number> = { critical: 0, attention: 1, opportunity: 2 };
    return order[a.level] - order[b.level];
  });
  const visible = sorted.slice(0, maxAlerts);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(alert => (
        <AlertBannerItem key={alert.id} alert={alert} textSizeClass={textSizeClass} />
      ))}
    </div>
  );
}
