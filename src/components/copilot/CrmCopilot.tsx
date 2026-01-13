import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  ArrowRight,
} from "lucide-react";
import { useCopilot, ActionSuggestion } from "@/hooks/useCopilot";
import { Lead } from "@/hooks/useLeads";
import { Opportunity } from "@/hooks/useOpportunities";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  lead?: Lead | null;
  opportunity?: Opportunity | null;
  recentActivity?: string;
}

const categoryIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
  follow_up: ArrowRight,
  update: CheckSquare,
};

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function CrmCopilot({ lead, opportunity, recentActivity }: Props) {
  const { isLoading, suggestNextActions } = useCopilot();
  
  const [expanded, setExpanded] = useState(true);
  const [actions, setActions] = useState<ActionSuggestion[] | null>(null);
  const [confirmedActions, setConfirmedActions] = useState<Set<number>>(new Set());

  const handleSuggestActions = async () => {
    const data = lead || opportunity;
    if (!data) return;

    const result = await suggestNextActions(
      {
        type: lead ? "lead" : "opportunity",
        name: lead?.name || opportunity?.title,
        status: lead?.status || opportunity?.status,
        email: lead?.email,
        phone: lead?.phone,
        value: opportunity?.value,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      recentActivity
    );

    if (result?.actions) {
      setActions(result.actions);
      setConfirmedActions(new Set());
    }
  };

  const handleConfirmAction = (index: number, action: ActionSuggestion) => {
    setConfirmedActions((prev) => new Set(prev).add(index));
    toast.success(`Ação confirmada: ${action.action}`, {
      description: "Adicione esta ação às suas tarefas manualmente.",
    });
  };

  const hasData = lead || opportunity;

  if (!hasData) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">AI Copilot - Próximas Ações</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <Button
            onClick={handleSuggestActions}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Sugerir Próximas Ações
          </Button>

          {actions && actions.length > 0 && (
            <div className="space-y-3">
              {actions.map((action, index) => {
                const Icon = categoryIcons[action.category] || CheckSquare;
                const isConfirmed = confirmedActions.has(index);

                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 border rounded-lg space-y-2 transition-colors",
                      isConfirmed && "bg-muted border-primary/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className={cn("text-sm font-medium", isConfirmed && "line-through")}>
                            {action.action}
                          </p>
                          {action.reasoning && (
                            <p className="text-xs text-muted-foreground">
                              {action.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={priorityColors[action.priority]}>
                        {action.priority === "high" ? "Alta" :
                         action.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      {action.timeframe && (
                        <span className="text-xs text-muted-foreground">
                          ⏱️ {action.timeframe}
                        </span>
                      )}
                      
                      {!isConfirmed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmAction(index, action)}
                        >
                          Confirmar Ação
                        </Button>
                      )}
                      
                      {isConfirmed && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✓ Confirmado
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {actions === null && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Clique para obter sugestões de ações baseadas nos dados atuais.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
