import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CrmBlueprint,
  BlueprintCustomField,
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
  Loader2,
  PartyPopper,
  XCircle,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ApplyMode = 'all' | 'fields' | 'automations' | 'stages';

export interface ApplyResult {
  success: boolean;
  fieldsCreated: number;
  stagesCreated: number;
  automationsCreated: number;
  duplicatesMerged: number;
  duplicatesSkipped: number;
  errors: string[];
}

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
  onApply: (mode: ApplyMode, mergeDecisions: Record<string, 'create' | 'merge' | 'skip'>) => Promise<ApplyResult>;
  isApplying: boolean;
  onReset?: () => void;
}

export function BlueprintApplyPreview({
  blueprint,
  existingFields,
  existingStages,
  existingAutomations,
  duplicates,
  onApply,
  isApplying,
  onReset,
}: BlueprintApplyPreviewProps) {
  const [applyMode, setApplyMode] = useState<ApplyMode>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
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
    const result = await onApply(applyMode, mergeDecisions);
    setApplyResult(result);
    setResultOpen(true);
  };

  const handleCloseResult = () => {
    setResultOpen(false);
    if (applyResult?.success && applyResult.errors.length === 0 && onReset) {
      onReset();
    }
  };

  // Find which section a field belongs to
  const getFieldSection = (fieldName: string): string | null => {
    const section = blueprint.sections.find(s => s.fields.includes(fieldName));
    return section?.name || null;
  };

  const renderFieldPreview = (field: BlueprintCustomField, index: number) => {
    const duplicate = duplicates.fields.find(d => 
      (d.blueprintItem as BlueprintCustomField).name === field.name
    );
    const decision = duplicate ? mergeDecisions[field.name] : undefined;
    const sectionName = getFieldSection(field.name);

    return (
      <div
        key={index}
        className={cn(
          'p-3 border rounded-lg transition-all',
          duplicate && 'border-amber-500/50 bg-amber-500/5',
          decision === 'skip' && 'opacity-50'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{field.name}</span>
              <Badge variant="outline" className="text-xs">{field.type}</Badge>
              {field.required && <Star className="h-3 w-3 text-amber-500" />}
              {sectionName && (
                <Badge variant="secondary" className="text-xs">
                  <Layers className="h-3 w-3 mr-1" />
                  {sectionName}
                </Badge>
              )}
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
                  <SkipForward className="h-3 w-3 mr-1" />
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
          duplicate && 'border-amber-500/50 bg-amber-500/5 opacity-60'
        )}
      >
        <div
          className="w-4 h-4 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <div className="flex-1">
          <span className="font-medium">{stage.name}</span>
          {stage.description && (
            <p className="text-xs text-muted-foreground">{stage.description}</p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0">Posição {stage.position + 1}</Badge>
        {duplicate ? (
          <Badge variant="outline" className="text-amber-600 border-amber-500 shrink-0">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Já existe
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-green-600 shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Novo
          </Badge>
        )}
      </div>
    );
  };

  // Format trigger to human-readable
  const formatTrigger = (trigger: string): string => {
    const triggerMap: Record<string, string> = {
      'lead_created': 'Novo lead criado',
      'lead_updated': 'Lead atualizado',
      'opportunity_created': 'Nova oportunidade',
      'opportunity_updated': 'Oportunidade atualizada',
      'opportunity_stage_changed': 'Etapa alterada',
      'payment_confirmed': 'Pagamento confirmado',
      'custom_field_updated': 'Campo personalizado alterado',
      'contact_created': 'Novo contacto',
      'contact_updated': 'Contacto atualizado',
      'company_created': 'Nova empresa',
      'company_updated': 'Empresa atualizada',
    };
    return triggerMap[trigger] || trigger;
  };

  // Format action type to human-readable
  const formatAction = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      'create_task': 'Criar tarefa',
      'move_opportunity_stage': 'Mover etapa',
      'send_message': 'Enviar mensagem',
      'notify_user': 'Notificar utilizador',
      'assign_owner': 'Atribuir responsável',
      'add_tag': 'Adicionar etiqueta',
      'create_opportunity': 'Criar oportunidade',
      'update_field': 'Atualizar campo',
    };
    return actionMap[actionType] || actionType;
  };

  // Format conditions to human-readable
  const formatConditions = (conditions: BlueprintAutomation['conditions']): string => {
    if (conditions.length === 0) return '';
    return conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(' e ');
  };

  const renderAutomationPreview = (automation: BlueprintAutomation, index: number) => {
    const duplicate = duplicates.automations.find(d => 
      (d.blueprintItem as BlueprintAutomation).name === automation.name
    );

    return (
      <div
        key={index}
        className={cn(
          'p-4 border rounded-lg',
          duplicate && 'border-amber-500/50 bg-amber-500/5'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="font-medium">{automation.name}</div>
          {duplicate ? (
            <Badge variant="outline" className="text-amber-600 border-amber-500 shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Similar
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-green-600 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Novo
            </Badge>
          )}
        </div>
        
        {/* When → If → Do summary */}
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 font-medium">
              Quando
            </Badge>
            <span className="text-muted-foreground">{formatTrigger(automation.trigger)}</span>
          </div>
          
          {automation.conditions.length > 0 && (
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 font-medium">
                Se
              </Badge>
              <span className="text-muted-foreground">{formatConditions(automation.conditions)}</span>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 font-medium">
              Fazer
            </Badge>
            <div className="flex flex-wrap gap-1">
              {automation.actions.map((action, aIdx) => (
                <Badge key={aIdx} variant="secondary" className="text-xs">
                  {formatAction(action.type)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        {automation.description && (
          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
            {automation.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{blueprint.name}</CardTitle>
          <CardDescription>{blueprint.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{blueprint.customFields.length}</div>
              <div className="text-xs text-muted-foreground">Campos</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{blueprint.sections.length}</div>
              <div className="text-xs text-muted-foreground">Secções</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{blueprint.pipelineStages?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Etapas Pipeline</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{blueprint.automations.length}</div>
              <div className="text-xs text-muted-foreground">Automações</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            O que aplicar?
          </CardTitle>
          <CardDescription>
            Escolhe o que queres aplicar ao teu CRM. Podes aplicar tudo ou apenas partes específicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { mode: 'all' as ApplyMode, label: 'Tudo', icon: CheckCircle2, count: totalChanges },
              { mode: 'fields' as ApplyMode, label: 'Campos', icon: Grid3X3, count: blueprint.customFields.length },
              { mode: 'stages' as ApplyMode, label: 'Pipeline', icon: Workflow, count: blueprint.pipelineStages?.length || 0 },
              { mode: 'automations' as ApplyMode, label: 'Automações', icon: Zap, count: blueprint.automations.length },
            ].map(({ mode, label, icon: Icon, count }) => (
              <div
                key={mode}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
                  applyMode === mode
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'hover:border-muted-foreground/50'
                )}
                onClick={() => setApplyMode(mode)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox checked={applyMode === mode} className="pointer-events-none" />
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{count} item(s)</div>
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
                  similares ou duplicados. Decide o que fazer com cada um antes de aplicar.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {duplicates.fields.length > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      {duplicates.fields.length} campo(s)
                    </Badge>
                  )}
                  {duplicates.stages.length > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      {duplicates.stages.length} etapa(s)
                    </Badge>
                  )}
                  {duplicates.automations.length > 0 && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      {duplicates.automations.length} automação(ões)
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pré-visualização detalhada</CardTitle>
          <CardDescription>Revê todas as alterações antes de aplicar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fields">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="fields" disabled={applyMode === 'automations' || applyMode === 'stages'}>
                <Grid3X3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Campos</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {blueprint.customFields.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sections" disabled={applyMode === 'automations' || applyMode === 'stages'}>
                <Layers className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Layout</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {blueprint.sections.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="stages" disabled={applyMode === 'fields' || applyMode === 'automations'}>
                <Workflow className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pipeline</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {blueprint.pipelineStages?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="automations" disabled={applyMode === 'fields' || applyMode === 'stages'}>
                <Zap className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Auto</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {blueprint.automations.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="fields" className="mt-0 space-y-2">
                {blueprint.sections.length > 0 ? (
                  blueprint.sections.map((section, sIdx) => {
                    const sectionFields = blueprint.customFields.filter(f => 
                      section.fields.includes(f.name)
                    );
                    if (sectionFields.length === 0) return null;
                    
                    return (
                      <div key={sIdx} className="mb-4">
                        <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{section.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {sectionFields.length} campo(s)
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-muted ml-2">
                          {sectionFields.map((field, fIdx) => renderFieldPreview(field, fIdx))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-2">
                    {blueprint.customFields.map((field, idx) => renderFieldPreview(field, idx))}
                  </div>
                )}
                {blueprint.customFields.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum campo definido
                  </p>
                )}
              </TabsContent>

              <TabsContent value="sections" className="mt-0 space-y-3">
                {blueprint.sections.map((section, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="font-medium">{section.name}</span>
                      {section.collapsed && (
                        <Badge variant="outline" className="text-xs">Recolhida</Badge>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-sm text-muted-foreground mb-2">{section.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {section.fields.map((fieldName, fIdx) => (
                        <Badge key={fIdx} variant="secondary" className="text-xs">
                          {fieldName}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
                {blueprint.sections.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma secção definida - os campos serão mostrados sem agrupamento
                  </p>
                )}
              </TabsContent>

              <TabsContent value="stages" className="mt-0 space-y-2">
                {blueprint.pipelineStages && blueprint.pipelineStages.length > 0 ? (
                  <>
                    <div className="flex gap-1 mb-4 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                      {blueprint.pipelineStages
                        .sort((a, b) => a.position - b.position)
                        .map((stage, idx, arr) => (
                          <div key={idx} className="flex items-center shrink-0">
                            <div 
                              className="px-3 py-1.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: stage.color }}
                            >
                              {stage.name}
                            </div>
                            {idx < arr.length - 1 && (
                              <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                    </div>
                    {blueprint.pipelineStages.map((stage, idx) => renderStagePreview(stage, idx))}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma etapa de pipeline definida
                  </p>
                )}
              </TabsContent>

              <TabsContent value="automations" className="mt-0 space-y-2">
                {blueprint.automations.length > 0 ? (
                  <>
                    <div className="p-3 bg-muted/50 rounded-lg mb-3">
                      <p className="text-sm text-muted-foreground">
                        💡 As automações serão criadas <strong>inativas</strong> por segurança. 
                        Ativa-as manualmente depois de rever.
                      </p>
                    </div>
                    {blueprint.automations.map((auto, idx) => renderAutomationPreview(auto, idx))}
                  </>
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

      {/* Safety Notice */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700">Regras de Segurança</p>
              <ul className="text-blue-600 mt-1 space-y-1">
                <li>• Nenhuma alteração é aplicada automaticamente</li>
                <li>• Duplicados são detetados e sugerimos fundir</li>
                <li>• Dados existentes nunca são sobrescritos</li>
                <li>• Todas as alterações são registadas no log de auditoria</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          onClick={() => { setApplyMode('all'); handleApplyClick(); }}
          disabled={isApplying || totalChanges === 0}
          className="w-full"
          size="lg"
        >
          {isApplying && applyMode === 'all' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A aplicar...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aplicar Tudo
            </>
          )}
        </Button>
        <Button
          onClick={() => { setApplyMode('fields'); handleApplyClick(); }}
          disabled={isApplying || blueprint.customFields.length === 0}
          variant="outline"
          size="lg"
        >
          {isApplying && applyMode === 'fields' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Grid3X3 className="h-4 w-4 mr-2" />
          )}
          Só Campos ({blueprint.customFields.length})
        </Button>
        <Button
          onClick={() => { setApplyMode('automations'); handleApplyClick(); }}
          disabled={isApplying || blueprint.automations.length === 0}
          variant="outline"
          size="lg"
        >
          {isApplying && applyMode === 'automations' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Só Automações ({blueprint.automations.length})
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confirmar aplicação
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Estás prestes a aplicar as seguintes alterações:</p>
                <ul className="list-none space-y-1 text-sm">
                  {(applyMode === 'all' || applyMode === 'fields') && (
                    <li className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      {blueprint.customFields.length} campos personalizados
                    </li>
                  )}
                  {(applyMode === 'all' || applyMode === 'stages') && blueprint.pipelineStages && blueprint.pipelineStages.length > 0 && (
                    <li className="flex items-center gap-2">
                      <Workflow className="h-4 w-4" />
                      {blueprint.pipelineStages.length} etapas de pipeline
                    </li>
                  )}
                  {(applyMode === 'all' || applyMode === 'automations') && blueprint.automations.length > 0 && (
                    <li className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {blueprint.automations.length} automações (inativas)
                    </li>
                  )}
                </ul>
                {hasDuplicates && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Existem duplicados - verifica as decisões</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  🔒 Esta ação será registada no log de auditoria.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedApply}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar e Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {applyResult?.success && applyResult.errors.length === 0 ? (
                <>
                  <PartyPopper className="h-5 w-5 text-green-500" />
                  Blueprint aplicado com sucesso!
                </>
              ) : applyResult?.errors.length ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Aplicado com avisos
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Erro ao aplicar
                </>
              )}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-2">
                {/* Success Stats */}
                {applyResult && (
                  <div className="grid grid-cols-2 gap-3">
                    {applyResult.fieldsCreated > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                        <Grid3X3 className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-700">{applyResult.fieldsCreated}</div>
                          <div className="text-xs text-green-600">campos criados</div>
                        </div>
                      </div>
                    )}
                    {applyResult.stagesCreated > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                        <Workflow className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-700">{applyResult.stagesCreated}</div>
                          <div className="text-xs text-green-600">etapas criadas</div>
                        </div>
                      </div>
                    )}
                    {applyResult.automationsCreated > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                        <Zap className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-700">{applyResult.automationsCreated}</div>
                          <div className="text-xs text-green-600">automações criadas</div>
                        </div>
                      </div>
                    )}
                    {applyResult.duplicatesMerged > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                        <Merge className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-700">{applyResult.duplicatesMerged}</div>
                          <div className="text-xs text-blue-600">duplicados fundidos</div>
                        </div>
                      </div>
                    )}
                    {applyResult.duplicatesSkipped > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <SkipForward className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{applyResult.duplicatesSkipped}</div>
                          <div className="text-xs text-muted-foreground">ignorados</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Errors */}
                {applyResult?.errors && applyResult.errors.length > 0 && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="font-medium text-red-700 mb-2">Erros encontrados:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {applyResult.errors.map((err, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {applyResult?.success && applyResult.errors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todas as alterações foram aplicadas. Podes agora ver os campos, pipeline e automações nas respetivas secções do CRM.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseResult}>
              {applyResult?.success && applyResult.errors.length === 0 ? 'Concluir' : 'Fechar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
