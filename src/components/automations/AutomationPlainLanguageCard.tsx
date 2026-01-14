import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Filter, Zap } from "lucide-react";
import { generatePlainLanguageSummary, Condition, Action } from "@/lib/automationPlainLanguage";
import { AutomationTrigger } from "@/hooks/useAutomations";

interface Props {
  trigger: AutomationTrigger;
  conditions: Condition[];
  actions: Action[];
  showFullSummary?: boolean;
}

export function AutomationPlainLanguageCard({ 
  trigger, 
  conditions, 
  actions,
  showFullSummary = false 
}: Props) {
  const summary = generatePlainLanguageSummary(trigger, conditions, actions);

  if (showFullSummary) {
    return (
      <Card className="p-4 bg-muted/50 border-dashed">
        <p className="text-sm font-medium text-foreground">
          {summary.fullSummary}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-start gap-3 flex-wrap">
        {/* Trigger */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <Badge variant="secondary" className="font-normal">
            {summary.trigger}
          </Badge>
        </div>

        {/* Conditions */}
        {summary.conditions.length > 0 && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-500" />
              <div className="flex flex-wrap gap-1">
                {summary.conditions.map((condition, idx) => (
                  <Badge key={idx} variant="outline" className="font-normal text-xs">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        {summary.actions.length > 0 && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex flex-wrap gap-1">
              {summary.actions.map((action, idx) => (
                <Badge key={idx} className="font-normal text-xs bg-primary/10 text-primary">
                  {action}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
