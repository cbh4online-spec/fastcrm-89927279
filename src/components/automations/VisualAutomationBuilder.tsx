import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Zap, 
  Filter, 
  PlayCircle, 
  ChevronDown,
  Save,
  Power,
  Pause,
  Copy,
  ArrowDown,
  GripVertical,
  Play
} from "lucide-react";
import { AutomationTestRunner } from "./AutomationTestRunner";
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useToggleAutomationRule,
  AutomationRule,
  AutomationTrigger,
  AutomationActionType,
  ConditionOperator,
} from "@/hooks/useAutomations";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useAgentMembers } from "@/hooks/useWorkspaceMembers";
import { useCustomFields, CustomField, CustomFieldType } from "@/hooks/useCustomFields";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Trigger options with human-readable labels
const triggerOptions: { value: AutomationTrigger; label: string; humanLabel: string; entity: string; requiresConfig?: boolean }[] = [
  { value: "lead_created", label: "Lead Criado", humanLabel: "When a lead is created", entity: "lead" },
  { value: "lead_updated", label: "Lead Atualizado", humanLabel: "When a lead is updated", entity: "lead" },
  { value: "lead_status_changed", label: "Estado do Lead Alterado", humanLabel: "When lead status changes", entity: "lead" },
  { value: "lead_no_response", label: "Lead Sem Resposta", humanLabel: "When a lead doesn't respond", entity: "lead", requiresConfig: true },
  { value: "opportunity_created", label: "Oportunidade Criada", humanLabel: "When an opportunity is created", entity: "opportunity" },
  { value: "opportunity_updated", label: "Oportunidade Atualizada", humanLabel: "When an opportunity is updated", entity: "opportunity" },
  { value: "opportunity_stage_changed", label: "Etapa de Oportunidade Alterada", humanLabel: "When opportunity stage changes", entity: "opportunity" },
  { value: "opportunity_value_changed", label: "Valor da Oportunidade Alterado", humanLabel: "When opportunity value changes", entity: "opportunity" },
  { value: "contact_created", label: "Contacto Criado", humanLabel: "When a contact is created", entity: "contact" },
  { value: "contact_updated", label: "Contacto Atualizado", humanLabel: "When a contact is updated", entity: "contact" },
  { value: "company_created", label: "Empresa Criada", humanLabel: "When a company is created", entity: "company" },
  { value: "company_updated", label: "Empresa Atualizada", humanLabel: "When a company is updated", entity: "company" },
  { value: "custom_field_updated", label: "Campo Personalizado Alterado", humanLabel: "When a custom field changes", entity: "any" },
  { value: "message_received", label: "Mensagem Recebida", humanLabel: "When a message is received", entity: "conversation" },
  { value: "conversation_no_reply", label: "Sem Resposta na Conversa", humanLabel: "When there's no reply", entity: "conversation", requiresConfig: true },
  { value: "proposal_created", label: "Proposta Criada", humanLabel: "When a proposal is created", entity: "proposal" },
  { value: "proposal_viewed", label: "Proposta Visualizada", humanLabel: "When a proposal is viewed", entity: "proposal" },
  { value: "proposal_paid", label: "Proposta Paga", humanLabel: "When a proposal is paid", entity: "proposal" },
  { value: "payment_confirmed", label: "Pagamento Confirmado", humanLabel: "When payment is confirmed", entity: "payment" },
  { value: "scheduled_time", label: "Data/Hora Agendada", humanLabel: "At scheduled time", entity: "scheduled", requiresConfig: true },
];

// Action options with human-readable labels
const actionOptions: { value: AutomationActionType; label: string; humanLabel: string; category: string }[] = [
  { value: "send_template_message", label: "Enviar Email/WhatsApp/DM", humanLabel: "Send message using template", category: "Communication" },
  { value: "notify_user", label: "Notificar Utilizador", humanLabel: "Notify a user", category: "Communication" },
  { value: "create_task", label: "Criar Tarefa", humanLabel: "Create a task", category: "CRM" },
  { value: "update_field", label: "Atualizar Campo", humanLabel: "Update a field", category: "CRM" },
  { value: "change_lead_status", label: "Alterar Estado do Lead", humanLabel: "Change lead status", category: "CRM" },
  { value: "create_opportunity", label: "Criar Oportunidade", humanLabel: "Create an opportunity", category: "CRM" },
  { value: "move_opportunity_stage", label: "Mover Etapa", humanLabel: "Move opportunity to stage", category: "CRM" },
  { value: "assign_owner", label: "Atribuir Responsável", humanLabel: "Assign owner", category: "CRM" },
  { value: "add_tag", label: "Adicionar Tag", humanLabel: "Add a tag", category: "CRM" },
  { value: "create_proposal", label: "Criar Proposta", humanLabel: "Create a proposal", category: "Proposals" },
  { value: "send_proposal_link", label: "Enviar Link da Proposta", humanLabel: "Send proposal link", category: "Proposals" },
  { value: "wait_time", label: "Aguardar Tempo", humanLabel: "Wait for time", category: "System" },
  { value: "stop_automation", label: "Parar Automação", humanLabel: "Stop automation", category: "System" },
];

