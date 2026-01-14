import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Sparkles, Zap, CheckCircle2, Loader2, Plus } from "lucide-react";
import { CrmBlueprint } from "@/types/blueprint";
import { useCreateAutomationRule, AutomationTrigger, AutomationActionType } from "@/hooks/useAutomations";
import { toast } from "sonner";

interface BlueprintAutomationSuggestionsProps {
  blueprint: CrmBlueprint;
  onClose?: () => void;
}

interface SuggestedAutomation {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: Array<{
    field_name: string;
    operator: "equals" | "not_equals" | "contains" | "is_not_empty";
    value: string | null;
  }>;
  actions: Array<{
    action_type: AutomationActionType;
    config: Record<string, unknown>;
  }>;
  priority: "high" | "medium" | "low";
}

function generateSuggestionsFromBlueprint(blueprint: CrmBlueprint): SuggestedAutomation[] {
  const suggestions: SuggestedAutomation[] = [];
  const entityType = blueprint.entityType;

  // Suggestion 1: Welcome/Follow-up when entity is created
  suggestions.push({
    id: "welcome-followup",
    name: `Boas-vindas a novos ${entityType === "lead" ? "leads" : "contactos"}`,
    description: `Criar tarefa de acompanhamento quando um novo ${entityType} é criado`,
    trigger: entityType === "lead" ? "lead_created" : "contact_created",
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: `Fazer follow-up com {{${entityType}.name}}`,
          due_hours: 24,
        },
      },
    ],
    priority: "high",
  });

  // Check for priority/urgency fields
  const urgencyField = blueprint.customFields.find(f => 
    f.name.toLowerCase().includes("urgência") || 
    f.name.toLowerCase().includes("prioridade") ||
    f.name.toLowerCase().includes("priority")
  );

  if (urgencyField) {
    // Get first option value (handle both string and object options)
    let highPriorityValue = "alta";
    if (urgencyField.type === "select" && urgencyField.options?.[0]) {
      const opt = urgencyField.options[0];
      highPriorityValue = typeof opt === "string" ? opt : (opt as { value: string }).value;
    }

    suggestions.push({
      id: "high-priority-alert",
      name: "Alerta para casos urgentes",
      description: `Notificar quando ${urgencyField.name} indica alta prioridade`,
      trigger: entityType === "lead" ? "lead_updated" : "custom_field_updated",
      conditions: [
        {
          field_name: `custom:${urgencyField.name}`,
          operator: "equals",
          value: highPriorityValue,
        },
      ],
      actions: [
        {
          action_type: "create_task",
          config: {
            title: `🔴 URGENTE: Atender {{${entityType}.name}}`,
            due_hours: 2,
          },
        },
        {
          action_type: "notify_user",
          config: {
            message: `Caso urgente requer atenção imediata`,
          },
        },
      ],
      priority: "high",
    });
  }

  // Check for budget/value fields
  const valueField = blueprint.customFields.find(f =>
    f.name.toLowerCase().includes("orçamento") ||
    f.name.toLowerCase().includes("valor") ||
    f.name.toLowerCase().includes("budget") ||
    f.type === "number"
  );

  if (valueField) {
    suggestions.push({
      id: "high-value-opportunity",
      name: "Oportunidade de alto valor",
      description: `Criar oportunidade quando ${valueField.name} indica alto potencial`,
      trigger: "lead_updated",
      conditions: [
        {
          field_name: `custom:${valueField.name}`,
          operator: "is_not_empty",
          value: null,
        },
      ],
      actions: [
        {
          action_type: "create_opportunity",
          config: {
            title: `Oportunidade: {{lead.name}}`,
          },
        },
      ],
      priority: "medium",
    });
  }

  // Check for pipeline stages
  if (blueprint.pipelineStages && blueprint.pipelineStages.length > 1) {
    const closedStage = blueprint.pipelineStages.find(s => 
      s.name.toLowerCase().includes("fechado") ||
      s.name.toLowerCase().includes("ganho") ||
      s.name.toLowerCase().includes("won")
    );

    if (closedStage) {
      suggestions.push({
        id: "won-celebration",
        name: "Celebrar negócio fechado",
        description: `Criar tarefa de pós-venda quando oportunidade é ganha`,
        trigger: "opportunity_stage_changed",
        conditions: [
          {
            field_name: "stage_id",
            operator: "equals",
            value: closedStage.name,
          },
        ],
        actions: [
          {
            action_type: "create_task",
            config: {
              title: `Iniciar onboarding: {{opportunity.title}}`,
              due_hours: 48,
            },
          },
        ],
        priority: "medium",
      });
    }
  }

  // Check for source/origin field
  const sourceField = blueprint.customFields.find(f =>
    f.name.toLowerCase().includes("origem") ||
    f.name.toLowerCase().includes("fonte") ||
    f.name.toLowerCase().includes("source")
  );

  if (sourceField && sourceField.options) {
    suggestions.push({
      id: "source-tagging",
      name: "Classificar por origem",
      description: `Adicionar tag baseada na origem do ${entityType}`,
      trigger: entityType === "lead" ? "lead_created" : "contact_created",
      conditions: [
        {
          field_name: `custom:${sourceField.name}`,
          operator: "is_not_empty",
          value: null,
        },
      ],
      actions: [
        {
          action_type: "add_tag",
          config: {
            tag: `origem:{{custom:${sourceField.name}}}`,
          },
        },
      ],
      priority: "low",
    });
  }

  // No response automation
  suggestions.push({
    id: "no-response-followup",
    name: "Follow-up sem resposta",
    description: "Lembrete quando não há resposta após 48 horas",
    trigger: "lead_no_response",
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: `Tentar novamente: {{lead.name}} sem resposta`,
          due_hours: 24,
        },
      },
    ],
    priority: "medium",
  });

  return suggestions;
}

