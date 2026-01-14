import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FormSchema } from '@/types/formSchema';
import {
  CrmBlueprint,
  BlueprintClarifyingQuestion,
  BlueprintGenerationResponse,
} from '@/types/blueprint';
import { ConversationalQuestions } from './ConversationalQuestions';
import { BlueprintPreview } from './BlueprintPreview';
import { BlueprintApplyPreview, ApplyMode, ApplyResult } from './BlueprintApplyPreview';
import { TemplateSelector } from './TemplateSelector';
import { SavedBlueprintsList } from './SavedBlueprintsList';
import { BlueprintVersionHistory } from './BlueprintVersionHistory';
import { BlueprintRefineChat } from './BlueprintRefineChat';
import { useBlueprintApply } from '@/hooks/useBlueprintApply';
import { useBlueprintVersions } from '@/hooks/useBlueprintVersions';
import { BlueprintTemplate } from '@/data/blueprintTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  LayoutTemplate,
  ArrowRight,
  FolderOpen,
  MessageCircle,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQueryClient } from '@tanstack/react-query';

interface BlueprintGeneratorProps {
  formSchema?: FormSchema;
  onBlueprintSaved?: (blueprint: CrmBlueprint) => void;
}

type GeneratorStep = 'select' | 'customize' | 'clarifying' | 'preview' | 'refine' | 'apply';
type GeneratorMode = 'template' | 'scratch' | 'import';

