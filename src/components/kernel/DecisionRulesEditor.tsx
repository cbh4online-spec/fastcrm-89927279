import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Play } from 'lucide-react';
import { useDecisionRules } from '@/hooks/useKernel';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const ACTION_TYPES = ['create_task', 'assign_owner', 'send_notification', 'emit_kernel_event', 'trigger_workflow'];
const EXECUTION_MODES = [
  { value: 'suggest', label: 'Sugerir (sem executar)' },
  { value: 'auto', label: 'Auto-executar' },
  { value: 'approval', label: 'Requer aprovação' },
];

interface RuleFormState {
  id?: string;
  name: string;
  description: string;
  trigger_event_type: string;
  decision_type: string;
  priority: number;
  active: boolean;
  execution_mode: string;
  conditions: string;
  actions: string;
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  description: '',
  trigger_event_type: '',
  decision_type: 'recommendation',
  priority: 100,
  active: true,
  execution_mode: 'suggest',
  conditions: '[]',
  actions: '[]',
};

export function DecisionRulesEditor() {
  const { data: rules = [], upsert, remove, toggleActive } = useDecisionRules();
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => { setForm(EMPTY_FORM); setError(null); setOpen(true); };
  const openEdit = (r: any) => {
    setForm({
      id: r.id,
      name: r.name ?? '',
      description: r.description ?? '',
      trigger_event_type: r.trigger_event_type ?? '',
      decision_type: r.decision_type ?? 'recommendation',
      priority: r.priority ?? 100,
      active: r.active ?? true,
      execution_mode: r.execution_mode ?? (r.auto_execute ? 'auto' : 'suggest'),
      conditions: JSON.stringify(r.conditions ?? [], null, 2),
      actions: JSON.stringify(r.actions ?? [], null, 2),
    });
    setError(null);
    setOpen(true);
  };

  const save = () => {
    let conditions: any, actions: any;
    try { conditions = JSON.parse(form.conditions || '[]'); }
    catch { setError('Condições: JSON inválido'); return; }
    try { actions = JSON.parse(form.actions || '[]'); }
    catch { setError('Ações: JSON inválido'); return; }
    if (!Array.isArray(conditions) || !Array.isArray(actions)) {
      setError('Condições e Ações devem ser arrays JSON');
      return;
    }
    if (!form.name || !form.trigger_event_type) {
      setError('Nome e Trigger são obrigatórios');
      return;
    }

    upsert.mutate({
      id: form.id,
      name: form.name,
      description: form.description,
      trigger_event_type: form.trigger_event_type,
      decision_type: form.decision_type,
      priority: form.priority,
      active: form.active,
      execution_mode: form.execution_mode,
      auto_execute: form.execution_mode === 'auto',
      conditions,
      actions,
      workspace_id: currentWorkspace?.id,
    }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Regras de Decisão</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova regra</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? 'Editar regra' : 'Nova regra'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Trigger event type</Label>
                  <Input placeholder="ex: lead.created" value={form.trigger_event_type} onChange={(e) => setForm({ ...form, trigger_event_type: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Tipo de decisão</Label>
                  <Input value={form.decision_type} onChange={(e) => setForm({ ...form, decision_type: e.target.value })} />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Modo</Label>
                  <Select value={form.execution_mode} onValueChange={(v) => setForm({ ...form, execution_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXECUTION_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Activa</Label>
              </div>
              <div>
                <Label>Condições (JSON array)</Label>
                <p className="text-xs text-muted-foreground mb-1">Ex: [{`{"field":"payload.amount","op":"gte","value":1000}`}]</p>
                <Textarea className="font-mono text-xs" rows={6} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
              </div>
              <div>
                <Label>Ações (JSON array)</Label>
                <p className="text-xs text-muted-foreground mb-1">Ações suportadas: {ACTION_TYPES.join(', ')}</p>
                <Textarea className="font-mono text-xs" rows={8} value={form.actions} onChange={(e) => setForm({ ...form, actions: e.target.value })} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={upsert.isPending}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem regras configuradas. Cria a primeira para automatizar decisões.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Execuções</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.trigger_event_type}</TableCell>
                  <TableCell><Badge variant="outline">{r.execution_mode ?? (r.auto_execute ? 'auto' : 'suggest')}</Badge></TableCell>
                  <TableCell className="text-xs">{r.priority}</TableCell>
                  <TableCell className="text-xs">{r.execution_count ?? 0} <span className="text-muted-foreground">({r.success_count ?? 0}✓ / {r.failure_count ?? 0}✗)</span></TableCell>
                  <TableCell><Switch checked={r.active} onCheckedChange={(v) => toggleActive.mutate({ id: r.id, active: v })} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Eliminar "${r.name}"?`)) remove.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
