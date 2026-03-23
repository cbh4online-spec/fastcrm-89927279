import { useAIUsage } from "@/hooks/useAIUsage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

export function AIUsageBanner() {
  const { callsPct, callsUsed, callsIncluded, pendingOverage, isNearLimit, isAtLimit, plan } = useAIUsage();
  const navigate = useNavigate();

  if (plan === "free" || (!isNearLimit && pendingOverage === 0)) return null;

  return (
    <div className="px-4 py-2 border-b border-border">
      {isAtLimit ? (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="flex items-center justify-between">
            <span>Atingiste o limite de chamadas IA este mês ({callsIncluded} chamadas).</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/settings/billing")}>
              Fazer upgrade
            </Button>
          </AlertDescription>
        </Alert>
      ) : isNearLimit ? (
        <Alert className="py-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertDescription className="flex items-center gap-4">
            <span className="text-amber-800 dark:text-amber-200 text-sm">
              IA: {callsUsed}/{callsIncluded} chamadas usadas este mês ({callsPct}%)
            </span>
            <Progress value={callsPct} className="w-32 h-2" />
            {pendingOverage > 0 && (
              <span className="text-amber-700 dark:text-amber-300 text-xs">
                +€{pendingOverage.toFixed(2)} overage
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : pendingOverage > 0 ? (
        <div className="text-xs text-muted-foreground text-right px-2">
          IA extra este mês: €{pendingOverage.toFixed(2)}
        </div>
      ) : null}
    </div>
  );
}
