import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Zap,
  Filter,
  PlayCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  useAutomationSuggestions,
  useGenerateAutomationSuggestions,
  useAcceptAutomationSuggestion,
  useDismissAutomationSuggestion,
  useDismissAllSuggestions,
  AutomationSuggestion,
} from "@/hooks/useAutomationSuggestions";
import { useCreateAutomationRule, AutomationTrigger, AutomationActionType, ConditionOperator } from "@/hooks/useAutomations";

const triggerLabels: Record<string, string> = {
  lead_created: "Lead Criado",
  lead_updated: "Lead Atualizado",
  opportunity_created: "Oportunidade Criada",
  opportunity_updated: "Oportunidade Atualizada",
  opportunity_stage_changed: "Etapa Alterada",
  contact_created: "Contacto Criado",
  contact_updated: "Contacto Atualizado",
  company_created: "Empresa Criada",
  company_updated: "Empresa Atualizada",
  custom_field_updated: "Campo Personalizado",
  payment_confirmed: "Pagamento Confirmado",
};

const actionLabels: Record<string, string> = {
  create_task: "Criar Tarefa",
  assign_owner: "Atribuir Responsável",
  move_opportunity_stage: "Mover Etapa",
  add_tag: "Adicionar Tag",
  send_message: "Enviar Mensagem",
  notify_user: "Notificar",
  create_opportunity: "Criar Oportunidade",
  update_field: "Atualizar Campo",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let variant: "default" | "secondary" | "destructive" = "secondary";
  
  if (percent >= 85) variant = "default";
  else if (percent >= 70) variant = "secondary";
  
  return (
    <Badge variant={variant} className="text-xs">
      {percent}% confiança
    </Badge>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting,
}: {
  suggestion: AutomationSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  isAccepting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <CardTitle className="text-sm font-medium truncate">
                  {suggestion.title}
                </CardTitle>
              </div>
              <CardDescription className="text-xs line-clamp-2">
                {suggestion.description}
              </CardDescription>
            </div>
            <ConfidenceBadge confidence={suggestion.confidence} />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Quick preview */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {triggerLabels[suggestion.trigger_type] || suggestion.trigger_type}
            </Badge>
            {suggestion.conditions.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {suggestion.conditions.length} condição
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <PlayCircle className="h-3 w-3 mr-1" />
              {suggestion.actions.length} ação
            </Badge>
          </div>

          <CollapsibleContent>
            <div className="space-y-3 pt-2 border-t">
              {/* Explanation */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium text-foreground mb-1">Porquê esta sugestão?</p>
                <p>{suggestion.explanation}</p>
              </div>

              {/* Conditions */}
              {suggestion.conditions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Condições:</p>
                  <div className="space-y-1">
                    {suggestion.conditions.map((c, i) => (
                      <div key={i} className="text-xs bg-muted p-2 rounded">
                        <code>{c.field_name}</code> {c.operator} <code>{c.value || "(vazio)"}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Ações:</p>
                <div className="space-y-1">
                  {suggestion.actions.map((a, i) => (
                    <div key={i} className="text-xs bg-muted p-2 rounded flex items-center gap-2">
                      <PlayCircle className="h-3 w-3" />
                      {actionLabels[a.action_type] || a.action_type}
                      {Object.keys(a.config).length > 0 && (
                        <span className="text-muted-foreground">
                          ({JSON.stringify(a.config).slice(0, 30)}...)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Menos detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver detalhes
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Ignorar
              </Button>
              <Button
                size="sm"
                onClick={onAccept}
                disabled={isAccepting}
                className="text-xs"
              >
                {isAccepting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Criar Regra
              </Button>
            </div>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export function AutomationSuggestionsPanel() {
  const { data: suggestions, isLoading } = useAutomationSuggestions();
  const generateSuggestions = useGenerateAutomationSuggestions();
  const acceptSuggestion = useAcceptAutomationSuggestion();
  const dismissSuggestion = useDismissAutomationSuggestion();
  const dismissAll = useDismissAllSuggestions();
  const createRule = useCreateAutomationRule();

  const [confirmDismissAll, setConfirmDismissAll] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const handleAccept = async (suggestion: AutomationSuggestion) => {
    setAcceptingId(suggestion.id);
    try {
      // Create the automation rule
      await createRule.mutateAsync({
        name: suggestion.title,
        description: suggestion.description,
        trigger: suggestion.trigger_type as AutomationTrigger,
        is_active: false, // Start disabled for safety
        conditions: suggestion.conditions.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator as ConditionOperator,
          value: c.value,
          position: i,
        })),
        actions: suggestion.actions.map((a, i) => ({
          action_type: a.action_type as AutomationActionType,
          config: a.config,
          position: i,
        })),
      });

      // Mark suggestion as accepted
      await acceptSuggestion.mutateAsync(suggestion.id);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDismiss = (id: string) => {
    dismissSuggestion.mutate(id);
  };

  const pendingSuggestions = suggestions?.filter((s) => s.status === "pending") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Sugestões IA</CardTitle>
              {pendingSuggestions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingSuggestions.length}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {pendingSuggestions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDismissAll(true)}
                >
                  Ignorar todas
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSuggestions.mutate()}
                disabled={generateSuggestions.isPending}
              >
                {generateSuggestions.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Analisar Padrões
              </Button>
            </div>
          </div>
          <CardDescription>
            A IA analisa os seus padrões de uso e sugere automações úteis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma sugestão disponível</p>
              <p className="text-sm mt-1">
                Clique em "Analisar Padrões" para detetar automações úteis
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAccept(suggestion)}
                  onDismiss={() => handleDismiss(suggestion.id)}
                  isAccepting={acceptingId === suggestion.id}
                />
              ))}

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-muted-foreground">
                  <strong className="text-foreground">Nota:</strong> As regras criadas a partir de sugestões 
                  começam desativadas. Reveja e ative manualmente.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDismissAll} onOpenChange={setConfirmDismissAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorar todas as sugestões?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá descartar todas as {pendingSuggestions.length} sugestões pendentes.
              Pode sempre analisar novos padrões mais tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dismissAll.mutate()}
            >
              Ignorar Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
