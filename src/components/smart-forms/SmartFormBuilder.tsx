import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  FileText,
  Settings,
  Zap,
  BarChart3,
  MessageSquare,
  Loader2,
  ArrowLeft,
  Save,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { SmartForm, SmartFormField, ScoringRule, FormType, FORM_TEMPLATES, AutomationConfig, FormSettings } from '@/types/smartForm';
import { useCreateSmartForm, useUpdateSmartForm, useGenerateFormWithAI } from '@/hooks/useSmartForms';
import { FormFieldEditor } from '@/components/form-studio/FormFieldEditor';
import { FormField } from '@/types/formSchema';
import { toast } from 'sonner';

interface SmartFormBuilderProps {
  form?: SmartForm;
  onBack: () => void;
  onPreview?: (form: Partial<SmartForm>) => void;
}

const DEFAULT_SETTINGS: FormSettings = {
  submitButtonText: 'Enviar',
  successMessage: 'Obrigado pela sua submissão!',
  showProgressBar: true,
  allowMultipleSubmissions: false,
  requireAuth: false,
  theme: 'auto',
};

const DEFAULT_AUTOMATION: AutomationConfig = {
  createLead: true,
  createContact: false,
  createCompany: false,
  createOpportunity: false,
  triggerAutomations: [],
  sendEmail: false,
  notifyUsers: [],
};

