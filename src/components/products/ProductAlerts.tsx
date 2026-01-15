import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductAlert } from "@/types/product";

interface ProductAlertsProps {
  alerts: ProductAlert[];
  onDismiss?: (alert: ProductAlert) => void;
  compact?: boolean;
}

export function ProductAlerts({ alerts, onDismiss, compact = false }: ProductAlertsProps) {
  if (!alerts.length) return null;

  const getIcon = (severity: ProductAlert["severity"]) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (severity: ProductAlert["severity"]) => {
    switch (severity) {
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
              alert.severity === "error"
                ? "bg-destructive/10 text-destructive"
                : alert.severity === "warning"
                ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
            }`}
          >
            {getIcon(alert.severity)}
            <span className="flex-1">{alert.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Alert key={index} variant={getVariant(alert.severity) as any}>
          {getIcon(alert.severity)}
          <AlertTitle className="flex items-center justify-between">
            {alert.title}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={() => onDismiss(alert)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