// Operator options
const operatorLabels: Record<ConditionOperator, string> = {
  equals: "is equal to",
  not_equals: "is not equal to",
  contains: "contains",
  not_contains: "does not contain",
  greater_than: "is greater than",
  less_than: "is less than",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

const getOperatorsForFieldType = (fieldType: string): { value: ConditionOperator; label: string }[] => {
  switch (fieldType) {
    case "text":
    case "email":
      return [
        { value: "equals", label: "is equal to" },
        { value: "not_equals", label: "is not equal to" },
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "number":
    case "currency":
      return [
        { value: "equals", label: "is equal to" },
        { value: "not_equals", label: "is not equal to" },
        { value: "greater_than", label: "is greater than" },
        { value: "less_than", label: "is less than" },
        { value: "is_empty", label: "is empty" },
        { value: "is_not_empty", label: "is not empty" },
      ];
    case "select":
    case "status":
      return [
        { value: "equals", label: "is equal to" },
        { value: "not_equals", label: "is not equal to" },
      ];
    case "boolean":
      return [
        { value: "equals", label: "is true" },
        { value: "not_equals", label: "is false" },
      ];
    default:
      return [
        { value: "equals", label: "is equal to" },
        { value: "not_equals", label: "is not equal to" },
      ];
  }
};

// Core fields by entity
const coreFieldsByEntity: Record<string, { name: string; label: string; type: string }[]> = {
  lead: [
    { name: "name", label: "Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "source", label: "Source", type: "text" },
    { name: "status", label: "Status", type: "status" },
    { name: "tags", label: "Tags", type: "tags" },
  ],
  opportunity: [
    { name: "title", label: "Title", type: "text" },
    { name: "value", label: "Value", type: "number" },
    { name: "stage_id", label: "Stage", type: "select" },
    { name: "status", label: "Status", type: "status" },
  ],
  contact: [
    { name: "name", label: "Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "company", label: "Company", type: "text" },
  ],
  company: [
    { name: "name", label: "Name", type: "text" },
    { name: "industry", label: "Industry", type: "text" },
  ],
  payment: [
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "status" },
  ],
  proposal: [
    { name: "title", label: "Title", type: "text" },
    { name: "price", label: "Price", type: "number" },
    { name: "status", label: "Status", type: "status" },
  ],
  conversation: [
    { name: "channel", label: "Channel", type: "text" },
    { name: "status", label: "Status", type: "status" },
  ],
  scheduled: [],
  any: [],
};

const conditionSchema = z.object({
  field_name: z.string().min(1, "Field is required"),
  field_type: z.string().optional(),
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
  name: z.string().min(1, "Name is required"),
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
  actions: z.array(actionSchema).min(1, "At least one action is required"),
});

type FormValues = z.infer<typeof formSchema>;

// Visual Flow Node Component
interface FlowNodeProps {
  type: "trigger" | "condition" | "action";
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onRemove?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function FlowNode({ type, title, subtitle, children, onRemove, isFirst, isLast }: FlowNodeProps) {
  const colors = {
    trigger: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
    condition: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
    action: "border-green-500 bg-green-50 dark:bg-green-950/30",
  };

  const icons = {
    trigger: <Zap className="h-4 w-4 text-amber-500" />,
    condition: <Filter className="h-4 w-4 text-blue-500" />,
    action: <PlayCircle className="h-4 w-4 text-green-500" />,
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {!isFirst && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-4 bg-muted-foreground/30" />
          <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
      
      <div className={cn(
        "rounded-lg border-2 p-4 relative",
        colors[type]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icons[type]}
            <span className="font-medium text-sm">{title}</span>
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
        
        {/* Subtitle / Human readable */}
        {subtitle && (
          <p className="text-sm text-muted-foreground italic mb-3">"{subtitle}"</p>
        )}
        
        {/* Content */}
        {children}
      </div>
    </div>
  );
}

// Connector
function FlowConnector() {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-0.5 h-6 bg-muted-foreground/30" />
      <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: AutomationRule | null;
  onDuplicate?: (rule: AutomationRule) => void;
}

export function VisualAutomationBuilder({ open, onOpenChange, editRule, onDuplicate }: Props) {
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const { data: stages } = usePipelineStages();
  const { data: agents } = useAgentMembers();
  
  const { data: leadCustomFields } = useCustomFields("lead");
  const { data: opportunityCustomFields } = useCustomFields("opportunity");
  const { data: contactCustomFields } = useCustomFields("contact");
  const { data: companyCustomFields } = useCustomFields("company");

  const [isDraft, setIsDraft] = useState(true);
  const [showTestRunner, setShowTestRunner] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      trigger: "lead_created",
      trigger_config: {},
      is_active: false,
      conditions: [],
      actions: [{ action_type: "notify_user", config: {}, position: 0 }],
    },
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = 
    useFieldArray({ control: form.control, name: "conditions" });

  const { fields: actionFields, append: appendAction, remove: removeAction } = 
    useFieldArray({ control: form.control, name: "actions" });

  const selectedTrigger = form.watch("trigger");
  const isActive = form.watch("is_active");
  
  const entityType = useMemo(() => {
    return triggerOptions.find(t => t.value === selectedTrigger)?.entity || "lead";
  }, [selectedTrigger]);

  const customFieldsForEntity = useMemo(() => {
    switch (entityType) {
      case "lead": return leadCustomFields || [];
      case "opportunity": return opportunityCustomFields || [];
      case "contact": return contactCustomFields || [];
      case "company": return companyCustomFields || [];
      default: return [];
    }
  }, [entityType, leadCustomFields, opportunityCustomFields, contactCustomFields, companyCustomFields]);

  const availableFields = useMemo(() => {
    const coreFields = coreFieldsByEntity[entityType] || [];
    const customFields = customFieldsForEntity.map(cf => ({
      name: `custom:${cf.id}`,
      label: `${cf.name} (custom)`,
      type: cf.field_type,
      isCustom: true,
      customField: cf,
    }));
    return [...coreFields.map(f => ({ ...f, isCustom: false })), ...customFields];
  }, [entityType, customFieldsForEntity]);

  const selectedTriggerOption = triggerOptions.find(t => t.value === selectedTrigger);

  useEffect(() => {
    if (editRule) {
      form.reset({
        name: editRule.name,
        description: editRule.description || "",
        trigger: editRule.trigger,
        trigger_config: editRule.trigger_config || {},
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
      setIsDraft(!editRule.is_active);
    } else {
      form.reset({
        name: "",
        description: "",
        trigger: "lead_created",
        trigger_config: {},
        is_active: false,
        conditions: [],
        actions: [{ action_type: "notify_user", config: {}, position: 0 }],
      });
      setIsDraft(true);
    }
  }, [editRule, form, open]);

  const saveAutomation = async (activate: boolean) => {
    const values = form.getValues();
    const isValid = await form.trigger();
    
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      trigger: values.trigger,
      trigger_config: values.trigger_config,
      is_active: activate,
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

    try {
      if (editRule) {
        await updateRule.mutateAsync({ id: editRule.id, ...payload });
        toast.success(activate ? "Automation activated!" : "Automation saved as draft");
      } else {
        await createRule.mutateAsync(payload);
        toast.success(activate ? "Automation created and activated!" : "Automation saved as draft");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save automation");
    }
  };

  const handleSaveAsDraft = () => saveAutomation(false);
  const handleActivate = () => saveAutomation(true);
  
  const handlePause = async () => {
    if (editRule) {
      await toggleRule.mutateAsync({ id: editRule.id, is_active: !editRule.is_active });
      toast.success("Automation paused");
      onOpenChange(false);
    }
  };

  const handleDuplicate = () => {
    if (editRule && onDuplicate) {
      onDuplicate(editRule);
    }
  };

  const getFieldInfo = (fieldName: string) => {
    return availableFields.find(f => f.name === fieldName);
  };

  const operatorNeedsValue = (operator: ConditionOperator) => {
    return !["is_empty", "is_not_empty"].includes(operator);
  };

  const renderActionConfig = (index: number, actionType: AutomationActionType) => {
    switch (actionType) {
      case "create_task":
        return (
          <FormField
            control={form.control}
            name={`actions.${index}.config.task_title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Task title</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Follow up with lead" 
                    {...field}
                    value={(field.value as string) || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );
      
      case "add_tag":
        return (
          <FormField
            control={form.control}
            name={`actions.${index}.config.tag`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tag name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., urgent" 
                    {...field}
                    value={(field.value as string) || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case "change_lead_status":
        return (
          <FormField
            control={form.control}
            name={`actions.${index}.config.new_status`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">New status</FormLabel>
                <Select onValueChange={field.onChange} value={(field.value as string) || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        );

      case "move_opportunity_stage":
        return (
          <FormField
            control={form.control}
            name={`actions.${index}.config.stage_id`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Target stage</FormLabel>
                <Select onValueChange={field.onChange} value={(field.value as string) || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages?.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        );

      case "assign_owner":
        return (
          <FormField
            control={form.control}
            name={`actions.${index}.config.owner_id`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Assign to</FormLabel>
                <Select onValueChange={field.onChange} value={(field.value as string) || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        {agent.profile?.full_name || agent.profile?.email || agent.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        );

      case "wait_time":
        return (
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name={`actions.${index}.config.wait_days`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Days</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0}
                      placeholder="0"
                      {...field}
                      value={(field.value as number) || ""}
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
                <FormItem>
                  <FormLabel className="text-xs">Hours</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0}
                      max={23}
                      placeholder="0"
                      {...field}
                      value={(field.value as number) || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        );

      case "send_template_message":
        return (
          <TemplateActionConfig
            form={form}
            index={index}
            entityType={entityType}
          />
        );

      case "create_proposal":
      case "send_proposal_link":
        return (
          <ProposalActionConfig
            actionType={actionType}
            config={(form.watch(`actions.${index}.config`) as Record<string, unknown>) || {}}
            onChange={(newConfig) => form.setValue(`actions.${index}.config`, newConfig)}
          />
        );

      case "stop_automation":
        return (
          <p className="text-xs text-muted-foreground">
            This will stop the automation from executing further actions.
          </p>
        );

      default:
        return null;
    }
  };

  // Generate human-readable summary
  const generateSummary = () => {
    const trigger = selectedTriggerOption?.humanLabel || "When something happens";
    const conditions = conditionFields.map((_, i) => {
      const fieldName = form.watch(`conditions.${i}.field_name`);
      const operator = form.watch(`conditions.${i}.operator`);
      const value = form.watch(`conditions.${i}.value`);
      const field = getFieldInfo(fieldName);
      const opLabel = operatorLabels[operator] || operator;
      
      if (!fieldName) return null;
      
      const needsValue = operatorNeedsValue(operator);
      return `${field?.label || fieldName} ${opLabel}${needsValue && value ? ` "${value}"` : ""}`;
    }).filter(Boolean);
    
    const actions = actionFields.map((_, i) => {
      const actionType = form.watch(`actions.${i}.action_type`);
      const action = actionOptions.find(a => a.value === actionType);
      return action?.humanLabel || actionType;
    });

    return { trigger, conditions, actions };
  };

  const summary = generateSummary();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {editRule ? "Edit Automation" : "New Automation"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Form {...form}>
              <form className="space-y-6">
                {/* Name Input */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Automation Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Welcome new leads" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary Preview */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-2">Summary</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-amber-600 dark:text-amber-400">{summary.trigger}</span>
                    {summary.conditions.length > 0 && (
                      <>
                        , <span className="text-blue-600 dark:text-blue-400">if {summary.conditions.join(" and ")}</span>
                      </>
                    )}
                    {summary.actions.length > 0 && (
                      <>
                        , <span className="text-green-600 dark:text-green-400">then {summary.actions.join(", ")}</span>
                      </>
                    )}
                  </p>
                </div>

                <Separator />

                {/* Visual Flow */}
                <div className="space-y-4">
                  {/* Trigger Block */}
                  <FlowNode
                    type="trigger"
                    title="WHEN"
                    subtitle={selectedTriggerOption?.humanLabel}
                    isFirst
                  >
                    <FormField
                      control={form.control}
                      name="trigger"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trigger" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {triggerOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <span>{opt.humanLabel}</span>
                                    <Badge variant="outline" className="text-xs ml-auto">
                                      {opt.entity}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {/* Trigger-specific config */}
                    {selectedTrigger === "custom_field_updated" && (
                      <div className="mt-3">
                        <CustomFieldTriggerConfig 
                          control={form.control} 
                          name="trigger_config.custom_field_id" 
                        />
                      </div>
                    )}

                    {(selectedTrigger === "lead_no_response" || 
                      selectedTrigger === "conversation_no_reply" || 
                      selectedTrigger === "scheduled_time") && (
                      <div className="mt-3">
                        <TimeTriggerConfig
                          trigger={selectedTrigger}
                          config={form.watch("trigger_config") || {}}
                          onChange={(config) => form.setValue("trigger_config", config)}
                        />
                      </div>
                    )}
                  </FlowNode>

                  <FlowConnector />

                  {/* Conditions Block */}
                  <FlowNode
                    type="condition"
                    title="IF"
                    subtitle={conditionFields.length === 0 ? "No conditions (always runs)" : undefined}
                  >
                    <div className="space-y-3">
                      {conditionFields.map((field, index) => {
                        const selectedFieldName = form.watch(`conditions.${index}.field_name`);
                        const selectedOperator = form.watch(`conditions.${index}.operator`);
                        const fieldInfo = getFieldInfo(selectedFieldName);
                        const operators = getOperatorsForFieldType(fieldInfo?.type || "text");

                        return (
                          <div key={field.id} className="p-3 bg-background/50 rounded-lg border space-y-2">
                            <div className="flex items-center justify-between">
                              {index > 0 && (
                                <Badge variant="secondary" className="text-xs">AND</Badge>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-auto"
                                onClick={() => removeCondition(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <FormField
                                control={form.control}
                                name={`conditions.${index}.field_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Field" />
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
                                name={`conditions.${index}.operator`}
                                render={({ field }) => (
                                  <FormItem>
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

                              {operatorNeedsValue(selectedOperator) && (
                                <FormField
                                  control={form.control}
                                  name={`conditions.${index}.value`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          className="h-9"
                                          placeholder="Value"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
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
                        Add Condition
                      </Button>
                    </div>
                  </FlowNode>

                  <FlowConnector />

                  {/* Actions Block */}
                  <FlowNode
                    type="action"
                    title="THEN"
                    isLast
                  >
                    <div className="space-y-3">
                      {actionFields.map((field, index) => {
                        const actionType = form.watch(`actions.${index}.action_type`);
                        const actionOption = actionOptions.find(a => a.value === actionType);

                        return (
                          <div key={field.id} className="p-3 bg-background/50 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  Step {index + 1}
                                </Badge>
                              </div>
                              {actionFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeAction(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <FormField
                              control={form.control}
                              name={`actions.${index}.action_type`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select action" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {Object.entries(
                                        actionOptions.reduce((acc, opt) => {
                                          if (!acc[opt.category]) acc[opt.category] = [];
                                          acc[opt.category].push(opt);
                                          return acc;
                                        }, {} as Record<string, typeof actionOptions>)
                                      ).map(([category, options]) => (
                                        <div key={category}>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                            {category}
                                          </div>
                                          {options.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.humanLabel}
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />

                            {/* Action-specific config */}
                            {renderActionConfig(index, actionType)}
                          </div>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          appendAction({
                            action_type: "notify_user",
                            config: {},
                            position: actionFields.length,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Action
                      </Button>
                    </div>
                  </FlowNode>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveAsDraft}
              disabled={createRule.isPending || updateRule.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save as Draft
            </Button>
            
            {editRule && isActive && (
              <Button
                variant="outline"
                onClick={handlePause}
                disabled={toggleRule.isPending}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            
            {editRule && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowTestRunner(true)}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDuplicate}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
              </>
            )}
            
            <Button
              className="ml-auto"
              onClick={handleActivate}
              disabled={createRule.isPending || updateRule.isPending}
            >
              <Power className="h-4 w-4 mr-1" />
              {editRule && isActive ? "Save & Keep Active" : "Activate"}
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Test Runner Dialog */}
      {editRule && showTestRunner && (
        <AutomationTestRunner
          open={showTestRunner}
          onOpenChange={setShowTestRunner}
          rule={editRule}
        />
      )}
    </Sheet>
  );
}
