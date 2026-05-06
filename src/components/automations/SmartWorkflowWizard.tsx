import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
  TRIGGER_CATALOG, ACTION_CATALOG, FIELD_CATALOG, OPERATOR_CATALOG,
  useUpsertAutomation, type AutomationRule,
} from '@/hooks/useSmartWorkflows';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule?: Partial<AutomationRule> | null;
}

const STEPS = ['Trigger', 'Condições', 'Ações', 'Segurança'] as const;

export function SmartWorkflowWizard({ open, onOpenChange, rule }: Props) {
  const upsert = useUpsertAutomation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<AutomationRule>>(() => rule ?? {
    name: '', description: '', trigger_event: '', conditions_logic: 'all',
    conditions: [], actions: [], cooldown_minutes: 0, require_human_approval: false, is_active: false,
  });

  const update = (patch: Partial<AutomationRule>) => setForm((f) => ({ ...f, ...patch }));

  const addCondition = () => update({ conditions: [...(form.conditions ?? []), { field: 'intent', operator: 'equals', value: '' }] });
  const removeCondition = (i: number) => update({ conditions: (form.conditions ?? []).filter((_, idx) => idx !== i) });
  const updateCondition = (i: number, patch: Partial<AutomationRule['conditions'][number]>) =>
    update({ conditions: (form.conditions ?? []).map((c, idx) => idx === i ? { ...c, ...patch } : c) });

  const addAction = () => update({ actions: [...(form.actions ?? []), { action_type: 'add_conversation_tag', config: {} }] });
  const removeAction = (i: number) => update({ actions: (form.actions ?? []).filter((_, idx) => idx !== i) });
  const updateAction = (i: number, patch: Partial<AutomationRule['actions'][number]>) =>
    update({ actions: (form.actions ?? []).map((a, idx) => idx === i ? { ...a, ...patch } : a) });

  const handleSave = async () => {
    if (!form.name || !form.trigger_event) return;
    await upsert.mutateAsync(form as Parameters<typeof upsert.mutateAsync>[0]);
    onOpenChange(false);
    setStep(0);
  };

  const hasSensitive = (form.actions ?? []).some((a) => ACTION_CATALOG.find((ac) => ac.value === a.action_type)?.sensitive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule?.id ? 'Editar automação' : 'Nova automação inteligente'}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                step === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="space-y-4 min-h-[300px]">
          {step === 0 && (
            <>
              <div>
                <Label>Nome</Label>
                <Input value={form.name ?? ''} onChange={(e) => update({ name: e.target.value })} placeholder="Ex: Alertar urgência sem responsável" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description ?? ''} onChange={(e) => update({ description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Quando acontecer…</Label>
                <Select value={form.trigger_event ?? ''} onValueChange={(v) => update({ trigger_event: v, trigger_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar evento" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_CATALOG.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.category}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category ?? ''} onValueChange={(v) => update({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="Categoria (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {['whatsapp','support','sales','followup','appointment','quality','team','custom'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center justify-between">
                <Label>Lógica</Label>
                <Select value={form.conditions_logic ?? 'all'} onValueChange={(v) => update({ conditions_logic: v as 'all' | 'any' })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas (E)</SelectItem>
                    <SelectItem value="any">Qualquer (OU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.conditions ?? []).map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-3 bg-muted/30 rounded-md">
                  <div>
                    <Label className="text-xs">Campo</Label>
                    <Select value={c.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_CATALOG.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Operador</Label>
                    <Select value={c.operator} onValueChange={(v) => updateCondition(i, { operator: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{OPERATOR_CATALOG.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Valor</Label>
                    <Input value={String(c.value ?? '')} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="Valor" />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeCondition(i)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCondition} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar condição</Button>
              {(form.conditions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Sem condições — a regra dispara sempre que o evento ocorre.</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {(form.actions ?? []).map((a, i) => {
                const meta = ACTION_CATALOG.find((ac) => ac.value === a.action_type);
                return (
                  <div key={i} className="p-3 bg-muted/30 rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Select value={a.action_type} onValueChange={(v) => updateAction(i, { action_type: v, config: {} })}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{ACTION_CATALOG.map((ac) => <SelectItem key={ac.value} value={ac.value}>{ac.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => removeAction(i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    {meta?.sensitive && (
                      <div className="flex items-start gap-2 text-xs p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />
                        <span>Esta ação envia mensagem ao cliente — exige sempre aprovação humana.</span>
                      </div>
                    )}
                    {meta?.config.map((field) => (
                      <div key={field}>
                        <Label className="text-xs">{field}</Label>
                        <Input
                          value={String((a.config as Record<string, unknown>)[field] ?? '')}
                          onChange={(e) => updateAction(i, { config: { ...a.config, [field]: e.target.value } })}
                          placeholder={field}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
              <Button variant="outline" onClick={addAction} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar ação</Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm">
                Automações podem gerar custos de IA ou mensagens. Configure limites antes de ativar.
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ativa</Label>
                  <p className="text-xs text-muted-foreground">Quando desligada, não executa.</p>
                </div>
                <Switch checked={!!form.is_active} onCheckedChange={(v) => update({ is_active: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir aprovação humana</Label>
                  <p className="text-xs text-muted-foreground">Cada ação fica pendente para revisão.</p>
                </div>
                <Switch checked={!!form.require_human_approval || hasSensitive} disabled={hasSensitive} onCheckedChange={(v) => update({ require_human_approval: v })} />
              </div>
              <div>
                <Label>Cooldown (minutos)</Label>
                <Input type="number" value={form.cooldown_minutes ?? 0} onChange={(e) => update({ cooldown_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Máximo de execuções por dia</Label>
                <Input type="number" value={form.max_runs_per_day ?? ''} onChange={(e) => update({ max_runs_per_day: e.target.value ? Number(e.target.value) : null })} placeholder="Sem limite" />
              </div>
              <div>
                <Label>Máximo por entidade por dia</Label>
                <Input type="number" value={form.max_runs_per_entity_per_day ?? ''} onChange={(e) => update({ max_runs_per_entity_per_day: e.target.value ? Number(e.target.value) : null })} placeholder="Sem limite" />
              </div>
              {hasSensitive && (
                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30">
                  Ações sensíveis detectadas — aprovação humana obrigatória
                </Badge>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Anterior</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && (!form.name || !form.trigger_event)}>Seguinte</Button>
          ) : (
            <Button onClick={handleSave} disabled={upsert.isPending}>Guardar automação</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
