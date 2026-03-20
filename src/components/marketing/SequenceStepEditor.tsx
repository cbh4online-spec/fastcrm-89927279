import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Trash2, GripVertical, Mail, Clock, GitBranch, 
  ChevronDown, ChevronRight, ArrowDown, Zap
} from 'lucide-react';
import { useSequenceSteps, useCreateStep, useUpdateStep, useDeleteStep, type SequenceStep } from '@/hooks/useEmailSequences';

interface Props {
  sequenceId: string;
}

const STEP_TYPES = [
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-500' },
  { value: 'delay', label: 'Esperar', icon: Clock, color: 'text-amber-500' },
  { value: 'condition', label: 'Condição', icon: GitBranch, color: 'text-purple-500' },
];

const CONDITION_TYPES = [
  { value: 'opened_previous', label: 'Abriu email anterior' },
  { value: 'clicked_previous', label: 'Clicou em link no anterior' },
  { value: 'not_opened', label: 'Não abriu email anterior' },
  { value: 'has_tag', label: 'Tem tag específica' },
  { value: 'deal_stage', label: 'Deal numa stage específica' },
];

export function SequenceStepEditor({ sequenceId }: Props) {
  const { data: steps = [], isLoading } = useSequenceSteps(sequenceId);
  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const handleAddStep = useCallback((type: string) => {
    const nextOrder = steps.length + 1;
    const baseStep: any = {
      sequence_id: sequenceId,
      step_order: nextOrder,
      delay_days: type === 'delay' ? 1 : 0,
      delay_hours: 0,
      channel: 'email',
    };

    // For step_type, we store it as part of the subject field convention since the column may not exist yet
    if (type === 'delay') {
      baseStep.subject = '[DELAY]';
      baseStep.body = '';
    } else if (type === 'condition') {
      baseStep.subject = '[CONDITION]';
      baseStep.body = '';
    }

    createStep.mutate(baseStep);
  }, [steps, sequenceId, createStep]);

  const getStepType = (step: SequenceStep): string => {
    if (step.subject === '[DELAY]') return 'delay';
    if (step.subject === '[CONDITION]') return 'condition';
    return 'email';
  };

  const toggleExpand = (id: string) => {
    setExpandedStep(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {steps.length === 0 && !isLoading && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Mail className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Adiciona o primeiro passo à sequência
          </p>
        </div>
      )}

      {steps.map((step, idx) => {
        const type = getStepType(step);
        const stepConfig = STEP_TYPES.find(s => s.value === type) || STEP_TYPES[0];
        const Icon = stepConfig.icon;
        const isExpanded = expandedStep === step.id;

        return (
          <div key={step.id}>
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
              </div>
            )}
            <Card className={`${!step.isActive ? 'opacity-50' : ''}`}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(step.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <div className={`p-1.5 rounded ${type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : type === 'delay' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                  <Icon className={`h-3.5 w-3.5 ${stepConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">Passo {idx + 1}</Badge>
                    <span className="text-sm font-medium truncate">
                      {type === 'email' && (step.subject || 'Email sem assunto')}
                      {type === 'delay' && `Esperar ${step.delayDays}d ${step.delayHours}h`}
                      {type === 'condition' && 'Condição'}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={step.isActive}
                  onCheckedChange={(v) => {
                    updateStep.mutate({ id: step.id, sequenceId, is_active: v });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-4 border-t">
                  {type === 'email' && (
                    <>
                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <Input
                          value={step.subject || ''}
                          onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, subject: e.target.value })}
                          placeholder="Assunto do email..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Corpo</Label>
                        <Textarea
                          value={step.body || ''}
                          onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, body: e.target.value })}
                          rows={6}
                          placeholder="Olá {{primeiro_nome}},..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Variáveis: {'{{primeiro_nome}}'} {'{{empresa}}'} {'{{email}}'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Esperar (dias)</Label>
                          <Input
                            type="number"
                            value={step.delayDays}
                            onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, delay_days: Number(e.target.value) })}
                            min={0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Esperar (horas)</Label>
                          <Input
                            type="number"
                            value={step.delayHours}
                            onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, delay_hours: Number(e.target.value) })}
                            min={0}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {type === 'delay' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dias</Label>
                        <Input
                          type="number"
                          value={step.delayDays}
                          onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, delay_days: Number(e.target.value) })}
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horas</Label>
                        <Input
                          type="number"
                          value={step.delayHours}
                          onChange={(e) => updateStep.mutate({ id: step.id, sequenceId, delay_hours: Number(e.target.value) })}
                          min={0}
                        />
                      </div>
                    </div>
                  )}

                  {type === 'condition' && (
                    <div className="space-y-2">
                      <Label>Tipo de condição</Label>
                      <Select defaultValue="opened_previous">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_TYPES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Se a condição for verdadeira, avança para o próximo passo. Caso contrário, salta.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteStep.mutate({ id: step.id, sequenceId })}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        );
      })}

      {/* Add step buttons */}
      <div className="flex justify-center pt-2">
        <div className="flex gap-2">
          {STEP_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                onClick={() => handleAddStep(type.value)}
                className="gap-1.5"
              >
                <Icon className={`h-3.5 w-3.5 ${type.color}`} />
                {type.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
