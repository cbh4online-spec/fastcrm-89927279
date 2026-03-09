import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FlowStep, FlowVariable, FlowStepType, ActionType, FlowConditionOperator, STEP_TYPE_CONFIG, ACTION_TYPE_CONFIG, CONDITION_OPERATOR_CONFIG, isAIStepType, AI_MODEL_OPTIONS, AI_INPUT_SOURCE_OPTIONS } from '@/types/conversational-flows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface StepPropertiesPanelProps {
  step: FlowStep | null;
  variables: FlowVariable[];
  onUpdate: (stepId: string, data: Partial<FlowStep>) => void;
  onClose: () => void;
}

export function StepPropertiesPanel({ step, variables, onUpdate, onClose }: StepPropertiesPanelProps) {
  const [localStep, setLocalStep] = useState<FlowStep | null>(null);

  useEffect(() => {
    setLocalStep(step);
  }, [step]);

  if (!localStep) return null;

  const handleChange = <K extends keyof FlowStep>(field: K, value: FlowStep[K]) => {
    setLocalStep(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = () => {
    if (localStep) {
      onUpdate(localStep.id, localStep);
    }
  };

  const config = STEP_TYPE_CONFIG[localStep.stepType];
  const isAI = isAIStepType(localStep.stepType);

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">Propriedades</h3>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Common fields */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Passo</Label>
            <Input
              id="name"
              value={localStep.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome identificador"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="entryPoint">Ponto de Entrada</Label>
            <Switch
              id="entryPoint"
              checked={localStep.isEntryPoint}
              onCheckedChange={(checked) => handleChange('isEntryPoint', checked)}
            />
          </div>

          <Separator />

          {/* Message / Question fields */}
          {(localStep.stepType === 'message' || localStep.stepType === 'question') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="messageContent">
                  {localStep.stepType === 'message' ? 'Mensagem' : 'Pergunta'}
                </Label>
                <Textarea
                  id="messageContent"
                  value={localStep.messageContent || ''}
                  onChange={(e) => handleChange('messageContent', e.target.value)}
                  placeholder={localStep.stepType === 'message' ? 'Escreve a mensagem...' : 'Escreve a pergunta...'}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Usa {'{variavel}'} para inserir valores dinâmicos
                </p>
              </div>

              {localStep.stepType === 'question' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="variable">Guardar resposta em</Label>
                    <Select
                      value={localStep.variableId || ''}
                      onValueChange={(v) => handleChange('variableId', v || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleciona variável..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {variables.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.displayName} ({v.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Respostas Rápidas</Label>
                    <Input
                      placeholder="Sim, Não, Talvez (separar por vírgula)"
                      value={localStep.quickReplies?.join(', ') || ''}
                      onChange={(e) => handleChange('quickReplies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Condition fields */}
          {localStep.stepType === 'condition' && (
            <>
              <div className="space-y-2">
                <Label>Campo a verificar</Label>
                <Select
                  value={localStep.conditionField || ''}
                  onValueChange={(v) => handleChange('conditionField', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona campo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variables.map(v => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.displayName}
                      </SelectItem>
                    ))}
                    <SelectItem value="last_response">Última resposta</SelectItem>
                    <SelectItem value="channel">Canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operador</Label>
                <Select
                  value={localStep.conditionOperator || ''}
                  onValueChange={(v) => handleChange('conditionOperator', v as FlowConditionOperator)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona operador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_OPERATOR_CONFIG).map(([op, conf]) => (
                      <SelectItem key={op} value={op}>
                        {conf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {localStep.conditionOperator && 
               CONDITION_OPERATOR_CONFIG[localStep.conditionOperator]?.requiresValue && (
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={localStep.conditionValue || ''}
                    onChange={(e) => handleChange('conditionValue', e.target.value)}
                    placeholder="Valor a comparar"
                  />
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <p className="font-medium">Conexões:</p>
                <p className="text-green-600">● Verde = condição verdadeira</p>
                <p className="text-red-600">● Vermelho = condição falsa</p>
              </div>
            </>
          )}

          {/* Action fields */}
          {localStep.stepType === 'action' && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select
                  value={localStep.actionType || ''}
                  onValueChange={(v) => handleChange('actionType', v as ActionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona ação..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_CONFIG).map(([type, conf]) => (
                      <SelectItem key={type} value={type}>
                        {conf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {localStep.actionType === 'add_tag' && (
                <div className="space-y-2">
                  <Label>Nome da Tag</Label>
                  <Input
                    value={(localStep.actionConfig as Record<string, string>)?.tag || ''}
                    onChange={(e) => handleChange('actionConfig', { tag: e.target.value })}
                    placeholder="Ex: lead-qualificado"
                  />
                </div>
              )}

              {localStep.actionType === 'update_field' && (
                <>
                  <div className="space-y-2">
                    <Label>Campo</Label>
                    <Input
                      value={(localStep.actionConfig as Record<string, string>)?.field || ''}
                      onChange={(e) => handleChange('actionConfig', { 
                        ...(localStep.actionConfig as Record<string, string>), 
                        field: e.target.value 
                      })}
                      placeholder="Ex: status"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={(localStep.actionConfig as Record<string, string>)?.value || ''}
                      onChange={(e) => handleChange('actionConfig', { 
                        ...(localStep.actionConfig as Record<string, string>), 
                        value: e.target.value 
                      })}
                      placeholder="Ex: qualificado"
                    />
                  </div>
                </>
              )}

              {localStep.actionType === 'webhook' && (
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <Input
                    type="url"
                    value={(localStep.actionConfig as Record<string, string>)?.url || ''}
                    onChange={(e) => handleChange('actionConfig', { url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}
            </>
          )}

          {/* Goal fields */}
          {localStep.stepType === 'goal' && (
            <>
              <div className="space-y-2">
                <Label>Nome do Objetivo</Label>
                <Input
                  value={localStep.goalName || ''}
                  onChange={(e) => handleChange('goalName', e.target.value)}
                  placeholder="Ex: Lead Qualificado"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor de Conversão (€)</Label>
                <Input
                  type="number"
                  value={localStep.conversionValue || ''}
                  onChange={(e) => handleChange('conversionValue', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {/* Handoff fields */}
          {localStep.stepType === 'handoff' && (
            <div className="space-y-2">
              <Label>Mensagem de Transferência</Label>
              <Textarea
                value={localStep.messageContent || ''}
                onChange={(e) => handleChange('messageContent', e.target.value)}
                placeholder="A transferir para um especialista..."
                rows={3}
              />
            </div>
          )}

          {/* AI Step fields */}
          {isAI && (
            <>
              <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-1">⚡ Configuração AI</p>
                <p className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  Este passo executa IA automaticamente durante o fluxo.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Modelo AI</Label>
                <Select
                  value={localStep.aiModel || 'google/gemini-3-flash-preview'}
                  onValueChange={(v) => handleChange('aiModel', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fonte de Dados</Label>
                <Select
                  value={localStep.aiInputSource || ''}
                  onValueChange={(v) => handleChange('aiInputSource', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona fonte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_INPUT_SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prompt Personalizado</Label>
                <Textarea
                  value={localStep.aiPrompt || ''}
                  onChange={(e) => handleChange('aiPrompt', e.target.value)}
                  placeholder="Instruções adicionais para a IA..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Usa {'{variavel}'} para dados dinâmicos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Guardar resultado em variável</Label>
                <Input
                  value={localStep.aiOutputVariable || ''}
                  onChange={(e) => handleChange('aiOutputVariable', e.target.value)}
                  placeholder="Ex: ai_analysis_result"
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Guardar
        </Button>
      </div>
    </div>
  );
}
