import { useEffect, useState, useMemo } from "react";
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
  FormDescription,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Zap, Filter, PlayCircle, AlertTriangle } from "lucide-react";
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
import { useCustomFields, CustomField, CustomFieldType } from "@/hooks/useCustomFields";

// Extended trigger options with new types
const triggerOptions: { value: AutomationTrigger; label: string; entity: string }[] = [
  { value: "lead_created", label: "Lead Criado", entity: "lead" },
  { value: "lead_updated", label: "Lead Atualizado", entity: "lead" },
  { value: "opportunity_created", label: "Oportunidade Criada", entity: "opportunity" },
  { value: "opportunity_updated", label: "Oportunidade Atualizada", entity: "opportunity" },
  { value: "opportunity_stage_changed", label: "Etapa de Oportunidade Alterada", entity: "opportunity" },
  { value: "contact_created", label: "Contacto Criado", entity: "contact" },
  { value: "contact_updated", label: "Contacto Atualizado", entity: "contact" },
  { value: "company_created", label: "Empresa Criada", entity: "company" },
  { value: "company_updated", label: "Empresa Atualizada", entity: "company" },
  { value: "custom_field_updated", label: "Campo Personalizado Alterado", entity: "any" },
  { value: "payment_confirmed", label: "Pagamento Confirmado", entity: "payment" },
];

// Extended action options
const actionOptions: { value: AutomationActionType; label: string; description: string }[] = [
  { value: "create_task", label: "Criar Tarefa", description: "Cria uma nova tarefa associada" },
  { value: "assign_owner", label: "Atribuir Responsável", description: "Define o responsável pela entidade" },
  { value: "move_opportunity_stage", label: "Mover Etapa", description: "Move oportunidade para outra etapa" },
  { value: "add_tag", label: "Adicionar Tag", description: "Adiciona uma tag à entidade" },
  { value: "send_message", label: "Enviar Mensagem", description: "Envia mensagem ao lead" },
  { value: "notify_user", label: "Notificar Utilizador", description: "Envia notificação a um utilizador" },
  { value: "create_opportunity", label: "Criar Oportunidade", description: "Cria oportunidade se não existir" },
  { value: "update_field", label: "Atualizar Campo", description: "Atualiza valor de um campo" },
];

// Operator options based on field type
const getOperatorsForFieldType = (fieldType: CustomFieldType | "text" | "number" | "email" | "status" | "tags"): { value: ConditionOperator; label: string }[] => {
  switch (fieldType) {
    case "text":
    case "email":
      return [
        { value: "equals", label: "Igual a" },
        { value: "not_equals", label: "Diferente de" },
        { value: "contains", label: "Contém" },
        { value: "not_contains", label: "Não contém" },
        { value: "is_empty", label: "Está vazio" },
        { value: "is_not_empty", label: "Não está vazio" },
      ];
    case "number":
      return [
        { value: "equals", label: "Igual a" },
        { value: "not_equals", label: "Diferente de" },
        { value: "greater_than", label: "Maior que" },
        { value: "less_than", label: "Menor que" },
        { value: "is_empty", label: "Está vazio" },
        { value: "is_not_empty", label: "Não está vazio" },
      ];
    case "select":
    case "status":
      return [
        { value: "equals", label: "Igual a" },
        { value: "not_equals", label: "Diferente de" },
      ];
    case "boolean":
      return [
        { value: "equals", label: "É verdadeiro" },
        { value: "not_equals", label: "É falso" },
      ];
    case "date":
      return [
        { value: "equals", label: "Igual a" },
        { value: "greater_than", label: "Depois de" },
        { value: "less_than", label: "Antes de" },
        { value: "is_empty", label: "Está vazio" },
        { value: "is_not_empty", label: "Não está vazio" },
      ];
    case "tags":
      return [
        { value: "contains", label: "Contém" },
        { value: "not_contains", label: "Não contém" },
        { value: "is_empty", label: "Está vazio" },
        { value: "is_not_empty", label: "Não está vazio" },
      ];
    default:
      return [
        { value: "equals", label: "Igual a" },
        { value: "not_equals", label: "Diferente de" },
      ];
  }
};

