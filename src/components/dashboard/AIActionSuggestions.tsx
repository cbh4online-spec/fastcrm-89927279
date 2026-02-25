import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const priorityDot = (p: string) =>
  p === "HIGH" ? "bg-destructive" : p === "MEDIUM" ? "bg-yellow-500" : "bg-muted-foreground";

export function AIActionSuggestions() {
  const { data, isLoading } = useIntelligencePanel();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const actions = data?.recommended_actions?.slice(0, 4) || [];

  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Revenue Brain
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {actions.map((action, i) => (
            <button
              key={`${action.deal_id}-${i}`}
              className="w-full flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
              onClick={() => navigate(`/dashboard/opportunities/${action.deal_id}`)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot(action.priority))} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{action.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{action.deal_title}</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