export function BlueprintGenerator({ formSchema, onBlueprintSaved }: BlueprintGeneratorProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<GeneratorStep>('select');
  const [mode, setMode] = useState<GeneratorMode | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BlueprintTemplate | null>(null);
  const [customizationPrompt, setCustomizationPrompt] = useState('');
  const [naturalDescription, setNaturalDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<BlueprintClarifyingQuestion[]>([]);
  const [blueprint, setBlueprint] = useState<CrmBlueprint | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [recommendedTemplate, setRecommendedTemplate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedFromDraft, setLoadedFromDraft] = useState(false);
  const [existingBlueprintId, setExistingBlueprintId] = useState<string | null>(null);
  const [originalBlueprint, setOriginalBlueprint] = useState<CrmBlueprint | null>(null);

  const {
    isApplying,
    existingFields,
    existingStages,
    existingAutomations,
    duplicates,
    applyBlueprint,
  } = useBlueprintApply(blueprint);

  const { createVersion } = useBlueprintVersions(existingBlueprintId);

  const handleSelectTemplate = (template: BlueprintTemplate) => {
    setSelectedTemplate(template);
    setMode('template');
    setStep('customize');
  };

  const handleStartFromScratch = () => {
    setSelectedTemplate(null);
    setMode('scratch');
    setStep('customize');
  };

  const handleImportForm = () => {
    if (!formSchema) {
      toast.error('Nenhum formulário disponível. Crie um no Form Studio primeiro.');
      return;
    }
    setMode('import');
    setStep('customize');
  };

  const handleGenerate = async (clarifyingAnswers?: Record<string, string | string[]>) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-blueprint', {
        body: {
          formSchema: mode === 'import' ? formSchema : undefined,
          naturalLanguageDescription: mode === 'scratch' ? naturalDescription : undefined,
          template: selectedTemplate?.blueprint,
          templateId: selectedTemplate?.id,
          customizationPrompt: customizationPrompt || undefined,
          clarifyingAnswers,
          mode,
        },
      });

      if (error) throw error;

      const response = data as BlueprintGenerationResponse & { recommendedTemplateId?: string };

      if (response.recommendedTemplateId) {
        setRecommendedTemplate(response.recommendedTemplateId);
      }

      if (response.needsClarification && response.questions) {
        setQuestions(response.questions);
        setStep('clarifying');
      } else if (response.blueprint) {
        setBlueprint(response.blueprint);
        setConfidence(response.confidence || null);
        setExplanation(response.explanation || '');
        setStep('preview');
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error: any) {
      console.error('Error generating blueprint:', error);
      if (error.message?.includes('429')) {
        toast.error('Limite de pedidos excedido. Tente novamente mais tarde.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos AI esgotados. Adicione créditos para continuar.');
      } else {
        toast.error('Erro ao gerar blueprint. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarifyingSubmit = (answers: Record<string, string | string[]>) => {
    handleGenerate(answers);
  };

  const handleSave = async () => {
    if (!blueprint || !currentWorkspace) return;

    setIsSaving(true);
    try {
      if (existingBlueprintId) {
        // Save current version to history before updating
        await createVersion({
          blueprintId: existingBlueprintId,
          version: blueprint.version,
          schema: blueprint,
          changeSummary: `Versão ${blueprint.version} guardada`,
        });

        // Update existing blueprint
        const { error } = await supabase
          .from('crm_blueprints')
          .update({
            name: blueprint.name,
            version: blueprint.version + 1,
            entity_type: blueprint.entityType,
            schema: JSON.parse(JSON.stringify(blueprint)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBlueprintId);

        if (error) throw error;

        // Update local blueprint version
        setBlueprint({
          ...blueprint,
          version: blueprint.version + 1,
        });

        toast.success('Blueprint atualizado com sucesso!');
      } else {
        // Insert new blueprint
        const { data, error } = await supabase
          .from('crm_blueprints')
          .insert([{
            workspace_id: currentWorkspace.id,
            name: blueprint.name,
            version: blueprint.version,
            entity_type: blueprint.entityType,
            schema: JSON.parse(JSON.stringify(blueprint)),
            status: 'draft',
          }])
          .select('id')
          .single();

        if (error) throw error;

        // Create initial version in history
        await createVersion({
          blueprintId: data.id,
          version: blueprint.version,
          schema: blueprint,
          changeSummary: 'Versão inicial',
        });

        // Track the new blueprint ID for future updates
        setExistingBlueprintId(data.id);
        setLoadedFromDraft(true);

        toast.success('Blueprint guardado com sucesso!');
      }

      // Invalidate the blueprints cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['blueprints', currentWorkspace.id] });

      onBlueprintSaved?.(blueprint);
    } catch (error) {
      console.error('Error saving blueprint:', error);
      toast.error('Erro ao guardar blueprint.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = (restoredBlueprint: CrmBlueprint) => {
    setBlueprint(restoredBlueprint);
    toast.info('Versão restaurada. Guarde para aplicar as alterações.');
  };

  const handleLoadDraft = (loadedBlueprint: CrmBlueprint, dbId: string) => {
    setBlueprint(loadedBlueprint);
    setExistingBlueprintId(dbId);
    setConfidence(null);
    setExplanation('Carregado de rascunho guardado.');
    setLoadedFromDraft(true);
    setStep('preview');
    toast.success(`Blueprint "${loadedBlueprint.name}" carregado!`);
  };

  const handleExport = () => {
    if (!blueprint) return;

    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${blueprint.name.toLowerCase().replace(/\s+/g, '-')}-v${blueprint.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Blueprint exportado!');
  };

  const handleReset = () => {
    setStep('select');
    setMode(null);
    setSelectedTemplate(null);
    setCustomizationPrompt('');
    setNaturalDescription('');
    setQuestions([]);
    setBlueprint(null);
    setConfidence(null);
    setExplanation('');
    setRecommendedTemplate(null);
    setLoadedFromDraft(false);
    setExistingBlueprintId(null);
  };

  const handleApply = async (applyMode: ApplyMode, mergeDecisions: Record<string, 'create' | 'merge' | 'skip'>): Promise<ApplyResult> => {
    const result = await applyBlueprint(applyMode, mergeDecisions);
    return result;
  };

  const handleProceedToApply = () => {
    setStep('apply');
  };

  const handleStartRefine = () => {
    if (blueprint) {
      setOriginalBlueprint(JSON.parse(JSON.stringify(blueprint)));
      setStep('refine');
    }
  };

  const handleRefineComplete = () => {
    setStep('preview');
    toast.success('Blueprint refinado com sucesso!');
  };

  const handleRefineCancel = () => {
    if (originalBlueprint) {
      setBlueprint(originalBlueprint);
    }
    setOriginalBlueprint(null);
    setStep('preview');
  };

  const handleBlueprintUpdated = (updatedBlueprint: CrmBlueprint) => {
    setBlueprint(updatedBlueprint);
  };

  const handleUseTemplateDirectly = () => {
    if (!selectedTemplate) return;

    const newBlueprint: CrmBlueprint = {
      id: crypto.randomUUID(),
      version: 1,
      name: selectedTemplate.blueprint.name,
      description: selectedTemplate.blueprint.description,
      entityType: selectedTemplate.blueprint.entityType,
      customFields: selectedTemplate.blueprint.customFields,
      sections: selectedTemplate.blueprint.sections,
      pipelineStages: selectedTemplate.blueprint.pipelineStages,
      automations: selectedTemplate.blueprint.automations,
      dedupeRules: selectedTemplate.blueprint.dedupeRules,
      mappingRules: selectedTemplate.blueprint.mappingRules,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
      },
    };

    setBlueprint(newBlueprint);
    setConfidence(1);
    setExplanation('Template aplicado diretamente sem personalização.');
    setStep('preview');
  };

  const getStepNumber = () => {
    switch (step) {
      case 'select': return 1;
      case 'customize': return 2;
      case 'clarifying': return 3;
      case 'preview': return 4;
      case 'refine': return 5;
      case 'apply': return 6;
      default: return 1;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { num: 1, label: 'Escolher Modo' },
          { num: 2, label: 'Personalizar' },
          { num: 3, label: 'Clarificação' },
          { num: 4, label: 'Pré-visualização' },
          { num: 5, label: 'Refinar' },
          { num: 6, label: 'Aplicar' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2 shrink-0">
            {idx > 0 && <Separator className="w-4 md:w-8" />}
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepNumber() === s.num ? 'bg-primary text-primary-foreground' : 
                getStepNumber() > s.num ? 'bg-primary/20 text-primary' : 'bg-muted'
              }`}>
                {getStepNumber() > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span className="text-sm hidden md:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Select Mode */}
      {step === 'select' && (
        <div className="space-y-6">
          <TemplateSelector
            onSelectTemplate={handleSelectTemplate}
            onStartFromScratch={handleStartFromScratch}
            onImportForm={handleImportForm}
            selectedTemplate={selectedTemplate}
          />
          
          {/* Saved Blueprints List */}
          <SavedBlueprintsList onLoadBlueprint={handleLoadDraft} />
        </div>
      )}

      {/* Step 2: Customize */}
      {step === 'customize' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === 'template' && selectedTemplate && (
                <>
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  Personalizar: {selectedTemplate.name}
                </>
              )}
              {mode === 'scratch' && (
                <>
                  <Sparkles className="h-5 w-5" />
                  Descrever CRM Pretendido
                </>
              )}
              {mode === 'import' && formSchema && (
                <>
                  <LayoutTemplate className="h-5 w-5" />
                  Adaptar Template ao Formulário
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template mode */}
            {mode === 'template' && selectedTemplate && (
              <>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{selectedTemplate.blueprint.name}</span>
                    <Badge variant="secondary">{selectedTemplate.industry}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{selectedTemplate.blueprint.customFields.length} campos</Badge>
                    <Badge variant="outline">{selectedTemplate.blueprint.sections.length} secções</Badge>
                    {selectedTemplate.blueprint.pipelineStages && (
                      <Badge variant="outline">{selectedTemplate.blueprint.pipelineStages.length} etapas</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Personalizações (opcional)</label>
                  <Textarea
                    value={customizationPrompt}
                    onChange={(e) => setCustomizationPrompt(e.target.value)}
                    placeholder="Descreva quaisquer personalizações que pretende...&#10;&#10;Exemplo: Adicionar campo para orçamento em dólares, remover etapa de negociação, adicionar automação para leads urgentes."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUseTemplateDirectly} variant="outline" className="flex-1">
                    Usar Template Diretamente
                  </Button>
                  <Button onClick={() => handleGenerate()} disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A personalizar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Personalizar com AI
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Scratch mode */}
            {mode === 'scratch' && (
              <>
                <Textarea
                  value={naturalDescription}
                  onChange={(e) => setNaturalDescription(e.target.value)}
                  placeholder="Descreva o tipo de CRM que pretende configurar...&#10;&#10;Exemplo: Preciso de um CRM para uma agência imobiliária. Os leads vêm de formulários de visita a imóveis. Quero acompanhar o interesse, orçamento, tipo de imóvel pretendido e etapa de negociação."
                  className="min-h-[150px]"
                />
                <Button
                  onClick={() => handleGenerate()}
                  disabled={isLoading || !naturalDescription.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Blueprint
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Import mode */}
            {mode === 'import' && formSchema && (
              <>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formSchema.title}</span>
                    <Badge variant="secondary">{formSchema.fields.length} campos</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formSchema.fields.slice(0, 8).map((field) => (
                      <Badge key={field.id} variant="outline" className="text-xs">
                        {field.label}
                      </Badge>
                    ))}
                    {formSchema.fields.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{formSchema.fields.length - 8} mais
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Instruções adicionais (opcional)</label>
                  <Textarea
                    value={customizationPrompt}
                    onChange={(e) => setCustomizationPrompt(e.target.value)}
                    placeholder="Adicione contexto sobre o seu negócio...&#10;&#10;Exemplo: Este formulário é para captura de leads de uma escola de idiomas. Queremos pipeline com etapas de matrícula."
                    className="min-h-[100px]"
                  />
                </div>

                <Button
                  onClick={() => handleGenerate()}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar formulário...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Recomendar Template & Adaptar
                    </>
                  )}
                </Button>
              </>
            )}

            <Button variant="ghost" onClick={handleReset} className="w-full">
              ← Voltar à seleção
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clarifying Questions Step */}
      {step === 'clarifying' && (
        <div className="space-y-4">
          {recommendedTemplate && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-primary" />
                  <span className="font-medium">Template recomendado: {recommendedTemplate}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  A AI identificou este template como o mais adequado para o seu caso.
                </p>
              </CardContent>
            </Card>
          )}
          <ConversationalQuestions
            questions={questions}
            onSubmit={handleClarifyingSubmit}
            isLoading={isLoading}
          />
          <Button variant="ghost" onClick={() => setStep('customize')}>
            ← Voltar
          </Button>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && blueprint && (
        <div className="space-y-4">
          {/* Confidence indicator */}
          {confidence !== null && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {confidence >= 0.8 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="font-medium">Confiança: {Math.round(confidence * 100)}%</span>
                  </div>
                  <Progress value={confidence * 100} className="flex-1 h-2" />
                </div>
                {explanation && (
                  <p className="text-sm text-muted-foreground mt-2">{explanation}</p>
                )}
                {recommendedTemplate && (
                  <Badge variant="secondary" className="mt-2">
                    Baseado no template: {recommendedTemplate}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Blueprint Preview */}
          <BlueprintPreview blueprint={blueprint} />

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleStartRefine} variant="secondary" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              Refinar com AI
            </Button>
            <Button onClick={handleProceedToApply} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={isSaving} variant="outline" className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {existingBlueprintId ? 'Atualizar' : 'Guardar'}
                </>
              )}
            </Button>
            {existingBlueprintId && (
              <BlueprintVersionHistory
                blueprintId={existingBlueprintId}
                currentVersion={blueprint.version}
                onRestore={handleRestoreVersion}
              />
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recomeçar
            </Button>
          </div>
        </div>
      )}

      {/* Refine Step */}
      {step === 'refine' && blueprint && (
        <div className="space-y-4">
          <BlueprintRefineChat
            blueprint={blueprint}
            onBlueprintUpdated={handleBlueprintUpdated}
            onComplete={handleRefineComplete}
            onCancel={handleRefineCancel}
          />
        </div>
      )}

      {/* Apply Step */}
      {step === 'apply' && blueprint && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep('preview')} className="mb-2">
            ← Voltar à pré-visualização
          </Button>
          <BlueprintApplyPreview
            blueprint={blueprint}
            existingFields={existingFields}
            existingStages={existingStages}
            existingAutomations={existingAutomations}
            duplicates={duplicates}
            onApply={handleApply}
            isApplying={isApplying}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  );
}
