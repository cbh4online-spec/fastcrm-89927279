import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  CalendarPlus,
  MessageSquare,
  TrendingUp,
  Eye,
} from "lucide-react";
import type { PackageAlert } from "@/types/entitlement";

interface PackageAlertCardProps {
  alert: PackageAlert;
  onAction?: (action: string, alert: PackageAlert) => void;
  compact?: boolean;
}

const alertIcons: Record<string, React.ReactNode> = {
  low_remaining: <AlertTriangle className="h-4 w-4" />,
  expiring_soon: <Clock className="h-4 w-4" />,
  inactive: <XCircle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  expired: <XCircle className="h-4 w-4" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  create_task: <CalendarPlus className="h-3 w-3" />,
  create_opportunity: <TrendingUp className="h-3 w-3" />,
  send_message: <MessageSquare className="h-3 w-3" />,
  view_package: <Eye className="h-3 w-3" />,
};

const severityStyles: Record<string, string> = {
  info: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30",
  warning: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30",
  error: "border-destructive/50 bg-destructive/10",
};

const severityBadgeStyles: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  warning: "outline",
  error: "destructive",
};

export function PackageAlertCard({ alert, onAction, compact = false }: PackageAlertCardProps) {
  if (compact) {
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border ${severityStyles[alert.severity]}`}>
        <div className="mt-0.5 text-muted-foreground">
          {alertIcons[alert.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{alert.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
        </div>
        {alert.actions.length > 0 && onAction && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onAction(alert.actions[0].action, alert)}
          >
            {actionIcons[alert.actions[0].action]}
            <span className="ml-1">{alert.actions[0].label}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-4 ${severityStyles[alert.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {alertIcons[alert.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{alert.title}</h4>
            <Badge variant={severityBadgeStyles[alert.severity]} className="text-xs">
              {alert.productName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
          
          {alert.actions.length > 0 && onAction && (
            <div className="flex flex-wrap gap-2">
              {alert.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={idx === 0 ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => onAction(action.action, alert)}
                >
                  {actionIcons[action.action]}
                  <span className="ml-1">{action.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
