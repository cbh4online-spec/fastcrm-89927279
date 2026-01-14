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
import { Plus, Trash2, Zap, Filter, PlayCircle, AlertTriangle, Shield } from "lucide-react";
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
import { CriticalFieldsWarning, LoopDetectionWarning } from "./CriticalFieldsWarning";
import { CustomFieldTriggerConfig } from "./CustomFieldTriggerConfig";
import { TemplateActionConfig } from "./TemplateActionConfig";
import { ProposalActionConfig } from "./ProposalActionConfig";
import { TimeTriggerConfig } from "./TimeTriggerConfig";
import { 
  detectPotentialLoop, 
  getModifiedFields, 
  getEntityFromTrigger,
  getCriticalFieldsAffected 
} from "@/lib/automationSafety";

// Extended trigger options with new types
const triggerOptions: { value: AutomationTrigger; label: string; entity: string; requiresConfig?: boolean }[] = [
  // Lead triggers
  { value: "lead_created", label: "Lead Criado", entity: "lead" },
  { value: "lead_updated", label: "Lead Atualizado", entity: "lead" },
  { value: "lead_status_changed", label: "Estado do Lead Alterado", entity: "lead" },
  { value: "lead_no_response", label: "Lead Sem Resposta", entity: "lead", requiresConfig: true },
  // Opportunity triggers
  { value: "opportunity_created", label: "Oportunidade Criada", entity: "opportunity" },
  { value: "opportunity_updated", label: "Oportunidade Atualizada", entity: "opportunity" },
  { value: "opportunity_stage_changed", label: "Etapa de Oportunidade Alterada", entity: "opportunity" },
  { value: "opportunity_value_changed", label: "Valor da Oportunidade Alterado", entity: "opportunity" },
  // Contact/Company triggers
  { value: "contact_created", label: "Contacto Criado", entity: "contact" },
  { value: "contact_updated", label: "Contacto Atualizado", entity: "contact" },
  { value: "company_created", label: "Empresa Criada", entity: "company" },
  { value: "company_updated", label: "Empresa Atualizada", entity: "company" },
  { value: "custom_field_updated", label: "Campo Personalizado Alterado", entity: "any" },
  // Inbox triggers
  { value: "message_received", label: "Mensagem Recebida", entity: "conversation" },
  { value: "conversation_no_reply", label: "Sem Resposta na Conversa", entity: "conversation", requiresConfig: true },
  // Proposal triggers
  { value: "proposal_created", label: "Proposta Criada", entity: "proposal" },
  { value: "proposal_viewed", label: "Proposta Visualizada", entity: "proposal" },
  { value: "proposal_paid", label: "Proposta Paga", entity: "proposal" },
  // Payment triggers
  { value: "payment_confirmed", label: "Pagamento Confirmado", entity: "payment" },
  // Time triggers
  { value: "scheduled_time", label: "Data/Hora Agendada", entity: "scheduled", requiresConfig: true },
];

// Extended action options grouped by category
// NOTE: send_message removed - all messages MUST use templates to ensure variable validation
const actionOptions: { value: AutomationActionType; label: string; description: string; category: string }[] = [
  // Communication - all require templates
  { value: "send_template_message", label: "Enviar Email/WhatsApp/DM", description: "Envia mensagem usando um template validado", category: "Comunicação" },
  { value: "notify_user", label: "Notificar Utilizador", description: "Envia notificação a um utilizador do sistema", category: "Comunicação" },
  // CRM
  { value: "create_task", label: "Criar Tarefa", description: "Cria uma nova tarefa associada", category: "CRM" },
  { value: "update_field", label: "Atualizar Campo", description: "Atualiza valor de um campo", category: "CRM" },
  { value: "change_lead_status", label: "Alterar Estado do Lead", description: "Muda o estado do lead", category: "CRM" },
  { value: "create_opportunity", label: "Criar Oportunidade", description: "Cria oportunidade se não existir", category: "CRM" },
  { value: "move_opportunity_stage", label: "Mover Etapa", description: "Move oportunidade para outra etapa", category: "CRM" },
  { value: "assign_owner", label: "Atribuir Responsável", description: "Define o responsável pela entidade", category: "CRM" },
  { value: "add_tag", label: "Adicionar Tag", description: "Adiciona uma tag à entidade", category: "CRM" },
  // Proposals
  { value: "create_proposal", label: "Criar Proposta", description: "Cria proposta a partir de um modelo", category: "Propostas" },
  { value: "send_proposal_link", label: "Enviar Link da Proposta", description: "Envia link da proposta via template", category: "Propostas" },
  // System
  { value: "wait_time", label: "Aguardar Tempo", description: "Pausa a automação por X tempo", category: "Sistema" },
  { value: "stop_automation", label: "Parar Automação", description: "Interrompe a execução da automação", category: "Sistema" },
];

