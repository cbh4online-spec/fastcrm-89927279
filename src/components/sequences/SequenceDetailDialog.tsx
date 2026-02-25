import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  ArrowDown,
  Clock,
  Mail,
  Zap,
} from 'lucide-react';
import {
  useSequenceSteps,
  useCreateStep,
  useDeleteStep,
  useUpdateStep,
  type EmailSequence,
} from '@/hooks/useEmailSequences';
import { useCommunicationTemplates } from '@/hooks/useCommunicationTemplates';

interface SequenceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence: EmailSequence;
}

export function SequenceDetailDialog({ open, onOpenChange, sequence }: SequenceDetailDialogProps) {
  const { data: steps, isLoading: stepsLoading } = useSequenceSteps(sequence.id);
  const { data: templates } = useCommunicationTemplates();
  const createStep = useCreateStep();
  const deleteStep = useDeleteStep();
  const updateStep = useUpdateStep();

  const handleAddStep = () => {
    const nextOrder = (steps?.length || 0) + 1;
    createStep.mutate({
      sequence_id: sequence.id,
      step_order: nextOrder,
      delay_days: nextOrder === 1 ? 0 : 2,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sequence.name}
            <Badge variant={sequence.isActive ? 'default' : 'secondary'}>
              {sequence.isActive ? 'Ativa' : 'Inativa'}
            </Badge>
          </DialogTitle>
          {sequence.description && (
            <p className="text-sm text-muted-foreground">{sequence.description}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-1 px-1 pb-4">
            {stepsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : !steps || steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Sem etapas. Adicione a primeira etapa abaixo.</p>
              </div>
            ) : (
              steps.map((step, idx) => (
                <div key={step.id}>
                  {/* Delay indicator */}
                  {idx > 0 && (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                      <ArrowDown className="h-3 w-3" />
                      <Clock className="h-3 w-3" />
                      <span>
                        Esperar{' '}
                        {step.delayDays > 0 ? `${step.delayDays} dia${step.delayDays > 1 ? 's' : ''}` : ''}
                        {step.delayDays > 0 && step.delayHours > 0 ? ' e ' : ''}
                        {step.delayHours > 0 ? `${step.delayHours}h` : ''}
                        {step.delayDays === 0 && step.delayHours === 0 ? 'Imediato' : ''}
                      </span>
                    </div>
                  )}

                  <Card className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Etapa {step.stepOrder}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {step.channel === 'email' ? 'Email' : step.channel}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteStep.mutate({ id: step.id, sequenceId: sequence.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Template selector */}
                      <div className="space-y-2">
                        <Label className="text-xs">Template</Label>
                        <Select
                          value={step.templateId || '_custom'}
                          onValueChange={(val) => {
                            updateStep.mutate({
                              id: step.id,
                              sequenceId: sequence.id,
                              template_id: val === '_custom' ? null : val,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar template..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_custom">✍️ Escrever novo</SelectItem>
                            {templates?.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delay config */}
                      {idx > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Dias</Label>
                            <Input
                              type="number"
                              min={0}
                              value={step.delayDays}
                              className="h-8 text-xs"
                              onChange={(e) =>
                                updateStep.mutate({
                                  id: step.id,
                                  sequenceId: sequence.id,
                                  delay_days: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Horas</Label>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={step.delayHours}
                              className="h-8 text-xs"
                              onChange={(e) =>
                                updateStep.mutate({
                                  id: step.id,
                                  sequenceId: sequence.id,
                                  delay_hours: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}

            {/* Add step */}
            <div className="pt-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleAddStep}
                disabled={createStep.isPending}
              >
                <Plus className="h-4 w-4" />
                Adicionar Etapa
              </Button>
            </div>

            {/* Exit conditions */}
            {sequence.exitConditions.length > 0 && (
              <div className="pt-4 border-t mt-4">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Condições de Saída
                </div>
                <div className="flex flex-wrap gap-1">
                  {sequence.exitConditions.map((cond, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {cond.label || cond.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
