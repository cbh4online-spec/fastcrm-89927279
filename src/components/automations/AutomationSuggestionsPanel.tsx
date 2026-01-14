import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Check,
  X,
  Zap,
  Filter,
  PlayCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Edit3,
  ArrowRight,
  Target,
  Settings2,
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
import { AutomationRuleBuilder } from "./AutomationRuleBuilder";
import { toast } from "sonner";

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

const triggerColors: Record<string, string> = {
  lead_created: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  lead_updated: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  opportunity_created: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  opportunity_updated: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  opportunity_stage_changed: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  contact_created: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  contact_updated: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  company_created: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  company_updated: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  custom_field_updated: "bg-pink-500/10 text-pink-700 border-pink-500/30",
  payment_confirmed: "bg-green-500/10 text-green-700 border-green-500/30",
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

const operatorLabels: Record<string, string> = {
  equals: "igual a",
  not_equals: "diferente de",
  contains: "contém",
  not_contains: "não contém",
  greater_than: "maior que",
  less_than: "menor que",
  is_empty: "está vazio",
  is_not_empty: "não está vazio",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  
  let bgColor = "bg-amber-500/10";
  let textColor = "text-amber-700";
  let borderColor = "border-amber-500/30";
  
  if (percent >= 90) {
    bgColor = "bg-emerald-500/10";
    textColor = "text-emerald-700";
    borderColor = "border-emerald-500/30";
  } else if (percent >= 80) {
    bgColor = "bg-green-500/10";
    textColor = "text-green-700";
    borderColor = "border-green-500/30";
  }
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bgColor} ${textColor} ${borderColor}`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${
              percent >= i * 20 ? "bg-current" : "bg-current/20"
            }`}
          />
        ))}
      </div>
      <span>{percent}%</span>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: AutomationSuggestion;
  onAccept: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  isAccepting: boolean;
}

function SuggestionCard({
  suggestion,
  onAccept,
  onEdit,
  onDismiss,
  isAccepting,
}: SuggestionCardProps) {
  return (
    <Card className="overflow-hidden border-2 border-primary/10 hover:border-primary/20 transition-colors">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-amber-500/10 p-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Lightbulb className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-foreground truncate">
                {suggestion.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {suggestion.description}
            </p>
          </div>
          <ConfidenceBadge confidence={suggestion.confidence} />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Rule Preview */}
        <div className="space-y-3">
          {/* Trigger */}
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-muted flex-shrink-0 mt-0.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Gatilho
              </p>
              <Badge 
                variant="outline" 
                className={`${triggerColors[suggestion.trigger_type] || "bg-muted"}`}
              >
                {triggerLabels[suggestion.trigger_type] || suggestion.trigger_type}
              </Badge>
            </div>
          </div>

          {/* Conditions */}
          {suggestion.conditions.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-muted flex-shrink-0 mt-0.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Condições
                </p>
                <div className="space-y-1.5">
                  {suggestion.conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-sm flex-wrap">
                      <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                        {c.field_name}
                      </code>
                      <span className="text-muted-foreground text-xs">
                        {operatorLabels[c.operator] || c.operator}
                      </span>
                      {c.value && (
                        <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">
                          {c.value}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Flow Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </div>

          {/* Actions */}
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-muted flex-shrink-0 mt-0.5">
              <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Ações
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.actions.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {actionLabels[a.action_type] || a.action_type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-muted/50 rounded-lg p-3 border border-muted">
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Settings2 className="h-3 w-3" />
            Porquê esta sugestão?
          </p>
          <p className="text-sm text-foreground/80">{suggestion.explanation}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Ignorar
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Criar Regra
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Convert suggestion to edit rule format for the builder
function suggestionToEditRule(suggestion: AutomationSuggestion) {
  return {
    id: `suggestion-${suggestion.id}`,
    name: suggestion.title,
    description: suggestion.description,
    trigger: suggestion.trigger_type as AutomationTrigger,
    is_active: false,
    created_at: suggestion.created_at,
    updated_at: suggestion.created_at,
    created_by: "",
    workspace_id: suggestion.workspace_id,
    conditions: suggestion.conditions.map((c, i) => ({
      id: `cond-${i}`,
      rule_id: "",
      field_name: c.field_name,
      operator: c.operator as ConditionOperator,
      value: c.value,
      position: i,
      created_at: suggestion.created_at,
    })),
    actions: suggestion.actions.map((a, i) => ({
      id: `action-${i}`,
      rule_id: "",
      action_type: a.action_type as AutomationActionType,
      config: a.config,
      position: i,
      created_at: suggestion.created_at,
    })),
  };
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
  const [editingSuggestion, setEditingSuggestion] = useState<AutomationSuggestion | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const handleAccept = async (suggestion: AutomationSuggestion) => {
    setAcceptingId(suggestion.id);
    try {
      await createRule.mutateAsync({
        name: suggestion.title,
        description: suggestion.description,
        trigger: suggestion.trigger_type as AutomationTrigger,
        is_active: false,
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

      await acceptSuggestion.mutateAsync(suggestion.id);
      toast.success("Regra de automação criada com sucesso! Está desativada por segurança.");
    } catch (error) {
      toast.error("Erro ao criar regra de automação");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleEdit = (suggestion: AutomationSuggestion) => {
    setEditingSuggestion(suggestion);
    setBuilderOpen(true);
  };

  const handleBuilderClose = async (open: boolean) => {
    setBuilderOpen(open);
    if (!open && editingSuggestion) {
      // Mark suggestion as accepted when builder closes after editing
      await acceptSuggestion.mutateAsync(editingSuggestion.id);
      setEditingSuggestion(null);
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
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Sugestões de Automação
                  {pendingSuggestions.length > 0 && (
                    <Badge variant="secondary" className="font-normal">
                      {pendingSuggestions.length} nova{pendingSuggestions.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  A IA analisa padrões de uso e sugere automações úteis
                </CardDescription>
              </div>
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
        </CardHeader>
        <CardContent>
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Sparkles className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium text-foreground">Nenhuma sugestão disponível</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                Clique em "Analisar Padrões" para detetar automações baseadas no seu uso do CRM
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {pendingSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => handleAccept(suggestion)}
                    onEdit={() => handleEdit(suggestion)}
                    onDismiss={() => handleDismiss(suggestion.id)}
                    isAccepting={acceptingId === suggestion.id}
                  />
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-muted-foreground">
                  <strong className="text-foreground">Nota de segurança:</strong> As regras criadas 
                  a partir de sugestões começam <strong>desativadas</strong>. Reveja e ative manualmente 
                  no separador "Regras".
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
              Isto irá descartar {pendingSuggestions.length} sugestão{pendingSuggestions.length > 1 ? "es" : ""} pendente{pendingSuggestions.length > 1 ? "s" : ""}.
              Pode sempre analisar novos padrões mais tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => dismissAll.mutate()}>
              Ignorar Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rule Builder for editing suggestions */}
      <AutomationRuleBuilder
        open={builderOpen}
        onOpenChange={handleBuilderClose}
        editRule={editingSuggestion ? suggestionToEditRule(editingSuggestion) : null}
      />
    </>
  );
}