// Operator options based on field type
const getOperatorsForFieldType = (fieldType: CustomFieldType | "text" | "number" | "email" | "status" | "tags" | "currency"): { value: ConditionOperator; label: string }[] => {
  switch (fieldType) {
    case "text":
    case "email":
      return [
        { value: "equals", label: "é igual a" },
        { value: "not_equals", label: "é diferente de" },
        { value: "contains", label: "contém" },
        { value: "not_contains", label: "não contém" },
        { value: "is_empty", label: "está vazio" },
        { value: "is_not_empty", label: "não está vazio" },
      ];
    case "number":
    case "currency":
      return [
        { value: "equals", label: "é igual a" },
        { value: "not_equals", label: "é diferente de" },
        { value: "greater_than", label: "é maior que" },
        { value: "less_than", label: "é menor que" },
        { value: "is_empty", label: "está vazio" },
        { value: "is_not_empty", label: "não está vazio" },
      ];
    case "select":
    case "status":
      return [
        { value: "equals", label: "é igual a" },
        { value: "not_equals", label: "é diferente de" },
      ];
    case "boolean":
      return [
        { value: "equals", label: "é verdadeiro" },
        { value: "not_equals", label: "é falso" },
      ];
    case "date":
      return [
        { value: "equals", label: "é igual a" },
        { value: "greater_than", label: "é depois de" },
        { value: "less_than", label: "é antes de" },
        { value: "is_empty", label: "está vazio" },
        { value: "is_not_empty", label: "não está vazio" },
      ];
    case "tags":
      return [
        { value: "contains", label: "contém" },
        { value: "not_contains", label: "não contém" },
        { value: "is_empty", label: "está vazio" },
        { value: "is_not_empty", label: "não está vazio" },
      ];
    default:
      return [
        { value: "equals", label: "é igual a" },
        { value: "not_equals", label: "é diferente de" },
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
  proposal: [
    { name: "title", label: "Título", type: "text" },
    { name: "price", label: "Valor", type: "number" },
    { name: "status", label: "Estado", type: "status" },
    { name: "views_count", label: "Visualizações", type: "number" },
  ],
  conversation: [
    { name: "channel", label: "Canal", type: "text" },
    { name: "status", label: "Estado", type: "status" },
    { name: "unread_count", label: "Não Lidas", type: "number" },
  ],
  scheduled: [],
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
  action_type: z.enum([
    "create_task", "move_opportunity_stage", "send_message", "notify_user", 
    "assign_owner", "add_tag", "create_opportunity", "update_field", 
    "send_template_message", "create_proposal", "send_proposal_link",
    "wait_time", "stop_automation", "change_lead_status"
  ]),
  config: z.record(z.unknown()),
  position: z.number(),
});

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  trigger: z.enum([
    "lead_created", "lead_updated", "lead_status_changed", "lead_no_response",
    "opportunity_created", "opportunity_updated", "opportunity_stage_changed", "opportunity_value_changed",
    "contact_created", "contact_updated", "company_created", "company_updated",
    "custom_field_updated", "payment_confirmed",
    "message_received", "conversation_no_reply",
    "proposal_created", "proposal_viewed", "proposal_paid",
    "scheduled_time"
  ]),
  trigger_config: z.object({
    custom_field_id: z.string().optional(),
    no_response_hours: z.number().optional(),
    scheduled_date: z.string().optional(),
  }).optional(),
  is_active: z.boolean(),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1, "Pelo menos uma ação é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

// Safety warnings component
function SafetyWarnings({ 
  trigger, 
  conditions, 
  actions 
}: { 
  trigger: AutomationTrigger;
  conditions: FormValues["conditions"];
  actions: FormValues["actions"];
}) {
  const entityType = getEntityFromTrigger(trigger);
  const modifiedFields = getModifiedFields(actions.map(a => ({
    action_type: a.action_type,
    config: a.config
  })));
  
  const loopCheck = detectPotentialLoop({
    trigger,
    conditions: conditions.map(c => ({
      field_name: c.field_name,
      operator: c.operator,
      value: c.value
    })),
    actions: actions.map(a => ({
      action_type: a.action_type,
      config: a.config
    }))
  });
  
  const criticalFields = getCriticalFieldsAffected(entityType, actions.map(a => ({
    action_type: a.action_type,
    config: a.config
  })));
  
  const showCriticalWarning = criticalFields.length > 0 && conditions.length === 0;
  
  if (!loopCheck.hasLoop && !showCriticalWarning) return null;
  
  return (
    <div className="space-y-3">
      <LoopDetectionWarning 
        potentialLoop={loopCheck.hasLoop}
        loopDetails={loopCheck.details}
      />
      {showCriticalWarning && (
        <CriticalFieldsWarning 
          entityType={entityType}
          fieldsBeingUpdated={modifiedFields}
        />
      )}
    </div>
  );
}

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
      trigger_config: {},
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

              {/* Custom Field Trigger Configuration */}
              {selectedTrigger === "custom_field_updated" && (
                <div className="mt-4">
                  <CustomFieldTriggerConfig 
                    control={form.control} 
                    name="trigger_config.custom_field_id" 
                  />
                </div>
              )}

              {/* Time-based Trigger Configuration */}
              {(selectedTrigger === "lead_no_response" || 
                selectedTrigger === "conversation_no_reply" || 
                selectedTrigger === "scheduled_time") && (
                <div className="mt-4">
                  <TimeTriggerConfig
                    trigger={selectedTrigger}
                    config={form.watch("trigger_config") || {}}
                    onChange={(config) => form.setValue("trigger_config", config)}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Conditions Section */}
            <Card className="border-dashed border-blue-200 dark:border-blue-900">
              <CardHeader className="py-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-500" />
                    <div>
                      <CardTitle className="text-sm">Só continuar se…</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Condições são opcionais e avaliadas antes das ações
                      </p>
                    </div>
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
              <CardContent className="space-y-3 pt-4">
                {conditionFields.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <Filter className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Sem condições — a regra será executada sempre que o gatilho ocorrer
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
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
                      Adicionar condição
                    </Button>
                  </div>
                ) : (
                  conditionFields.map((field, index) => {
                    const selectedFieldName = form.watch(`conditions.${index}.field_name`);
                    const selectedOperator = form.watch(`conditions.${index}.operator`);
                    const fieldInfo = getFieldInfo(selectedFieldName);
                    const operators = getOperatorsForField(selectedFieldName);

                    return (
                      <div key={field.id} className="flex gap-2 items-center p-3 bg-muted/30 rounded-lg border">
                        {index > 0 && (
                          <Badge variant="outline" className="text-xs shrink-0">E</Badge>
                        )}
                        
                        {/* Field selector */}
                        <FormField
                          control={form.control}
                          name={`conditions.${index}.field_name`}
                          render={({ field }) => (
                            <FormItem className="flex-1 space-y-1">
                              <FormLabel className="text-xs text-muted-foreground sr-only">Campo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
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
                            <FormItem className="w-40 space-y-1">
                              <FormLabel className="text-xs text-muted-foreground sr-only">Operador</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
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
                              <FormItem className="flex-1 space-y-1">
                                <FormLabel className="text-xs text-muted-foreground sr-only">Valor</FormLabel>
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
                                  {["Comunicação", "CRM", "Propostas", "Sistema"].map((category) => (
                                    <div key={category}>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                        {category}
                                      </div>
                                      {actionOptions
                                        .filter((opt) => opt.category === category)
                                        .map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            <div>
                                              <div>{opt.label}</div>
                                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                    </div>
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

                        {/* send_message removed - all messages must use templates */}

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

                        {actionType === "send_template_message" && (
                          <TemplateActionConfig 
                            form={form} 
                            index={index} 
                            entityType={entityType} 
                          />
                        )}

                        {(actionType === "create_proposal" || actionType === "send_proposal_link") && (
                          <ProposalActionConfig
                            actionType={actionType}
                            config={form.watch(`actions.${index}.config`) || {}}
                            onChange={(config) => form.setValue(`actions.${index}.config`, config)}
                          />
                        )}

                        {actionType === "wait_time" && (
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <FormField
                                control={form.control}
                                name={`actions.${index}.config.wait_days`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Dias</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        {...field}
                                        value={field.value as string || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`actions.${index}.config.wait_hours`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Horas</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="23"
                                        placeholder="0"
                                        {...field}
                                        value={field.value as string || ""}
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormDescription className="text-xs">
                              A automação aguardará este tempo antes de continuar para a próxima ação
                            </FormDescription>
                          </div>
                        )}

                        {actionType === "stop_automation" && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Esta ação irá parar a automação</span>
                            </div>
                            <p className="text-muted-foreground mt-1">
                              Nenhuma ação após esta será executada. Use com condições para criar fluxos condicionais.
                            </p>
                          </div>
                        )}

                        {actionType === "change_lead_status" && (
                          <FormField
                            control={form.control}
                            name={`actions.${index}.config.new_status`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Novo estado do lead</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value as string || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecionar estado" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="new">Novo</SelectItem>
                                    <SelectItem value="contacted">Contactado</SelectItem>
                                    <SelectItem value="qualified">Qualificado</SelectItem>
                                    <SelectItem value="proposal">Proposta</SelectItem>
                                    <SelectItem value="negotiation">Negociação</SelectItem>
                                    <SelectItem value="won">Ganho</SelectItem>
                                    <SelectItem value="lost">Perdido</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Safety Warnings */}
            <SafetyWarnings 
              trigger={selectedTrigger}
              conditions={form.watch("conditions")}
              actions={form.watch("actions")}
            />

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
