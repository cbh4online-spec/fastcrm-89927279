import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CrmBlueprint,
  BlueprintCustomField,
  BlueprintSection,
  BlueprintPipelineStage,
  BlueprintAutomation,
} from '@/types/blueprint';
import { DuplicateMatch } from '@/lib/duplicateDetection';
import { CustomField } from '@/hooks/useCustomFields';
import {
  Grid3X3,
  Layers,
  Workflow,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Merge,
  Star,
  Play,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ApplyMode = 'all' | 'fields' | 'automations' | 'stages';

interface BlueprintApplyPreviewProps {
  blueprint: CrmBlueprint;
  existingFields: CustomField[];
  existingStages: { id: string; name: string; color: string }[];
  existingAutomations: { id: string; name: string }[];
  duplicates: {
    fields: DuplicateMatch[];
    automations: DuplicateMatch[];
    stages: DuplicateMatch[];
  };
  onApply: (mode: ApplyMode, mergeDecisions: Record<string, 'create' | 'merge' | 'skip'>) => Promise<void>;
  isApplying: boolean;
}

export function BlueprintApplyPreview({
  blueprint,
  existingFields,
  existingStages,
  existingAutomations,
  duplicates,
  onApply,
  isApplying,
}: BlueprintApplyPreviewProps) {
  const [applyMode, setApplyMode] = useState<ApplyMode>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mergeDecisions, setMergeDecisions] = useState<Record<string, 'create' | 'merge' | 'skip'>>({});

  const hasDuplicates = useMemo(() => {
    return duplicates.fields.length > 0 || duplicates.automations.length > 0 || duplicates.stages.length > 0;
  }, [duplicates]);

  const totalChanges = useMemo(() => {
    let count = 0;
    if (applyMode === 'all' || applyMode === 'fields') {
      count += blueprint.customFields.length;
    }
    if (applyMode === 'all' || applyMode === 'stages') {
      count += (blueprint.pipelineStages?.length || 0);
    }
    if (applyMode === 'all' || applyMode === 'automations') {
      count += blueprint.automations.length;
    }
    return count;
  }, [applyMode, blueprint]);

  const handleMergeDecision = (itemId: string, decision: 'create' | 'merge' | 'skip') => {
    setMergeDecisions(prev => ({ ...prev, [itemId]: decision }));
  };

  const handleApplyClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmedApply = async () => {
    setConfirmOpen(false);
    await onApply(applyMode, mergeDecisions);
  };

  const renderFieldPreview = (field: BlueprintCustomField, index: number) => {
    const duplicate = duplicates.fields.find(d => 
      (d.blueprintItem as BlueprintCustomField).name === field.name
    );
    const decision = duplicate ? mergeDecisions[field.name] : undefined;

    return (
      <div
        key={index}
        className={cn(
          'p-3 border rounded-lg',
          duplicate && 'border-amber-500/50 bg-amber-500/5'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{field.name}</span>
              <Badge variant="outline" className="text-xs">{field.type}</Badge>
              {field.required && <Star className="h-3 w-3 text-amber-500" />}
            </div>
            {field.options && field.options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {field.options.slice(0, 3).map((opt, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {opt.label}
                  </Badge>
                ))}
                {field.options.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{field.options.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {duplicate && (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {duplicate.matchType === 'exact' ? 'Duplicado' : `${Math.round(duplicate.similarity * 100)}% similar`}
              </Badge>
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  variant={decision === 'merge' ? 'default' : 'outline'}
                  className="text-xs h-6 px-2"
                  onClick={() => handleMergeDecision(field.name, 'merge')}
                >
                  <Merge className="h-3 w-3 mr-1" />
                  Fundir
                </Button>
                <Button
                  size="sm"
                  variant={decision === 'skip' ? 'default' : 'outline'}
                  className="text-xs h-6 px-2"
                  onClick={() => handleMergeDecision(field.name, 'skip')}
                >
                  Ignorar
                </Button>
                <Button
                  size="sm"
                  variant={decision === 'create' ? 'default' : 'outline'}
                  className="text-xs h-6 px-2"
                  onClick={() => handleMergeDecision(field.name, 'create')}
                >
                  Criar
                </Button>
              </div>
            </div>
          )}

          {!duplicate && (
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Novo
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const renderStagePreview = (stage: BlueprintPipelineStage, index: number) => {
    const duplicate = duplicates.stages.find(d => 
      (d.blueprintItem as any).name === stage.name
    );

    return (
      <div
        key={index}
        className={cn(
          'flex items-center gap-3 p-3 border rounded-lg',
          duplicate && 'border-amber-500/50 bg-amber-500/5'
        )}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <span className="font-medium flex-1">{stage.name}</span>
        <Badge variant="outline">Posição {stage.position + 1}</Badge>
        {duplicate ? (
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Já existe
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Novo
          </Badge>
        )}
      </div>
    );
  };

  const renderAutomationPreview = (automation: BlueprintAutomation, index: number) => {
    const duplicate = duplicates.automations.find(d => 
      (d.blueprintItem as BlueprintAutomation).name === automation.name
    );

    return (
      <div
        key={index}
        className={cn(
          'p-3 border rounded-lg',
          duplicate && 'border-amber-500/50 bg-amber-500/5'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-medium">{automation.name}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {automation.description}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="outline">
                <Play className="h-3 w-3 mr-1" />
                {automation.trigger}
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge variant="secondary">
                {automation.actions.length} ação(ões)
              </Badge>
            </div>
          </div>

          {duplicate ? (
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Similar
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Novo
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Apply Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Opções de Aplicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { mode: 'all' as ApplyMode, label: 'Aplicar tudo', icon: CheckCircle2 },
              { mode: 'fields' as ApplyMode, label: 'Apenas campos', icon: Grid3X3 },
              { mode: 'stages' as ApplyMode, label: 'Apenas pipeline', icon: Workflow },
              { mode: 'automations' as ApplyMode, label: 'Apenas automações', icon: Zap },
            ].map(({ mode, label, icon: Icon }) => (
              <div
                key={mode}
                className={cn(
                  'p-3 border rounded-lg cursor-pointer transition-colors',
                  applyMode === mode
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/50'
                )}
                onClick={() => setApplyMode(mode)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox checked={applyMode === mode} />
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Duplicates Warning */}
      {hasDuplicates && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700">Duplicados detetados</p>
                <p className="text-sm text-amber-600 mt-1">
                  Foram encontrados {duplicates.fields.length + duplicates.automations.length + duplicates.stages.length} itens 
                  similares ou duplicados. Reveja as decisões de fusão abaixo antes de aplicar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pré-visualização das alterações</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fields">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fields" disabled={applyMode === 'automations' || applyMode === 'stages'}>
                <Grid3X3 className="h-4 w-4 mr-2" />
                Campos ({blueprint.customFields.length})
              </TabsTrigger>
              <TabsTrigger value="stages" disabled={applyMode === 'fields' || applyMode === 'automations'}>
                <Workflow className="h-4 w-4 mr-2" />
                Pipeline ({blueprint.pipelineStages?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="automations" disabled={applyMode === 'fields' || applyMode === 'stages'}>
                <Zap className="h-4 w-4 mr-2" />
                Automações ({blueprint.automations.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="fields" className="mt-0 space-y-2">
                {blueprint.sections.length > 0 ? (
                  blueprint.sections.map((section, sIdx) => (
                    <div key={sIdx} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{section.name}</span>
                      </div>
                      <div className="space-y-2 pl-6">
                        {blueprint.customFields
                          .filter(f => section.fields.includes(f.name))
                          .map((field, fIdx) => renderFieldPreview(field, fIdx))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    {blueprint.customFields.map((field, idx) => renderFieldPreview(field, idx))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stages" className="mt-0 space-y-2">
                {blueprint.pipelineStages?.map((stage, idx) => renderStagePreview(stage, idx)) || (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma etapa de pipeline definida
                  </p>
                )}
              </TabsContent>

              <TabsContent value="automations" className="mt-0 space-y-2">
                {blueprint.automations.length > 0 ? (
                  blueprint.automations.map((auto, idx) => renderAutomationPreview(auto, idx))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma automação definida
                  </p>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Apply Button */}
      <Button
        onClick={handleApplyClick}
        disabled={isApplying || totalChanges === 0}
        className="w-full"
        size="lg"
      >
        {isApplying ? (
          'A aplicar...'
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Aplicar {totalChanges} alteração(ões)
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confirmar aplicação do blueprint
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Está prestes a aplicar as seguintes alterações:</p>
              <ul className="list-disc list-inside text-sm">
                {(applyMode === 'all' || applyMode === 'fields') && (
                  <li>{blueprint.customFields.length} campos personalizados</li>
                )}
                {(applyMode === 'all' || applyMode === 'stages') && blueprint.pipelineStages && (
                  <li>{blueprint.pipelineStages.length} etapas de pipeline</li>
                )}
                {(applyMode === 'all' || applyMode === 'automations') && (
                  <li>{blueprint.automations.length} automações</li>
                )}
              </ul>
              {hasDuplicates && (
                <p className="text-amber-600 font-medium mt-2">
                  ⚠️ Existem duplicados. Verifique as decisões de fusão.
                </p>
              )}
              <p className="font-medium mt-2">Esta ação será registada no log de auditoria.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedApply}>
              Confirmar e Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