// Core fields by entity type
const coreFieldsByEntity: Record<string, { name: string; label: string; type: CustomFieldType | "text" | "number" | "email" | "status" | "tags" }[]> = {
  lead: [
    { name: "name", label: "Nome", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "source", label: "Origem", type: "text" },
    { name: "status", label: "Estado", type: "status" },
    { name: "tags", label: "Tags", type: "tags" },
  ],
  opportunity: [
    { name: "title", label: "Título", type: "text" },
    { name: "value", label: "Valor", type: "number" },
    { name: "stage_id", label: "Etapa", type: "select" },
    { name: "status", label: "Estado", type: "status" },
    { name: "expected_close_date", label: "Data Prevista Fecho", type: "date" },
  ],
  contact: [
    { name: "name", label: "Nome", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "company", label: "Empresa", type: "text" },
    { name: "job_title", label: "Cargo", type: "text" },
    { name: "tags", label: "Tags", type: "tags" },
  ],
  company: [
    { name: "name", label: "Nome", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Telefone", type: "text" },
    { name: "industry", label: "Setor", type: "text" },
    { name: "size", label: "Tamanho", type: "text" },
    { name: "website", label: "Website", type: "text" },
    { name: "tags", label: "Tags", type: "tags" },
  ],
  payment: [
    { name: "amount", label: "Valor", type: "number" },
    { name: "currency", label: "Moeda", type: "text" },
    { name: "status", label: "Estado", type: "status" },
  ],
  any: [],
};

const conditionSchema = z.object({
  field_name: z.string().min(1, "Campo obrigatório"),
  field_type: z.string().optional(),
  is_custom_field: z.boolean().optional(),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
  value: z.string().nullable(),
  position: z.number(),
});

const actionSchema = z.object({
  action_type: z.enum(["create_task", "move_opportunity_stage", "send_message", "notify_user", "assign_owner", "add_tag", "create_opportunity", "update_field"]),
  config: z.record(z.unknown()),
  position: z.number(),
});

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  trigger: z.enum([
    "lead_created", "lead_updated", "opportunity_created", "opportunity_updated",
    "opportunity_stage_changed", "contact_created", "contact_updated",
    "company_created", "company_updated", "custom_field_updated", "payment_confirmed"
  ]),
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
  
  // Fetch custom fields for all entity types
  const { data: leadCustomFields } = useCustomFields("lead");
  const { data: opportunityCustomFields } = useCustomFields("opportunity");
  const { data: contactCustomFields } = useCustomFields("contact");
  const { data: companyCustomFields } = useCustomFields("company");
  
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

  const selectedTrigger = form.watch("trigger");
  
  // Get entity type from trigger
  const entityType = useMemo(() => {
    return triggerOptions.find(t => t.value === selectedTrigger)?.entity || "lead";
  }, [selectedTrigger]);

  // Get custom fields for current entity type
  const customFieldsForEntity = useMemo(() => {
    switch (entityType) {
      case "lead": return leadCustomFields || [];
      case "opportunity": return opportunityCustomFields || [];
      case "contact": return contactCustomFields || [];
      case "company": return companyCustomFields || [];
      default: return [];
    }
  }, [entityType, leadCustomFields, opportunityCustomFields, contactCustomFields, companyCustomFields]);

  // Combine core fields and custom fields
  const availableFields = useMemo(() => {
    const coreFields = coreFieldsByEntity[entityType] || [];
    const customFields = customFieldsForEntity.map(cf => ({
      name: `custom:${cf.id}`,
      label: `${cf.name} (personalizado)`,
      type: cf.field_type as CustomFieldType,
      isCustom: true,
      customField: cf,
    }));
    return [...coreFields.map(f => ({ ...f, isCustom: false })), ...customFields];
  }, [entityType, customFieldsForEntity]);

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
  }, [editRule, form, open]);

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
      await updateRule.mutateAsync({ id: editRule.id, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  // Get field info for a condition
  const getFieldInfo = (fieldName: string) => {
    return availableFields.find(f => f.name === fieldName);
  };

  // Get operators for a condition field
  const getOperatorsForField = (fieldName: string) => {
    const field = getFieldInfo(fieldName);
    if (!field) return getOperatorsForFieldType("text");
    return getOperatorsForFieldType(field.type);
  };

  // Check if operator needs a value
  const operatorNeedsValue = (operator: ConditionOperator) => {
    return !["is_empty", "is_not_empty"].includes(operator);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {editRule ? "Editar Regra" : "Nova Regra de Automação"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Regra</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Notificar vendas de novos leads" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Ativa</FormLabel>
                        <FormDescription className="text-xs">
                          Regras inativas não são executadas
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                      <Textarea 
                        placeholder="Descreva o que esta automação faz..." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Trigger Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold">Quando acontecer (Gatilho)</h3>
              </div>

              <FormField
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecionar gatilho" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {triggerOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {opt.label}
                              <Badge variant="outline" className="text-xs">
                                {opt.entity}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Conditions Section */}
            <Card className="border-dashed">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm">Se as condições forem verdadeiras</CardTitle>
                  </div>
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
                    Adicionar Condição
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {conditionFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sem condições — a regra será executada sempre que o gatilho ocorrer.
                  </p>
                ) : (
                  conditionFields.map((field, index) => {
                    const selectedFieldName = form.watch(`conditions.${index}.field_name`);
                    const selectedOperator = form.watch(`conditions.${index}.operator`);
                    const fieldInfo = getFieldInfo(selectedFieldName);
                    const operators = getOperatorsForField(selectedFieldName);

                    return (
                      <div key={field.id} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg">
                        {/* Field selector */}
                        <FormField
                          control={form.control}
                          name={`conditions.${index}.field_name`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs text-muted-foreground">Campo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecionar campo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableFields.map((f) => (
                                    <SelectItem key={f.name} value={f.name}>
                                      <div className="flex items-center gap-2">
                                        {f.label}
                                        {f.isCustom && (
                                          <Badge variant="secondary" className="text-xs">
                                            custom
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {/* Operator selector */}
                        <FormField
                          control={form.control}
                          name={`conditions.${index}.operator`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs text-muted-foreground">Operador</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {operators.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {/* Value input - only if operator needs value */}
                        {operatorNeedsValue(selectedOperator) && (
                          <FormField
                            control={form.control}
                            name={`conditions.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-xs text-muted-foreground">Valor</FormLabel>
                                <FormControl>
                                  {fieldInfo?.type === "boolean" ? (
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value || "true"}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">Verdadeiro</SelectItem>
                                        <SelectItem value="false">Falso</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : fieldInfo?.type === "select" && fieldInfo.isCustom && (fieldInfo as { customField?: CustomField }).customField?.options ? (
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value || ""}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {((fieldInfo as { customField?: CustomField }).customField?.options as string[])?.map((opt: string) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : fieldInfo?.name === "stage_id" && stages ? (
                                    <Select 
                                      onValueChange={field.onChange} 
                                      value={field.value || ""}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecionar etapa" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {stages.map((stage) => (
                                          <SelectItem key={stage.id} value={stage.id}>
                                            {stage.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : fieldInfo?.type === "number" ? (
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  ) : fieldInfo?.type === "date" ? (
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  ) : (
                                    <Input
                                      placeholder="Valor"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  )}
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Actions Section */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-sm">Então executar ações</CardTitle>
                  </div>
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
                    Adicionar Ação
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionFields.map((field, index) => {
                  const actionType = form.watch(`actions.${index}.action_type`);
                  const actionInfo = actionOptions.find(a => a.value === actionType);

                  return (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-card">
                      <div className="flex gap-2 items-start">
                        <FormField
                          control={form.control}
                          name={`actions.${index}.action_type`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs text-muted-foreground">Tipo de Ação</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {actionOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <div>
                                        <div>{opt.label}</div>
                                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                                      </div>
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
                            className="mt-6"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      {/* Action-specific config */}
                      <div className="pl-4 border-l-2 border-muted space-y-3">
                        {actionType === "move_opportunity_stage" && stages && (
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
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: stage.color }}
                                          />
                                          {stage.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}

                        {(actionType === "notify_user" || actionType === "assign_owner") && agents && (
                          <FormField
                            control={form.control}
                            name={`actions.${index}.config.user_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {actionType === "assign_owner" ? "Atribuir a" : "Notificar"}
                                </FormLabel>
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

                        {actionType === "create_task" && (
                          <>
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
                                  <FormDescription className="text-xs">
                                    Use {"{name}"}, {"{email}"} para campos dinâmicos
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                            {agents && (
                              <FormField
                                control={form.control}
                                name={`actions.${index}.config.assigned_to`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Atribuir a (opcional)</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value as string || ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Responsável" />
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
                          </>
                        )}

                        {actionType === "send_message" && (
                          <FormField
                            control={form.control}
                            name={`actions.${index}.config.message`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mensagem</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Olá {name}, obrigado pelo contacto!"
                                    className="resize-none"
                                    {...field}
                                    value={field.value as string || ""}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Use {"{name}"}, {"{email}"} para campos dinâmicos
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}

                        {actionType === "add_tag" && (
                          <FormField
                            control={form.control}
                            name={`actions.${index}.config.tag`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tag a adicionar</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ex: qualificado"
                                    {...field}
                                    value={field.value as string || ""}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}

                        {actionType === "create_opportunity" && (
                          <>
                            <FormField
                              control={form.control}
                              name={`actions.${index}.config.opportunity_title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título da oportunidade</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Oportunidade de {name}"
                                      {...field}
                                      value={field.value as string || ""}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {stages && (
                              <FormField
                                control={form.control}
                                name={`actions.${index}.config.stage_id`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Etapa inicial</FormLabel>
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
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" />
                              Só será criada se o lead não tiver oportunidade
                            </div>
                          </>
                        )}

                        {actionType === "update_field" && (
                          <>
                            <FormField
                              control={form.control}
                              name={`actions.${index}.config.field_name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Campo a atualizar</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value as string || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecionar campo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {availableFields.map((f) => (
                                        <SelectItem key={f.name} value={f.name}>
                                          {f.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`actions.${index}.config.field_value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Novo valor</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Valor"
                                      {...field}
                                      value={field.value as string || ""}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Safety Notice */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-muted-foreground">
                <strong className="text-foreground">Nota de segurança:</strong> Automações não sobrescrevem campos silenciosamente. 
                Todas as execuções são registadas nos logs. Evite criar regras que possam disparar-se mutuamente.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRule.isPending || updateRule.isPending}
              >
                {editRule ? "Guardar Alterações" : "Criar Regra"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
