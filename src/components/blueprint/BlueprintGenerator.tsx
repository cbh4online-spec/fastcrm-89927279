import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FormSchema } from '@/types/formSchema';
import {
  CrmBlueprint,
  BlueprintClarifyingQuestion,
  BlueprintGenerationResponse,
} from '@/types/blueprint';
import { ClarifyingQuestions } from './ClarifyingQuestions';
import { BlueprintPreview } from './BlueprintPreview';
import { BlueprintApplyPreview, ApplyMode } from './BlueprintApplyPreview';
import { useBlueprintApply } from '@/hooks/useBlueprintApply';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles,
  FileJson,
  Loader2,
  Save,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface BlueprintGeneratorProps {
  formSchema?: FormSchema;
  onBlueprintSaved?: (blueprint: CrmBlueprint) => void;
}

type GeneratorStep = 'input' | 'clarifying' | 'preview' | 'apply';

export function BlueprintGenerator({ formSchema, onBlueprintSaved }: BlueprintGeneratorProps) {
  const { currentWorkspace } = useWorkspace();
  const [step, setStep] = useState<GeneratorStep>('input');
  const [inputMode, setInputMode] = useState<'schema' | 'natural'>(formSchema ? 'schema' : 'natural');
  const [naturalDescription, setNaturalDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<BlueprintClarifyingQuestion[]>([]);
  const [blueprint, setBlueprint] = useState<CrmBlueprint | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    isApplying,
    existingFields,
    existingStages,
    existingAutomations,
    duplicates,
    applyBlueprint,
  } = useBlueprintApply(blueprint);

  const handleGenerate = async (clarifyingAnswers?: Record<string, string | string[]>) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-blueprint', {
        body: {
          formSchema: inputMode === 'schema' ? formSchema : undefined,
          naturalLanguageDescription: inputMode === 'natural' ? naturalDescription : undefined,
          clarifyingAnswers,
        },
      });

      if (error) throw error;

      const response = data as BlueprintGenerationResponse;

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
      const { error } = await supabase.from('crm_blueprints' as any).insert({
        workspace_id: currentWorkspace.id,
        name: blueprint.name,
        version: blueprint.version,
        entity_type: blueprint.entityType,
        schema: blueprint as unknown as Record<string, unknown>,
        status: 'draft',
      } as any);

      if (error) throw error;

      toast.success('Blueprint guardado com sucesso!');
      onBlueprintSaved?.(blueprint);
    } catch (error) {
      console.error('Error saving blueprint:', error);
      toast.error('Erro ao guardar blueprint.');
    } finally {
      setIsSaving(false);
    }
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
    setStep('input');
    setQuestions([]);
    setBlueprint(null);
    setConfidence(null);
    setExplanation('');
  };

  const handleApply = async (mode: ApplyMode, mergeDecisions: Record<string, 'create' | 'merge' | 'skip'>) => {
    const result = await applyBlueprint(mode, mergeDecisions);
    if (result.success && result.errors.length === 0) {
      handleReset();
    }
  };

  const handleProceedToApply = () => {
    setStep('apply');
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'input' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <span className="text-sm">Input</span>
        </div>
        <Separator className="flex-1" />
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'clarifying' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            2
          </div>
          <span className="text-sm">Clarificação</span>
        </div>
        <Separator className="flex-1" />
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            3
          </div>
          <span className="text-sm">Pré-visualização</span>
        </div>
        <Separator className="flex-1" />
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === 'apply' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            4
          </div>
          <span className="text-sm">Aplicar</span>
        </div>
      </div>

      {/* Input Step */}
      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Gerar Blueprint CRM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'schema' | 'natural')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schema" disabled={!formSchema}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Schema do Formulário
                </TabsTrigger>
                <TabsTrigger value="natural">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Linguagem Natural
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schema" className="mt-4">
                {formSchema ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{formSchema.title}</span>
                        <Badge variant="secondary">{formSchema.fields.length} campos</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formSchema.fields.map((field) => (
                          <Badge key={field.id} variant="outline" className="text-xs">
                            {field.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => handleGenerate()} disabled={isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          A analisar schema...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Blueprint
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum schema de formulário disponível. Use o Form Studio para criar um.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="natural" className="mt-4 space-y-4">
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Clarifying Questions Step */}
      {step === 'clarifying' && (
        <ClarifyingQuestions
          questions={questions}
          onSubmit={handleClarifyingSubmit}
          isLoading={isLoading}
        />
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
              </CardContent>
            </Card>
          )}

          {/* Blueprint Preview */}
          <BlueprintPreview blueprint={blueprint} />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleProceedToApply} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Pré-visualizar & Aplicar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} variant="outline">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
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
          />
        </div>
      )}
    </div>
  );
}
