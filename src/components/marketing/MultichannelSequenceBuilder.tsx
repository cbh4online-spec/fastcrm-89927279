import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Mail,
  MessageSquare,
  Clock,
  GitBranch,
  Play,
  Pause,
  Trash2,
  ArrowDown,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface SequenceStep {
  id?: string;
  step_order: number;
  channel: 'email' | 'whatsapp' | 'sms' | 'wait' | 'condition';
  action_type: 'send' | 'wait' | 'condition' | 'split';
  delay_hours: number;
  delay_days: number;
  subject: string;
  body_html: string;
  whatsapp_template: string;
  condition_type: string;
  condition_value: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  channels: string[];
  total_enrolled: number;
  total_completed: number;
  created_at: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-800' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
  wait: { label: 'Esperar', icon: Clock, color: 'bg-amber-100 text-amber-800' },
  condition: { label: 'Condição', icon: GitBranch, color: 'bg-orange-100 text-orange-800' },
};

export function MultichannelSequenceBuilder() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([]);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['multichannel-sequences', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('multichannel_sequences')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Sequence[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: sequenceSteps = [] } = useQuery({
    queryKey: ['multichannel-steps', selectedSequence],
    queryFn: async () => {
      if (!selectedSequence) return [];
      const { data, error } = await supabase
        .from('multichannel_sequence_steps')
        .select('*')
        .eq('sequence_id', selectedSequence)
        .order('step_order');
      if (error) throw error;
      return data as SequenceStep[];
    },
    enabled: !!selectedSequence,
  });

  const createSequence = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const channels = [...new Set(steps.filter((s) => s.channel !== 'wait' && s.channel !== 'condition').map((s) => s.channel))];

      const { data: seq, error } = await supabase
        .from('multichannel_sequences')
        .insert({
          workspace_id: currentWorkspace.id,
          name: newName,
          description: newDesc || null,
          channels: channels.length > 0 ? channels : ['email'],
        })
        .select()
        .single();

      if (error) throw error;

      // Insert steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map((s, i) => ({
          sequence_id: seq.id,
          step_order: i + 1,
          channel: s.channel,
          action_type: s.action_type,
          delay_hours: s.delay_hours,
          delay_days: s.delay_days,
          subject: s.subject || null,
          body_html: s.body_html || null,
          whatsapp_template: s.whatsapp_template || null,
          condition_type: s.condition_type || null,
          condition_value: s.condition_value || null,
        }));

        const { error: stepsError } = await supabase
          .from('multichannel_sequence_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multichannel-sequences'] });
      toast.success('Sequência multi-canal criada');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setSteps([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from('multichannel_sequences')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multichannel-sequences'] });
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('multichannel_sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multichannel-sequences'] });
      toast.success('Sequência removida');
    },
  });

  const addStep = (channel: SequenceStep['channel']) => {
    const newStep: SequenceStep = {
      step_order: steps.length + 1,
      channel,
      action_type: channel === 'wait' ? 'wait' : channel === 'condition' ? 'condition' : 'send',
      delay_hours: channel === 'wait' ? 24 : 0,
      delay_days: 0,
      subject: '',
      body_html: '',
      whatsapp_template: '',
      condition_type: channel === 'condition' ? 'opened_previous' : '',
      condition_value: '',
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sequências Multi-Canal
          </h3>
          <p className="text-sm text-muted-foreground">
            Orquestre campanhas que combinam Email, WhatsApp e SMS
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sequência
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar...</p>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma sequência multi-canal criada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sequences.map((seq) => (
            <Card key={seq.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedSequence(seq.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  <Badge variant={seq.status === 'active' ? 'default' : 'secondary'}>
                    {seq.status === 'active' ? 'Activa' : seq.status === 'paused' ? 'Pausada' : seq.status}
                  </Badge>
                </div>
                {seq.description && (
                  <p className="text-xs text-muted-foreground">{seq.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  {seq.channels?.map((ch: string) => {
                    const config = CHANNEL_CONFIG[ch];
                    if (!config) return null;
                    return (
                      <Badge key={ch} variant="secondary" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                  <span>{seq.total_enrolled} inscritos</span>
                  <span>{seq.total_completed} completos</span>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus.mutate({ id: seq.id, status: seq.status })}
                  >
                    {seq.status === 'active' ? (
                      <><Pause className="h-3 w-3 mr-1" /> Pausar</>
                    ) : (
                      <><Play className="h-3 w-3 mr-1" /> Activar</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteSequence.mutate(seq.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Sequência Multi-Canal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Onboarding Multi-Canal" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição opcional" />
              </div>
            </div>

            {/* Steps */}
            <div>
              <Label className="mb-2 block">Passos da Sequência</Label>
              <div className="space-y-2">
                {steps.map((step, idx) => {
                  const config = CHANNEL_CONFIG[step.channel];
                  const Icon = config?.icon || Mail;
                  return (
                    <div key={idx}>
                      {idx > 0 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <Card className="p-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`${config?.color || ''} shrink-0`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config?.label || step.channel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Passo {idx + 1}</span>
                          <div className="flex-1" />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="mt-2 space-y-2">
                          {step.channel === 'email' && (
                            <>
                              <Input
                                placeholder="Assunto do email"
                                value={step.subject}
                                onChange={(e) => updateStep(idx, { subject: e.target.value })}
                              />
                              <Textarea
                                placeholder="Conteúdo do email (HTML)"
                                value={step.body_html}
                                onChange={(e) => updateStep(idx, { body_html: e.target.value })}
                                rows={2}
                              />
                            </>
                          )}
                          {step.channel === 'whatsapp' && (
                            <Textarea
                              placeholder="Template WhatsApp ou mensagem"
                              value={step.whatsapp_template}
                              onChange={(e) => updateStep(idx, { whatsapp_template: e.target.value })}
                              rows={2}
                            />
                          )}
                          {step.channel === 'sms' && (
                            <Textarea
                              placeholder="Mensagem SMS"
                              value={step.body_html}
                              onChange={(e) => updateStep(idx, { body_html: e.target.value })}
                              rows={2}
                            />
                          )}
                          {step.channel === 'wait' && (
                            <div className="flex gap-2 items-center">
                              <Label className="shrink-0">Aguardar</Label>
                              <Input
                                type="number"
                                min={0}
                                value={step.delay_hours}
                                onChange={(e) => updateStep(idx, { delay_hours: parseInt(e.target.value) || 0 })}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">horas</span>
                            </div>
                          )}
                          {step.channel === 'condition' && (
                            <div className="flex gap-2 items-center">
                              <Select
                                value={step.condition_type}
                                onValueChange={(v) => updateStep(idx, { condition_type: v })}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Tipo de condição" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="opened_previous">Abriu email anterior</SelectItem>
                                  <SelectItem value="clicked_previous">Clicou email anterior</SelectItem>
                                  <SelectItem value="replied_whatsapp">Respondeu WhatsApp</SelectItem>
                                  <SelectItem value="not_opened">Não abriu</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Add step buttons */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => addStep('email')}>
                  <Mail className="h-3 w-3 mr-1" /> Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep('whatsapp')}>
                  <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep('sms')}>
                  <MessageSquare className="h-3 w-3 mr-1" /> SMS
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep('wait')}>
                  <Clock className="h-3 w-3 mr-1" /> Esperar
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep('condition')}>
                  <GitBranch className="h-3 w-3 mr-1" /> Condição
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={() => createSequence.mutate()}
              disabled={!newName || createSequence.isPending}
            >
              {createSequence.isPending ? 'A criar...' : 'Criar Sequência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
