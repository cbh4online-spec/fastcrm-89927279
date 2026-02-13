/**
 * ObjectiveProgressBar - Inline progress indicator with expandable details
 */

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, XCircle, RefreshCw, Database } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ObjectiveProgressMetrics } from "@/hooks/useObjectiveProgress";
import { useObjectiveProgressDetails } from "@/hooks/useObjectiveProgress";

interface ObjectiveProgressBarProps {
  metrics: ObjectiveProgressMetrics;
}

export function ObjectiveProgressBar({ metrics }: ObjectiveProgressBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { recentCollected, recentFailed, avgAttempts, isLoading } = useObjectiveProgressDetails(
    isOpen ? metrics.objectiveId : null
  );

  if (metrics.total === 0) {
    return (
      <p className="text-xs text-muted-foreground italic mt-2">
        Sem dados de progresso
      </p>
    );
  }

  const progressColorClass =
    metrics.successRate > 70
      ? "[&>div]:bg-green-500"
      : metrics.successRate >= 30
      ? "[&>div]:bg-yellow-500"
      : "[&>div]:bg-destructive";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full mt-2 group cursor-pointer text-left">
          <div className="flex items-center gap-3">
            <Progress
              value={metrics.successRate}
              className={cn("h-2 flex-1", progressColorClass)}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {metrics.collected}/{metrics.total} recolhidos ({metrics.successRate}%)
            </span>
            {metrics.crmSynced > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                <Database className="h-3 w-3" />
                {metrics.crmSynced} CRM
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3 border-t pt-3 border-border/50">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">A carregar detalhes...</p>
        ) : (
          <>
            {/* Stats summary */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {metrics.collected} recolhidos
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                {metrics.failed} falhados
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                ~{avgAttempts} tentativas/conversa
              </span>
            </div>

            {/* Recent collected */}
            {recentCollected.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Últimos valores recolhidos</p>
                <div className="space-y-1">
                  {recentCollected.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground truncate max-w-[200px]">
                        {item.collected_value || "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {item.collected_at
                          ? format(new Date(item.collected_at), "dd MMM HH:mm", { locale: pt })
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent failures */}
            {recentFailed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1">Falhas recentes</p>
                <div className="space-y-1">
                  {recentFailed.map((item) => (
                    <div key={item.id} className="text-xs text-muted-foreground">
                      {item.crm_update_error ? (
                        <span className="text-destructive">{item.crm_update_error}</span>
                      ) : (
                        <span>Falha na recolha (tentativa {item.attempts || 1})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
