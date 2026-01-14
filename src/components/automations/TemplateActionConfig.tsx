import { useState, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Mail, 
  MessageSquare, 
  Instagram, 
  Phone,
  AlertTriangle,
  ListTodo,
  SkipForward,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useTemplates, Template, TemplateType } from "@/hooks/useTemplates";
import { extractVariables } from "@/lib/templateVariables";

interface TemplateActionConfigProps {
  form: UseFormReturn<any>;
  index: number;
  entityType: string;
}

const channelIcons: Record<TemplateType, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  instagram_dm: <Instagram className="h-4 w-4" />,
  proposal: <FileText className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
};

const channelLabels: Record<TemplateType, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  instagram_dm: "Instagram DM",
  proposal: "Proposta",
  sms: "SMS",
};

// Map entity types to compatible template variables
const entityVariablePrefix: Record<string, string> = {
  lead: "lead",
  opportunity: "opportunity",
  contact: "contact",
  company: "company",
};

export function TemplateActionConfig({ form, index, entityType }: TemplateActionConfigProps) {
  const { data: templates } = useTemplates({ isActive: true });
  const [selectedChannel, setSelectedChannel] = useState<TemplateType | "">("");

  const selectedTemplateId = form.watch(`actions.${index}.config.template_id`);
  const onMissingFields = form.watch(`actions.${index}.config.on_missing_fields`) || "create_task";

  // Filter templates by selected channel
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!selectedChannel) return templates;
    return templates.filter(t => t.type === selectedChannel);
  }, [templates, selectedChannel]);

  // Get selected template details
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId || !templates) return null;
    return templates.find(t => t.id === selectedTemplateId);
  }, [selectedTemplateId, templates]);

  // Analyze template variables and compatibility with entity type
  const variableAnalysis = useMemo(() => {
    if (!selectedTemplate) return null;

    const variables = extractVariables(selectedTemplate.content);
    const subjectVariables = selectedTemplate.subject 
      ? extractVariables(selectedTemplate.subject) 
      : [];
    
    const allVariables = [...new Set([...variables, ...subjectVariables])];
    
    // Check which variables can be auto-filled from event context
    const entityPrefix = entityVariablePrefix[entityType] || entityType;
    const autoFillable: string[] = [];
    const needsMapping: string[] = [];
    
    allVariables.forEach(variable => {
      const [prefix] = variable.replace("{{", "").replace("}}", "").split(".");
      if (prefix === entityPrefix || prefix === "user" || prefix === "date") {
        autoFillable.push(variable);
      } else {
        // Check if we can map from related entities
        if (entityType === "lead" && prefix === "opportunity") {
          needsMapping.push(variable);
        } else if (entityType === "opportunity" && prefix === "lead") {
          autoFillable.push(variable); // Opportunities usually have lead_id
        } else {
          needsMapping.push(variable);
        }
      }
    });

    return {
      total: allVariables.length,
      variables: allVariables,
      autoFillable,
      needsMapping,
      isFullyCompatible: needsMapping.length === 0,
    };
  }, [selectedTemplate, entityType]);

  // Get unique channels from available templates
  const availableChannels = useMemo(() => {
    if (!templates) return [];
    const channels = [...new Set(templates.map(t => t.type))];
    return channels;
  }, [templates]);

  return (
    <div className="space-y-4">
      {/* Channel Selection */}
      <FormField
        control={form.control}
        name={`actions.${index}.config.channel`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Canal</FormLabel>
            <Select 
              onValueChange={(value) => {
                field.onChange(value);
                setSelectedChannel(value as TemplateType);
                // Clear template when channel changes
                form.setValue(`actions.${index}.config.template_id`, "");
              }} 
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar canal" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableChannels.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    <div className="flex items-center gap-2">
                      {channelIcons[channel]}
                      {channelLabels[channel]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Template Selection */}
      <FormField
        control={form.control}
        name={`actions.${index}.config.template_id`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {filteredTemplates.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {selectedChannel 
                        ? `Nenhum template de ${channelLabels[selectedChannel as TemplateType]} disponível`
                        : "Selecione um canal primeiro"
                      }
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {channelIcons[template.type]}
                          <span>{template.name}</span>
                          {template.goal && (
                            <Badge variant="outline" className="text-xs">
                              {template.goal}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Variable Analysis */}
      {selectedTemplate && variableAnalysis && (
        <div className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Variáveis do template</span>
              <Badge variant={variableAnalysis.isFullyCompatible ? "default" : "secondary"}>
                {variableAnalysis.autoFillable.length}/{variableAnalysis.total} automáticas
              </Badge>
            </div>

            {variableAnalysis.autoFillable.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {variableAnalysis.autoFillable.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {v}
                  </Badge>
                ))}
              </div>
            )}

            {variableAnalysis.needsMapping.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {variableAnalysis.needsMapping.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {variableAnalysis.needsMapping.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {variableAnalysis.needsMapping.length} variável(is) não podem ser preenchidas automaticamente 
                a partir do contexto de {entityType}. Configure abaixo o que fazer quando faltarem dados.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Missing Fields Behavior */}
      {selectedTemplate && (
        <FormField
          control={form.control}
          name={`actions.${index}.config.on_missing_fields`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quando faltarem dados</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || "create_task"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="create_task">
                    <div className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-blue-500" />
                      <div>
                        <div>Criar tarefa para revisão</div>
                        <div className="text-xs text-muted-foreground">
                          Cria tarefa para um agente preencher manualmente
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="skip_and_log">
                    <div className="flex items-center gap-2">
                      <SkipForward className="h-4 w-4 text-amber-500" />
                      <div>
                        <div>Saltar e registar</div>
                        <div className="text-xs text-muted-foreground">
                          Não envia, apenas regista no log
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="send_partial">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-green-500" />
                      <div>
                        <div>Enviar mesmo assim</div>
                        <div className="text-xs text-muted-foreground">
                          Envia com variáveis em branco
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {onMissingFields === "create_task" && "Uma tarefa será criada para um agente completar a mensagem."}
                {onMissingFields === "skip_and_log" && "A ação será ignorada mas registada nos logs para análise."}
                {onMissingFields === "send_partial" && "A mensagem será enviada com campos vazios."}
              </FormDescription>
            </FormItem>
          )}
        />
      )}

      {/* Task Assignment for create_task option */}
      {selectedTemplate && onMissingFields === "create_task" && (
        <FormField
          control={form.control}
          name={`actions.${index}.config.task_title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da tarefa (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder={`Completar mensagem para {{${entityType}.name}}`}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Título personalizado para a tarefa de revisão
              </FormDescription>
            </FormItem>
          )}
        />
      )}

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="p-3 bg-muted/30 rounded-lg space-y-2 border">
          <div className="text-xs font-medium text-muted-foreground uppercase">
            Pré-visualização do template
          </div>
          {selectedTemplate.subject && (
            <div className="text-sm">
              <span className="text-muted-foreground">Assunto:</span>{" "}
              <span className="font-medium">{selectedTemplate.subject}</span>
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap max-h-[100px] overflow-y-auto">
            {selectedTemplate.content}
          </div>
        </div>
      )}
    </div>
  );
}