export function BlueprintAutomationSuggestions({ blueprint, onClose }: BlueprintAutomationSuggestionsProps) {
  const [open, setOpen] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());
  const createRule = useCreateAutomationRule();

  const suggestions = generateSuggestionsFromBlueprint(blueprint);

  const handleCreate = async (suggestion: SuggestedAutomation) => {
    setCreatingId(suggestion.id);
    try {
      await createRule.mutateAsync({
        name: suggestion.name,
        description: suggestion.description,
        trigger: suggestion.trigger,
        is_active: false, // Create as draft
        conditions: suggestion.conditions.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator,
          value: c.value,
          position: i,
        })),
        actions: suggestion.actions.map((a, i) => ({
          action_type: a.action_type,
          config: a.config,
          position: i,
        })),
      });
      
      setCreatedIds(prev => new Set(prev).add(suggestion.id));
      toast.success(`Automação "${suggestion.name}" criada como rascunho`);
    } catch (error) {
      console.error("Error creating automation:", error);
    } finally {
      setCreatingId(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const priorityColors = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões de Automação
          </DialogTitle>
          <DialogDescription>
            Baseado no blueprint "{blueprint.name}", sugerimos as seguintes automações.
            Todas são criadas como <strong>rascunho</strong> para sua revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sugestão disponível para este blueprint.
            </div>
          ) : (
            suggestions.map((suggestion) => {
              const isCreated = createdIds.has(suggestion.id);
              const isCreating = creatingId === suggestion.id;

              return (
                <Card key={suggestion.id} className={isCreated ? "border-green-500/50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">{suggestion.name}</CardTitle>
                      </div>
                      <Badge className={priorityColors[suggestion.priority]}>
                        {suggestion.priority === "high" ? "Alta" : suggestion.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                    <CardDescription>{suggestion.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Trigger:</span>{" "}
                        {suggestion.trigger.replace(/_/g, " ")}
                        {suggestion.conditions.length > 0 && (
                          <span> • {suggestion.conditions.length} condição(ões)</span>
                        )}
                        <span> • {suggestion.actions.length} ação(ões)</span>
                      </div>
                      <Button
                        size="sm"
                        variant={isCreated ? "outline" : "default"}
                        onClick={() => handleCreate(suggestion)}
                        disabled={isCreating || isCreated}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            A criar...
                          </>
                        ) : isCreated ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Criada
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Rascunho
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            {createdIds.size > 0 ? "Concluir" : "Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
