import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
  AutomationRule,
  AutomationTrigger,
  AutomationActionType,
  ConditionOperator,
} from "@/hooks/useAutomations";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";

const triggerOptions: { value: AutomationTrigger; label: string }[] = [
  { value: "lead_created", label: "Lead Criado" },
  { value: "opportunity_stage_changed", label: "Etapa de Oportunidade Alterada" },
  { value: "payment_confirmed", label: "Pagamento Confirmado" },
];

const actionOptions: { value: AutomationActionType; label: string }[] = [
  { value: "create_task", label: "Criar Tarefa" },
  { value: "move_opportunity_stage", label: "Mover Etapa de Oportunidade" },
  { value: "send_message", label: "Enviar Mensagem" },
  { value: "notify_user", label: "Notificar Utilizador" },
];

const operatorOptions: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "contains", label: "Contém" },
  { value: "not_contains", label: "Não contém" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" },
  { value: "is_empty", label: "Está vazio" },
  { value: "is_not_empty", label: "Não está vazio" },
];

const conditionSchema = z.object({
  field_name: z.string().min(1, "Campo obrigatório"),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
  value: z.string().nullable(),
  position: z.number(),
});

const actionSchema = z.object({
  action_type: z.enum(["create_task", "move_opportunity_stage", "send_message", "notify_user"]),
  config: z.record(z.unknown()),
  position: z.number(),
});

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  trigger: z.enum(["lead_created", "opportunity_stage_changed", "payment_confirmed"]),
  is_active: z.boolean(),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1, "Pelo menos uma ação é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: AutomationRule | null;
}

export function AutomationRuleBuilder({ open, onOpenChange, editRule }: Props) {
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const { data: stages } = usePipelineStages();
  const { data: agents } = useAgentMembers();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger: "lead_created",
      is_active: true,
      conditions: [],
      actions: [{ action_type: "notify_user", config: {}, position: 0 }],
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = 
    useFieldArray({ control: form.control, name: "conditions" });

  const { fields: actionFields, append: appendAction, remove: removeAction } = 
    useFieldArray({ control: form.control, name: "actions" });

  useEffect(() => {
    if (editRule) {
      form.reset({
        name: editRule.name,
        description: editRule.description || "",
        trigger: editRule.trigger,
        is_active: editRule.is_active,
        conditions: editRule.conditions?.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator,
          value: c.value,
          position: c.position ?? i,
        })) || [],
        actions: editRule.actions?.map((a, i) => ({
          action_type: a.action_type,
          config: a.config as Record<string, unknown>,
          position: a.position ?? i,
        })) || [{ action_type: "notify_user", config: {}, position: 0 }],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        trigger: "lead_created",
        is_active: true,
        conditions: [],
        actions: [{ action_type: "notify_user", config: {}, position: 0 }],
      });
    }
  }, [editRule, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      description: values.description,
      trigger: values.trigger,
      is_active: values.is_active,
      conditions: values.conditions.map((c, i) => ({
        field_name: c.field_name,
        operator: c.operator,
        value: c.value,
        position: c.position ?? i,
      })),
      actions: values.actions.map((a, i) => ({
        action_type: a.action_type,
        config: a.config,
        position: a.position ?? i,
      })),
    };

    if (editRule) {
      await updateRule.mutateAsync({
        id: editRule.id,
        ...payload,
      });
    } else {
      await createRule.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const selectedTrigger = form.watch("trigger");

  const getTriggerFields = (): string[] => {
    switch (selectedTrigger) {
      case "lead_created":
        return ["name", "email", "phone", "source", "status"];
      case "opportunity_stage_changed":
        return ["title", "value", "stage_id", "previous_stage_id", "status"];
      case "payment_confirmed":
        return ["amount", "currency", "customer_email"];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editRule ? "Editar Regra" : "Nova Regra de Automação"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da regra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gatilho</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {triggerOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição da regra..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditions */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Condições (opcional)</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendCondition({
                        field_name: "",
                        operator: "equals",
                        value: "",
                        position: conditionFields.length,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {conditionFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem condições - a regra será executada sempre que o gatilho ocorrer.
                  </p>
                ) : (
                  conditionFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.field_name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Campo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getTriggerFields().map((f) => (
                                  <SelectItem key={f} value={f}>
                                    {f}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.operator`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {operatorOptions.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Valor"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Ações</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendAction({
                        action_type: "notify_user",
                        config: {},
                        position: actionFields.length,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionFields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg space-y-3">
                    <div className="flex gap-2 items-center">
                      <FormField
                        control={form.control}
                        name={`actions.${index}.action_type`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {actionOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {actionFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAction(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Action-specific config */}
                    {form.watch(`actions.${index}.action_type`) === "move_opportunity_stage" && stages && (
                      <FormField
                        control={form.control}
                        name={`actions.${index}.config.stage_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mover para etapa</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value as string || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar etapa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stages.map((stage) => (
                                  <SelectItem key={stage.id} value={stage.id}>
                                    {stage.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch(`actions.${index}.action_type`) === "notify_user" && agents && (
                      <FormField
                        control={form.control}
                        name={`actions.${index}.config.user_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notificar utilizador</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value as string || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar utilizador" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.user_id} value={agent.user_id}>
                                    {agent.profile?.full_name || agent.user_id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch(`actions.${index}.action_type`) === "create_task" && (
                      <FormField
                        control={form.control}
                        name={`actions.${index}.config.task_title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título da tarefa</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Seguir com {name}"
                                {...field}
                                value={field.value as string || ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch(`actions.${index}.action_type`) === "send_message" && (
                      <FormField
                        control={form.control}
                        name={`actions.${index}.config.message`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensagem</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Texto da mensagem..."
                                {...field}
                                value={field.value as string || ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRule.isPending || updateRule.isPending}
              >
                {editRule ? "Guardar" : "Criar Regra"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
