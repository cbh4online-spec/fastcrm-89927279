import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GitBranch, Plus, Trash2, ArrowRight, Mail, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_TYPES = [
  { value: 'send_email', label: 'Enviar email', icon: Mail },
  { value: 'enroll_sequence', label: 'Inscrever em sequência', icon: Users },
  { value: 'send_campaign', label: 'Enviar campanha', icon: Zap },
];

export function PipelineTriggersPanel() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    to_stage: '',
    from_stage: '',
    action_type: 'send_email',
    email_subject: '',
    email_body: '',
    delay_minutes: 0,
  });

  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ['pipeline-email-triggers', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('pipeline_email_triggers')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch pipeline stages
  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, pipeline_id')
        .order('position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createTrigger = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase.from('pipeline_email_triggers').insert({
        workspace_id: currentWorkspace.id,
        to_stage: form.to_stage,
        from_stage: form.from_stage || null,
        action_type: form.action_type,
        email_subject: form.email_subject || null,
        email_body: form.email_body || null,
        delay_minutes: form.delay_minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-email-triggers'] });
      toast.success('Trigger de pipeline criado');
      setShowModal(false);
      setForm({ to_stage: '', from_stage: '', action_type: 'send_email', email_subject: '', email_body: '', delay_minutes: 0 });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar trigger'),
  });

  const toggleTrigger = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('pipeline_email_triggers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-email-triggers'] }),
  });

  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline_email_triggers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-email-triggers'] });
      toast.success('Trigger eliminado');
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Triggers de Pipeline
          </CardTitle>
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" /> Novo trigger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Trigger de Pipeline</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Quando deal move para stage:</Label>
                  <Select value={form.to_stage} onValueChange={(v) => setForm({ ...form, to_stage: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar stage..." /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vindo de stage (opcional):</Label>
                  <Select value={form.from_stage || '_any'} onValueChange={(v) => setForm({ ...form, from_stage: v === '_any' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Qualquer stage</SelectItem>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ação:</Label>
                  <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.action_type === 'send_email' && (
                  <>
                    <div className="space-y-2">
                      <Label>Assunto do email:</Label>
                      <Input value={form.email_subject} onChange={(e) => setForm({ ...form, email_subject: e.target.value })} placeholder="Parabéns pela proposta aprovada!" />
                    </div>
                    <div className="space-y-2">
                      <Label>Corpo do email:</Label>
                      <Textarea value={form.email_body} onChange={(e) => setForm({ ...form, email_body: e.target.value })} rows={4} placeholder="Olá {{primeiro_nome}},..." />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Delay (minutos):</Label>
                  <Input type="number" value={form.delay_minutes} onChange={(e) => setForm({ ...form, delay_minutes: Number(e.target.value) })} min={0} />
                  <p className="text-xs text-muted-foreground">0 = enviar imediatamente</p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  Quando deal move {form.from_stage ? `de "${form.from_stage}"` : ''} para "<strong>{form.to_stage || '...'}</strong>"
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  {form.delay_minutes > 0 ? `aguarda ${form.delay_minutes}min → ` : ''}
                  <strong>{ACTION_TYPES.find(a => a.value === form.action_type)?.label}</strong>
                </div>

                <Button onClick={() => createTrigger.mutate()} disabled={!form.to_stage || createTrigger.isPending} className="w-full">
                  Guardar trigger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem triggers de pipeline configurados. Cria um para enviar emails automaticamente quando deals mudam de stage.
          </p>
        ) : (
          <div className="space-y-2">
            {triggers.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {t.from_stage && (
                    <>
                      <Badge variant="outline">{t.from_stage}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <Badge variant="secondary">{t.to_stage}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {t.delay_minutes > 0 && (
                    <span className="text-xs text-muted-foreground">{t.delay_minutes}min →</span>
                  )}
                  <Badge variant="outline">
                    {ACTION_TYPES.find(a => a.value === t.action_type)?.label || t.action_type}
                  </Badge>
                  {t.email_subject && (
                    <span className="text-xs text-muted-foreground truncate max-w-48">"{t.email_subject}"</span>
                  )}
                </div>
                <Switch
                  checked={t.is_active}
                  onCheckedChange={(v) => toggleTrigger.mutate({ id: t.id, is_active: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteTrigger.mutate(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
