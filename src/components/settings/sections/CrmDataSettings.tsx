import { useState } from "react";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { CustomFieldsManager } from "@/components/custom-fields/CustomFieldsManager";
import { FormLayoutEditor } from "@/components/custom-fields/FormLayoutEditor";
import { IndustryLabelsSettings } from "../IndustryLabelsSettings";
import { ActivityProfileSettings } from "../ActivityProfileSettings";
import { HealthEngineSettings } from "../HealthEngineSettings";
import { AIPipelineGenerator } from "@/components/pipelines/AIPipelineGenerator";
import {
  Users,
  Briefcase,
  SlidersHorizontal,
  Kanban,
  Tags,
  Copy,
  FileUp,
  FileDown,
  Database,
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  LayoutList,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface CrmDataSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

type DialogType = 
  | "required-fields"
  | "default-values"
  | "lead-statuses"
  | "main-pipeline"
  | "multiple-pipelines"
  | "stage-probabilities"
  | "manage-tags"
  | "auto-tags"
  | "dedup-rules"
  | "merge-duplicates"
  | null;

// Required fields per entity
const requiredFieldsConfig = {
  leads: [
    { id: "name", name: "Nome", required: true, locked: true },
    { id: "email", name: "Email", required: true, locked: false },
    { id: "phone", name: "Telefone", required: false, locked: false },
    { id: "source", name: "Origem", required: true, locked: false },
    { id: "assigned_to", name: "Responsável", required: false, locked: false },
  ],
  contacts: [
    { id: "name", name: "Nome", required: true, locked: true },
    { id: "email", name: "Email", required: false, locked: false },
    { id: "phone", name: "Telefone", required: false, locked: false },
    { id: "company", name: "Empresa", required: false, locked: false },
  ],
  companies: [
    { id: "name", name: "Nome", required: true, locked: true },
    { id: "tax_id", name: "NIF", required: false, locked: false },
    { id: "industry", name: "Indústria", required: false, locked: false },
    { id: "phone", name: "Telefone", required: false, locked: false },
  ],
  opportunities: [
    { id: "name", name: "Nome", required: true, locked: true },
    { id: "value", name: "Valor", required: true, locked: false },
    { id: "stage", name: "Etapa", required: true, locked: true },
    { id: "expected_close", name: "Data Prevista", required: false, locked: false },
  ],
};

// Default values config
const defaultValuesConfig = {
  leads: [
    { id: "status", name: "Estado", value: "Novo" },
    { id: "source", name: "Origem", value: "Website" },
    { id: "priority", name: "Prioridade", value: "Normal" },
  ],
  contacts: [
    { id: "status", name: "Estado", value: "Ativo" },
  ],
  opportunities: [
    { id: "stage", name: "Etapa", value: "Qualificação" },
    { id: "probability", name: "Probabilidade", value: "20%" },
  ],
};

// Lead statuses
const leadStatusesConfig = [
  { id: "new", name: "Novo", color: "#3b82f6", isDefault: true, order: 1 },
  { id: "contacted", name: "Contactado", color: "#8b5cf6", isDefault: false, order: 2 },
  { id: "qualified", name: "Qualificado", color: "#10b981", isDefault: false, order: 3 },
  { id: "proposal", name: "Proposta", color: "#f59e0b", isDefault: false, order: 4 },
  { id: "negotiation", name: "Negociação", color: "#ec4899", isDefault: false, order: 5 },
  { id: "won", name: "Ganho", color: "#22c55e", isDefault: false, order: 6 },
  { id: "lost", name: "Perdido", color: "#ef4444", isDefault: false, order: 7 },
];

// Pipeline stages
const pipelineStagesConfig = [
  { id: "lead", name: "Lead", probability: 10, color: "#3b82f6", order: 1 },
  { id: "qualification", name: "Qualificação", probability: 20, color: "#8b5cf6", order: 2 },
  { id: "proposal", name: "Proposta", probability: 40, color: "#f59e0b", order: 3 },
  { id: "negotiation", name: "Negociação", probability: 60, color: "#ec4899", order: 4 },
  { id: "closing", name: "Fecho", probability: 80, color: "#10b981", order: 5 },
  { id: "won", name: "Ganho", probability: 100, color: "#22c55e", order: 6 },
  { id: "lost", name: "Perdido", probability: 0, color: "#ef4444", order: 7 },
];

// Tags
const tagsConfig = [
  { id: "hot", name: "Quente", color: "#ef4444", count: 45 },
  { id: "warm", name: "Morno", color: "#f59e0b", count: 78 },
  { id: "cold", name: "Frio", color: "#3b82f6", count: 120 },
  { id: "vip", name: "VIP", color: "#8b5cf6", count: 23 },
  { id: "partner", name: "Parceiro", color: "#10b981", count: 15 },
  { id: "priority", name: "Prioritário", color: "#ec4899", count: 34 },
];

// Auto tag rules
const autoTagRulesConfig = [
  { id: "1", tag: "Quente", condition: "Score > 80", entity: "Leads", enabled: true },
  { id: "2", tag: "VIP", condition: "Valor > 10.000€", entity: "Oportunidades", enabled: true },
  { id: "3", tag: "Frio", condition: "Sem atividade > 30 dias", entity: "Contactos", enabled: false },
];

// Deduplication rules
const dedupRulesConfig = [
  { id: "1", entity: "Contactos", field: "Email", action: "Alertar", enabled: true },
  { id: "2", entity: "Empresas", field: "NIF", action: "Bloquear", enabled: true },
  { id: "3", entity: "Leads", field: "Telefone", action: "Alertar", enabled: false },
];

// Sample duplicates
const duplicatesFound = [
  { id: "1", name: "João Silva", email: "joao@empresa.pt", duplicates: 2 },
  { id: "2", name: "Empresa ABC", nif: "123456789", duplicates: 3 },
  { id: "3", name: "Maria Costa", email: "maria@teste.com", duplicates: 2 },
];

export function CrmDataSettings({ searchQuery = "", matchedSections }: CrmDataSettingsProps) {
  const navigate = useNavigate();
  const hasSearch = searchQuery.trim().length > 0;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [industryLabelsOpen, setIndustryLabelsOpen] = useState(false);
  
  // State for configurations
  const [requiredFields, setRequiredFields] = useState(requiredFieldsConfig);
  const [defaultValues, setDefaultValues] = useState(defaultValuesConfig);
  const [leadStatuses, setLeadStatuses] = useState(leadStatusesConfig);
  const [pipelineStages, setPipelineStages] = useState(pipelineStagesConfig);
  const [tags, setTags] = useState(tagsConfig);
  const [autoTagRules, setAutoTagRules] = useState(autoTagRulesConfig);
  const [dedupRules, setDedupRules] = useState(dedupRulesConfig);
  const [newStatusName, setNewStatusName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const visibleSections = [
    { id: "crm-contacts", show: shouldShow("crm-contacts") },
    { id: "crm-custom-fields", show: shouldShow("crm-custom-fields") },
    { id: "crm-pipelines", show: shouldShow("crm-pipelines") },
    { id: "crm-tags", show: shouldShow("crm-tags") },
    { id: "crm-deduplication", show: shouldShow("crm-deduplication") },
    { id: "crm-import-export", show: shouldShow("crm-import-export") },
  ];

  const hasVisibleSections = visibleSections.some(s => s.show);

  const handleOpenDialog = (dialog: DialogType) => {
    setActiveDialog(dialog);
  };

  const handleSaveChanges = () => {
    toast.success("Alterações guardadas com sucesso!");
    setActiveDialog(null);
  };

  const toggleRequiredField = (entity: keyof typeof requiredFieldsConfig, id: string) => {
    setRequiredFields(prev => ({
      ...prev,
      [entity]: prev[entity].map(f => 
        f.id === id && !f.locked ? { ...f, required: !f.required } : f
      )
    }));
  };

  const toggleAutoTagRule = (id: string) => {
    setAutoTagRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleDedupRule = (id: string) => {
    setDedupRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const dialogContent: Record<NonNullable<DialogType>, { title: string; description: string }> = {
    "required-fields": {
      title: "Campos Obrigatórios",
      description: "Defina quais campos são obrigatórios ao criar novos registos.",
    },
    "default-values": {
      title: "Valores Predefinidos",
      description: "Configure valores padrão para novos registos.",
    },
    "lead-statuses": {
      title: "Estados de Lead",
      description: "Personalize os estados disponíveis para leads.",
    },
    "main-pipeline": {
      title: "Pipeline Principal",
      description: "Configure as etapas e cores do pipeline de vendas.",
    },
    "multiple-pipelines": {
      title: "Pipelines Múltiplos",
      description: "Crie pipelines adicionais para diferentes processos.",
    },
    "stage-probabilities": {
      title: "Probabilidades por Etapa",
      description: "Defina a percentagem de probabilidade de fecho por etapa.",
    },
    "manage-tags": {
      title: "Gerir Etiquetas",
      description: "Crie, edite e elimine etiquetas disponíveis.",
    },
    "auto-tags": {
      title: "Etiquetas Automáticas",
      description: "Configure regras para aplicar tags automaticamente.",
    },
    "dedup-rules": {
      title: "Regras de Duplicação",
      description: "Defina campos para identificar duplicados.",
    },
    "merge-duplicates": {
      title: "Fundir Duplicados",
      description: "Encontre e funda registos duplicados.",
    },
  };

  const renderDialogContent = () => {
    switch (activeDialog) {
      case "required-fields":
        return (
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="companies">Empresas</TabsTrigger>
              <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
            </TabsList>
            {(Object.keys(requiredFields) as Array<keyof typeof requiredFields>).map((entity) => (
              <TabsContent key={entity} value={entity} className="space-y-3 mt-4">
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {requiredFields[entity].map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{field.name}</span>
                          {field.locked && (
                            <Badge variant="secondary" className="text-xs">Sempre obrigatório</Badge>
                          )}
                        </div>
                        <Switch
                          checked={field.required}
                          onCheckedChange={() => toggleRequiredField(entity, field.id)}
                          disabled={field.locked}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "default-values":
        return (
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
            </TabsList>
            {(Object.keys(defaultValues) as Array<keyof typeof defaultValues>).map((entity) => (
              <TabsContent key={entity} value={entity} className="space-y-3 mt-4">
                <div className="space-y-3">
                  {defaultValues[entity].map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label>{field.name}</Label>
                      <Input defaultValue={field.value} placeholder={`Valor padrão para ${field.name}`} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Campo
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        );

      case "lead-statuses":
        return (
          <div className="space-y-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {leadStatuses.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm font-medium">{status.name}</span>
                      {status.isDefault && (
                        <Badge variant="secondary" className="text-xs">Padrão</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do novo estado"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        );

      case "main-pipeline":
        return (
          <div className="space-y-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {pipelineStages.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stage.probability}%</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Etapa
            </Button>
          </div>
        );

      case "multiple-pipelines":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {[
                { name: "Pipeline de Vendas", stages: 7, active: true },
                { name: "Pipeline de Parcerias", stages: 5, active: true },
                { name: "Pipeline de Renovações", stages: 4, active: false },
              ].map((pipeline, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{pipeline.name}</p>
                    <p className="text-xs text-muted-foreground">{pipeline.stages} etapas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={pipeline.active} />
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <AIPipelineGenerator
                onPipelineCreated={() => {
                  toast.success("Pipeline criado com sucesso!");
                  setActiveDialog(null);
                }}
                trigger={
                  <Button variant="outline" className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Criar com IA
                  </Button>
                }
              />
              <Button className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Criar Manual
              </Button>
            </div>
          </div>
        );

      case "stage-probabilities":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina a probabilidade de fecho para cada etapa do pipeline:
            </p>
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-3">
                {pipelineStages.filter(s => s.id !== "lost").map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20 text-right"
                        defaultValue={stage.probability}
                        min={0}
                        max={100}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case "manage-tags":
        return (
          <div className="space-y-4">
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium">{tag.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tag.count} registos
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        );

      case "auto-tags":
        return (
          <div className="space-y-4">
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {autoTagRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        Aplicar tag "{rule.tag}" quando {rule.condition}
                      </p>
                      <p className="text-xs text-muted-foreground">{rule.entity}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleAutoTagRule(rule.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra Automática
            </Button>
          </div>
        );

      case "dedup-rules":
        return (
          <div className="space-y-4">
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {dedupRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {rule.entity}: Verificar {rule.field}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ação: {rule.action}
                      </p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleDedupRule(rule.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        );

      case "merge-duplicates":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Duplicados Encontrados: {duplicatesFound.length}</p>
              <p className="text-xs text-muted-foreground">
                Última verificação: há 2 horas
              </p>
            </div>
            <ScrollArea className="h-[220px] pr-4">
              <div className="space-y-2">
                {duplicatesFound.map((dup) => (
                  <div key={dup.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{dup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dup.email || dup.nif}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{dup.duplicates} duplicados</Badge>
                      <Button variant="outline" size="sm">Fundir</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">Verificar Novamente</Button>
              <Button className="flex-1">Fundir Todos</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!hasVisibleSections && hasSearch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma definição encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Profiles - NEW */}
      {shouldShow("crm-contacts") && (
        <SettingsSection
          title="Perfis de Atividade"
          description="Adaptar o CRM automaticamente ao tipo de negócio e jornada do cliente"
          icon={<Briefcase className="h-5 w-5" />}
        >
          <ActivityProfileSettings />
        </SettingsSection>
      )}

      {/* Health Engine Config */}
      {shouldShow("crm-pipeline") && (
        <SettingsSection
          title="Health Engine"
          description="Configurar scoring de saúde e sensibilidade por valor dos negócios"
          icon={<HeartPulse className="h-5 w-5" />}
        >
          <HealthEngineSettings />
        </SettingsSection>
      )}

      {/* Industry Labels / Business Model */}
      {shouldShow("crm-contacts") && (
        <SettingsSection
          title="Modelo de Negócio"
          description="Personalizar a terminologia usada no CRM por tipo de negócio"
          icon={<Sparkles className="h-5 w-5" />}
        >
          <SettingsItem
            title="Linguagem do Negócio"
            description="Adaptar labels como 'Contactos' → 'Pacientes' (Saúde) ou 'Alunos' (Formação)"
            action={
              <Button variant="outline" onClick={() => setIndustryLabelsOpen(true)}>
                Configurar
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Contacts & Opportunities Settings */}
      {shouldShow("crm-contacts") && (
        <SettingsSection
          title="Contactos & Oportunidades"
          description="Configurações gerais das entidades do CRM"
          icon={<Users className="h-5 w-5" />}
        >
          <SettingsItem
            title="Campos Obrigatórios"
            description="Definir quais campos são obrigatórios ao criar registos"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("required-fields")}>
                Configurar
              </Button>
            }
          />
          <SettingsItem
            title="Valores Predefinidos"
            description="Definir valores padrão para novos registos"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("default-values")}>
                Configurar
              </Button>
            }
          />
          <SettingsItem
            title="Estados de Lead"
            description="Personalizar os estados disponíveis para leads"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("lead-statuses")}>
                Gerir Estados
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Industry Labels Dialog */}
      <IndustryLabelsSettings open={industryLabelsOpen} onOpenChange={setIndustryLabelsOpen} />

      {/* Form Layout Editor */}
      {shouldShow("crm-custom-fields") && (
        <SettingsSection
          title="Layout dos Formulários"
          description="Ordenar todos os campos (nativos e personalizados) nos formulários"
          icon={<LayoutList className="h-5 w-5" />}
        >
          <FormLayoutEditor />
        </SettingsSection>
      )}

      {/* Custom Fields */}
      {shouldShow("crm-custom-fields") && (
        <SettingsSection
          title="Campos Personalizados"
          description="Criar e gerir campos customizados para cada entidade"
          icon={<SlidersHorizontal className="h-5 w-5" />}
        >
          <CustomFieldsManager />
        </SettingsSection>
      )}

      {/* Pipelines */}
      {shouldShow("crm-pipelines") && (
        <SettingsSection
          title="Pipelines"
          description="Configurar etapas do pipeline de vendas"
          icon={<Kanban className="h-5 w-5" />}
        >
          <SettingsItem
            title="Pipeline Principal"
            description="Configurar etapas e cores do pipeline"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("main-pipeline")}>
                Editar Pipeline
              </Button>
            }
          />
          <SettingsItem
            title="Pipelines Múltiplos"
            description="Criar pipelines adicionais para diferentes processos"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("multiple-pipelines")}>
                Gerir Pipelines
              </Button>
            }
          />
          <SettingsItem
            title="Probabilidades por Etapa"
            description="Definir % de probabilidade de fecho por etapa"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("stage-probabilities")}>
                Configurar
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Tags */}
      {shouldShow("crm-tags") && (
        <SettingsSection
          title="Etiquetas (Tags)"
          description="Organizar registos com etiquetas coloridas"
          icon={<Tags className="h-5 w-5" />}
        >
          <SettingsItem
            title="Gerir Etiquetas"
            description="Criar, editar e eliminar etiquetas disponíveis"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("manage-tags")}>
                Gerir Tags
              </Button>
            }
          />
          <SettingsItem
            title="Etiquetas Automáticas"
            description="Aplicar tags automaticamente com base em regras"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("auto-tags")}>
                Configurar Regras
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Deduplication */}
      {shouldShow("crm-deduplication") && (
        <SettingsSection
          title="Deduplicação"
          description="Regras para evitar e fundir registos duplicados"
          icon={<Copy className="h-5 w-5" />}
          isPremium
        >
          <SettingsItem
            title="Regras de Duplicação"
            description="Definir campos para identificar duplicados"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("dedup-rules")}>
                Configurar
              </Button>
            }
          />
          <SettingsItem
            title="Fundir Duplicados"
            description="Encontrar e fundir registos duplicados"
            action={
              <Button variant="outline" onClick={() => handleOpenDialog("merge-duplicates")}>
                Verificar Duplicados
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Import / Export */}
      {shouldShow("crm-import-export") && (
        <SettingsSection
          title="Importação & Exportação"
          description="Importar dados de outras ferramentas ou exportar"
          icon={<Database className="h-5 w-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Importar Dados</p>
                  <p className="text-sm text-muted-foreground">CSV, Excel</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/dashboard/imports")}
              >
                Importar
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileDown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Exportar Dados</p>
                  <p className="text-sm text-muted-foreground">CSV, Excel</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => toast.success("Exportação iniciada. O ficheiro será enviado por email.")}
              >
                Exportar
              </Button>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Configuration Dialog */}
      <Dialog open={activeDialog !== null} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeDialog && dialogContent[activeDialog]?.title}
            </DialogTitle>
            <DialogDescription>
              {activeDialog && dialogContent[activeDialog]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderDialogContent()}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
