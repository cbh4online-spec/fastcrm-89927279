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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  ArrowDown,
  Clock,
  Mail,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Eye,
  BarChart3,
  UserPlus,
  GitBranch,
} from 'lucide-react';
import {
  useSequenceSteps,
  useCreateStep,
  useDeleteStep,
  useUpdateStep,
  useSequenceEnrollments,
  type EmailSequence,
  type SequenceStep,
} from '@/hooks/useEmailSequences';
import { useCommunicationTemplates } from '@/hooks/useCommunicationTemplates';
import { EnrollContactsDialog } from './EnrollContactsDialog';
import { EnrollmentCard } from './EnrollmentCard';
import { SequenceAnalytics } from './SequenceAnalytics';
import { SequenceFlowView } from './SequenceFlowView';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SequenceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequence: EmailSequence;
}

function StepEditor({
  step,
  index,
  sequenceId,
  templates,
}: {
  step: SequenceStep;
  index: number;
  sequenceId: string;
  templates: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [localSubject, setLocalSubject] = useState(step.subject || '');
  const [localBody, setLocalBody] = useState(step.body || '');
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

  const saveInline = () => {
    updateStep.mutate({
      id: step.id,
      sequenceId,
      subject: localSubject || undefined,
      body: localBody || undefined,
    });
  };

  return (
    <Card className={`border transition-all ${!step.isActive ? 'opacity-50' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
            <Badge variant="outline" className="text-xs font-mono">
              {step.stepOrder}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {step.channel === 'email' ? 'Email' : step.channel}
            </Badge>
            {step.templateName && (
              <span className="text-xs text-muted-foreground truncate max-w-32">
                📄 {step.templateName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={step.isActive}
              onCheckedChange={(checked) =>
                updateStep.mutate({ id: step.id, sequenceId, is_active: checked })
              }
              className="scale-75"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => deleteStep.mutate({ id: step.id, sequenceId })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {step.subject && !expanded && (
          <p className="text-sm text-muted-foreground truncate pl-6">
            ✉️ {step.subject}
          </p>
        )}

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs">Template</Label>
              <Select
                value={step.templateId || '_custom'}
                onValueChange={(val) =>
                  updateStep.mutate({
                    id: step.id,
                    sequenceId,
                    template_id: val === '_custom' ? null : val,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_custom">✍️ Conteúdo personalizado</SelectItem>
                  {templates?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!step.templateId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Assunto</Label>
                  <Input
                    value={localSubject}
                    onChange={(e) => setLocalSubject(e.target.value)}
                    onBlur={saveInline}
                    placeholder="Assunto do email..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Corpo do email</Label>
                  <Textarea
                    value={localBody}
                    onChange={(e) => setLocalBody(e.target.value)}
                    onBlur={saveInline}
                    placeholder="Escreve o conteúdo do email... Suporta variáveis como {{primeiro_nome}}"
                    rows={4}
                    className="text-xs resize-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['{{primeiro_nome}}', '{{empresa}}', '{{email}}'].map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-accent"
                        onClick={() => setLocalBody((prev) => prev + ' ' + v)}
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {index > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Dias de espera</Label>
                  <Input
                    type="number"
                    min={0}
                    value={step.delayDays}
                    className="h-8 text-xs"
                    onChange={(e) =>
                      updateStep.mutate({
                        id: step.id,
                        sequenceId,
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
                        sequenceId,
                        delay_hours: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Canal</Label>
              <Select
                value={step.channel}
                onValueChange={(val) =>
                  updateStep.mutate({ id: step.id, sequenceId, channel: val } as any)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SequenceDetailDialog({ open, onOpenChange, sequence }: SequenceDetailDialogProps) {
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: steps, isLoading: stepsLoading } = useSequenceSteps(sequence.id);
  const { data: enrollments, isLoading: enrollmentsLoading } = useSequenceEnrollments(sequence.id);
  const { data: templates } = useCommunicationTemplates();
  const createStep = useCreateStep();

  // Fetch contact names for enrollments
  const contactIds = (enrollments || []).map((e) => e.contactId);
  const { data: contactsData } = useQuery({
    queryKey: ['contacts-by-ids', contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return [];
      const { data } = await supabase
        .from('contacts')
        .select('id, name, email')
        .in('id', contactIds);
      return data || [];
    },
    enabled: contactIds.length > 0,
  });

  const contactMap = new Map((contactsData || []).map((c) => [c.id, c]));

  const handleAddStep = () => {
    const nextOrder = (steps?.length || 0) + 1;
    createStep.mutate({
      sequence_id: sequence.id,
      step_order: nextOrder,
      delay_days: nextOrder === 1 ? 0 : 2,
    });
  };

  const allEnrollments = enrollments || [];
  const activeEnrollments = allEnrollments.filter((e) => e.status === 'active');
  const completedEnrollments = allEnrollments.filter((e) => e.status === 'completed');
  const exitedEnrollments = allEnrollments.filter((e) => e.status === 'exited');

  const filteredEnrollments =
    statusFilter === 'all'
      ? allEnrollments
      : allEnrollments.filter((e) => e.status === statusFilter);

  const enrichedEnrollments = filteredEnrollments.map((e) => ({
    ...e,
    contactName: contactMap.get(e.contactId)?.name || undefined,
    contactEmail: contactMap.get(e.contactId)?.email || undefined,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
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

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{steps?.length || 0}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Etapas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{activeEnrollments.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{completedEnrollments.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Concluídos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{exitedEnrollments.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saídas</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="steps" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
              <TabsTrigger
                value="steps"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-1 pb-2 text-sm"
              >
                Etapas
              </TabsTrigger>
              <TabsTrigger
                value="flow"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-1 pb-2 text-sm gap-1"
              >
                <GitBranch className="h-3 w-3" />
                Fluxo
              </TabsTrigger>
              <TabsTrigger
                value="enrollments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-1 pb-2 text-sm"
              >
                Inscritos ({allEnrollments.length})
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-1 pb-2 text-sm gap-1"
              >
                <BarChart3 className="h-3 w-3" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-1 pb-2 text-sm"
              >
                Config
              </TabsTrigger>
            </TabsList>

            {/* Steps tab */}
            <TabsContent value="steps" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-280px)]">
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
                        <StepEditor
                          step={step}
                          index={idx}
                          sequenceId={sequence.id}
                          templates={templates || []}
                        />
                      </div>
                    ))
                  )}

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
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Flow view tab */}
            <TabsContent value="flow" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-280px)]">
                <SequenceFlowView steps={steps || []} exitConditions={sequence.exitConditions} />
              </ScrollArea>
            </TabsContent>

            {/* Enrollments tab */}
            <TabsContent value="enrollments" className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between px-1 py-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="paused">Pausados</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="exited">Saídas</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="gap-1.5 h-8" onClick={() => setEnrollDialogOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Inscrever
                </Button>
              </div>
              <ScrollArea className="h-full max-h-[calc(85vh-320px)]">
                <div className="space-y-2 px-1 pb-4">
                  {enrollmentsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20" />
                      ))}
                    </div>
                  ) : enrichedEnrollments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Sem inscritos nesta sequência.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => setEnrollDialogOpen(true)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Inscrever Contactos
                      </Button>
                    </div>
                  ) : (
                    enrichedEnrollments.map((enrollment) => (
                      <EnrollmentCard
                        key={enrollment.id}
                        enrollment={enrollment}
                        totalSteps={steps?.length || 0}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Analytics tab */}
            <TabsContent value="analytics" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-280px)]">
                <div className="px-1 pb-4">
                  <SequenceAnalytics
                    enrollments={allEnrollments}
                    steps={steps || []}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Settings tab */}
            <TabsContent value="settings" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full max-h-[calc(85vh-280px)]">
                <div className="space-y-4 px-1 pb-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Condições de Saída
                    </Label>
                    {sequence.exitConditions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sequence.exitConditions.map((cond, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {cond.label || cond.type}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem condições de saída configuradas</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    {sequence.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sequence.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem tags</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Criada: {new Date(sequence.createdAt).toLocaleDateString('pt-PT')}</p>
                    <p>Atualizada: {new Date(sequence.updatedAt).toLocaleDateString('pt-PT')}</p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EnrollContactsDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        sequenceId={sequence.id}
        existingContactIds={contactIds}
      />
    </>
  );
}