export function SmartFormBuilder({ form, onBack, onPreview }: SmartFormBuilderProps) {
  const [mode, setMode] = useState<'ai' | 'manual'>(form ? 'manual' : 'ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [name, setName] = useState(form?.name || '');
  const [description, setDescription] = useState(form?.description || '');
  const [formType, setFormType] = useState<FormType>(form?.form_type || 'lead_capture');
  const [isConversational, setIsConversational] = useState(form?.is_conversational || false);
  const [isInternal, setIsInternal] = useState(form?.is_internal || false);
  const [fields, setFields] = useState<SmartFormField[]>(form?.schema?.fields || []);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>(form?.scoring_rules || []);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(form?.automation_config || DEFAULT_AUTOMATION);
  const [settings, setSettings] = useState<FormSettings>(form?.settings || DEFAULT_SETTINGS);

  // Field editor state
  const [editingField, setEditingField] = useState<SmartFormField | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const createForm = useCreateSmartForm();
  const updateForm = useUpdateSmartForm();
  const generateWithAI = useGenerateFormWithAI();

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Por favor, descreve o objetivo do formulário');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateWithAI.mutateAsync(aiPrompt);
      
      if (result) {
        setName(result.name || 'Formulário Gerado');
        setDescription(result.description || '');
        setFormType(result.form_type || 'lead_capture');
        setIsConversational(result.is_conversational || false);
        setFields(result.fields || []);
        setScoringRules(result.scoringRules || []);
        setMode('manual');
        toast.success('Formulário gerado com sucesso!');
      }
    } catch {
      toast.error('Erro ao gerar formulário');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyTemplate = (type: FormType) => {
    const template = FORM_TEMPLATES[type];
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setFormType(type);
      setFields(template.suggestedFields.map((f, i) => ({
        id: f.id || `field_${i + 1}`,
        label: f.label || 'Campo',
        type: f.type || 'text',
        required: f.required || false,
        placeholder: f.placeholder,
        helpText: f.helpText,
        options: f.options,
        enrichmentSource: f.enrichmentSource,
      })) as SmartFormField[]);
      setMode('manual');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome do formulário é obrigatório');
      return;
    }

    const formData: Partial<SmartForm> = {
      name,
      description,
      form_type: formType,
      is_conversational: isConversational,
      is_internal: isInternal,
      schema: {
        fields,
        scoringRules,
        conditions: [],
        automationConfig,
        settings,
      },
      scoring_rules: scoringRules,
      conditions: [],
      automation_config: automationConfig,
      settings,
    };

    if (form?.id) {
      await updateForm.mutateAsync({ id: form.id, ...formData });
    } else {
      await createForm.mutateAsync(formData);
    }
    
    onBack();
  };

  const handleAddField = () => {
    setEditingField(null);
    setEditorOpen(true);
  };

  const handleEditField = (field: SmartFormField) => {
    setEditingField(field);
    setEditorOpen(true);
  };

  const handleSaveField = (field: FormField) => {
    const smartField: SmartFormField = {
      ...field,
      type: field.type as SmartFormField['type'],
    };

    if (editingField) {
      setFields(prev => prev.map(f => f.id === editingField.id ? smartField : f));
    } else {
      setFields(prev => [...prev, smartField]);
    }
    setEditorOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleAddScoringRule = () => {
    const newRule: ScoringRule = {
      id: `rule_${Date.now()}`,
      fieldId: fields[0]?.id || '',
      condition: 'equals',
      value: '',
      scoreChange: 10,
      temperatureEffect: 'none',
    };
    setScoringRules(prev => [...prev, newRule]);
  };

  const handleUpdateScoringRule = (index: number, updates: Partial<ScoringRule>) => {
    setScoringRules(prev => prev.map((rule, i) => i === index ? { ...rule, ...updates } : rule));
  };

  const handleDeleteScoringRule = (index: number) => {
    setScoringRules(prev => prev.filter((_, i) => i !== index));
  };

  // AI Mode View
  if (mode === 'ai' && !form) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Criar Formulário Inteligente</h2>
            <p className="text-muted-foreground">Diz o objetivo. Eu trato da estrutura.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente IA
            </CardTitle>
            <CardDescription>
              Descreve o formulário que precisas. A IA vai sugerir campos, regras de scoring e automações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Quero um formulário para captar leads de serviços de marketing. Preciso de saber o orçamento, urgência e tipo de serviço pretendido."
              className="min-h-[120px]"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateWithAI} 
                disabled={isGenerating || !aiPrompt.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Formulário
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setMode('manual')}>
                Criar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Ou começa com um template</CardTitle>
            <CardDescription>Templates otimizados para diferentes objetivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(FORM_TEMPLATES) as FormType[]).filter(t => t !== 'internal').map((type) => {
                const template = FORM_TEMPLATES[type];
                return (
                  <Card 
                    key={type}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleApplyTemplate(type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.suggestedFields.length} campos
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Score base: {template.baseScore}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual Builder View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{form ? 'Editar Formulário' : 'Novo Formulário'}</h2>
            <p className="text-muted-foreground">Configure os campos, scoring e automações</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onPreview && (
            <Button variant="outline" onClick={() => onPreview({ name, description, schema: { fields, scoringRules, conditions: [], automationConfig, settings }, is_conversational: isConversational })}>
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </Button>
          )}
          <Button onClick={handleSave} disabled={createForm.isPending || updateForm.isPending}>
            {(createForm.isPending || updateForm.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do Formulário</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pedido de Orçamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as FormType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FORM_TEMPLATES) as FormType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {FORM_TEMPLATES[type].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do propósito do formulário"
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Conversacional</Label>
                  <p className="text-sm text-muted-foreground">Uma pergunta de cada vez</p>
                </div>
                <Switch checked={isConversational} onCheckedChange={setIsConversational} />
              </div>
            </CardContent>
          </Card>

          {/* Fields */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Campos do Formulário</CardTitle>
                <CardDescription>Arrasta para reordenar</CardDescription>
              </div>
              <Button size="sm" onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Campo
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum campo adicionado</p>
                  <Button variant="link" onClick={handleAddField}>
                    Adicionar primeiro campo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{field.label}</span>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                          {field.enrichmentSource && (
                            <Badge variant="outline" className="text-xs text-primary">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {field.enrichmentSource}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditField(field)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteField(field.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scoring Rules */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Regras de Scoring
                </CardTitle>
                <CardDescription>Pontua automaticamente cada submissão</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddScoringRule} disabled={fields.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent>
              {scoringRules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sem regras de scoring. Adiciona regras para qualificar leads automaticamente.
                </p>
              ) : (
                <div className="space-y-3">
                  {scoringRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center gap-2 p-3 rounded-lg border">
                      <Select
                        value={rule.fieldId}
                        onValueChange={(v) => handleUpdateScoringRule(index, { fieldId: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={rule.condition}
                        onValueChange={(v) => handleUpdateScoringRule(index, { condition: v as ScoringRule['condition'] })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Igual a</SelectItem>
                          <SelectItem value="contains">Contém</SelectItem>
                          <SelectItem value="greater_than">Maior que</SelectItem>
                          <SelectItem value="less_than">Menor que</SelectItem>
                          <SelectItem value="is_corporate_email">Email corporativo</SelectItem>
                        </SelectContent>
                      </Select>

                      {rule.condition !== 'is_corporate_email' && (
                        <Input
                          value={String(rule.value || '')}
                          onChange={(e) => handleUpdateScoringRule(index, { value: e.target.value })}
                          placeholder="Valor"
                          className="w-24"
                        />
                      )}

                      <Input
                        type="number"
                        value={rule.scoreChange}
                        onChange={(e) => handleUpdateScoringRule(index, { scoreChange: Number(e.target.value) })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">pts</span>

                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-auto" onClick={() => handleDeleteScoringRule(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Automations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Automações
              </CardTitle>
              <CardDescription>O que acontece após submissão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Criar Lead</Label>
                <Switch
                  checked={automationConfig.createLead}
                  onCheckedChange={(v) => setAutomationConfig(prev => ({ ...prev, createLead: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Criar Contacto</Label>
                <Switch
                  checked={automationConfig.createContact}
                  onCheckedChange={(v) => setAutomationConfig(prev => ({ ...prev, createContact: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Criar Empresa</Label>
                <Switch
                  checked={automationConfig.createCompany}
                  onCheckedChange={(v) => setAutomationConfig(prev => ({ ...prev, createCompany: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Criar Oportunidade</Label>
                  <p className="text-xs text-muted-foreground">Se score ≥ 50</p>
                </div>
                <Switch
                  checked={automationConfig.createOpportunity}
                  onCheckedChange={(v) => setAutomationConfig(prev => ({ ...prev, createOpportunity: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Enviar Email</Label>
                <Switch
                  checked={automationConfig.sendEmail}
                  onCheckedChange={(v) => setAutomationConfig(prev => ({ ...prev, sendEmail: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  value={settings.submitButtonText}
                  onChange={(e) => setSettings(prev => ({ ...prev, submitButtonText: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Sucesso</Label>
                <Textarea
                  value={settings.successMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, successMessage: e.target.value }))}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Barra de Progresso</Label>
                <Switch
                  checked={settings.showProgressBar}
                  onCheckedChange={(v) => setSettings(prev => ({ ...prev, showProgressBar: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Formulário Interno</Label>
                  <p className="text-xs text-muted-foreground">Só para equipa</p>
                </div>
                <Switch
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Editor Dialog */}
      <FormFieldEditor
        field={editingField as FormField | undefined}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveField}
      />
    </div>
  );
}
