/**
 * AgentGoalsPanel - Tabs for Handover, Workflows, Transfer, Booking, Follow-up config per agent
 */

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, Workflow, ArrowRightLeft, UserCheck, CalendarDays, MailCheck } from 'lucide-react';
import {
  useWorkflowTriggers,
  useCreateWorkflowTrigger,
  useDeleteWorkflowTrigger,
  useTransferRules,
  useCreateTransferRule,
  useDeleteTransferRule,
} from '@/hooks/useAgentGoals';
import { useBookingCalendars, useCreateBookingCalendar, useDeleteBookingCalendar } from '@/hooks/useAgentBooking';
import { useFollowupPolicies, useCreateFollowupPolicy, useDeleteFollowupPolicy } from '@/hooks/useAgentFollowup';
import type { AIChannelAgent } from '@/types/aiChannelAgents';

interface AgentGoalsPanelProps {
  agent: AIChannelAgent;
  agents: AIChannelAgent[]; // all agents for transfer targets
  onUpdateGoalConfig?: (config: Record<string, unknown>) => void;
}

export function AgentGoalsPanel({ agent, agents, onUpdateGoalConfig }: AgentGoalsPanelProps) {
  return (
    <Tabs defaultValue="handover" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="handover" className="gap-1 text-xs px-1">
          <UserCheck className="h-3 w-3" />
          <span className="hidden sm:inline">Handover</span>
        </TabsTrigger>
        <TabsTrigger value="workflows" className="gap-1 text-xs px-1">
          <Workflow className="h-3 w-3" />
          <span className="hidden sm:inline">Workflows</span>
        </TabsTrigger>
        <TabsTrigger value="transfer" className="gap-1 text-xs px-1">
          <ArrowRightLeft className="h-3 w-3" />
          <span className="hidden sm:inline">Transfer</span>
        </TabsTrigger>
        <TabsTrigger value="booking" className="gap-1 text-xs px-1">
          <CalendarDays className="h-3 w-3" />
          <span className="hidden sm:inline">Agenda</span>
        </TabsTrigger>
        <TabsTrigger value="followup" className="gap-1 text-xs px-1">
          <MailCheck className="h-3 w-3" />
          <span className="hidden sm:inline">Follow-up</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="handover">
        <HandoverTab agent={agent} onUpdateGoalConfig={onUpdateGoalConfig} />
      </TabsContent>
      <TabsContent value="workflows">
        <WorkflowTriggersTab agent={agent} />
      </TabsContent>
      <TabsContent value="transfer">
        <TransferTab agent={agent} agents={agents} />
      </TabsContent>
      <TabsContent value="booking">
        <BookingTab agent={agent} />
      </TabsContent>
      <TabsContent value="followup">
        <FollowupTab agent={agent} />
      </TabsContent>
    </Tabs>
  );
}

// ===================== Handover Tab =====================

function HandoverTab({ agent, onUpdateGoalConfig }: { agent: AIChannelAgent; onUpdateGoalConfig?: (c: Record<string, unknown>) => void }) {
  const goalConfig = (agent as any).goalConfig || {};
  const [maxRetries, setMaxRetries] = useState<number>(goalConfig.handover_max_retries ?? 2);
  const [closingMessage, setClosingMessage] = useState<string>(goalConfig.handover_closing_message ?? 'Vou transferir para um colega da equipa que poderá ajudá-lo melhor. Obrigado!');
  const [tagName, setTagName] = useState<string>(goalConfig.handover_tag ?? 'human_handover');
  const [autoHandover, setAutoHandover] = useState<boolean>(goalConfig.auto_handover_enabled ?? true);

  const handleSave = () => {
    onUpdateGoalConfig?.({
      ...goalConfig,
      handover_max_retries: maxRetries,
      handover_closing_message: closingMessage,
      handover_tag: tagName,
      auto_handover_enabled: autoHandover,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Regras de Handover</CardTitle>
        <CardDescription className="text-xs">
          Configure quando e como o bot transfere para atendimento humano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Handover automático</Label>
            <p className="text-xs text-muted-foreground">
              Transferir automaticamente após falhas consecutivas
            </p>
          </div>
          <Switch checked={autoHandover} onCheckedChange={setAutoHandover} />
        </div>

        {autoHandover && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Max tentativas antes de handover</Label>
              <Badge variant="secondary">{maxRetries}</Badge>
            </div>
            <Slider
              value={[maxRetries]}
              onValueChange={([v]) => setMaxRetries(v)}
              min={1}
              max={5}
              step={1}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm">Mensagem de encerramento</Label>
          <Textarea
            value={closingMessage}
            onChange={(e) => setClosingMessage(e.target.value)}
            rows={2}
            placeholder="Mensagem enviada ao transferir..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Tag a aplicar</Label>
          <Input
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="human_handover"
          />
        </div>

        <Button onClick={handleSave} size="sm" className="w-full">
          Guardar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}

// ===================== Workflow Triggers Tab =====================

function WorkflowTriggersTab({ agent }: { agent: AIChannelAgent }) {
  const { data: triggers = [], isLoading } = useWorkflowTriggers(agent.id);
  const createTrigger = useCreateWorkflowTrigger();
  const deleteTrigger = useDeleteWorkflowTrigger();

  const [showForm, setShowForm] = useState(false);
  const [actionName, setActionName] = useState('');
  const [condition, setCondition] = useState('');
  const [examples, setExamples] = useState('');
  const [workflowId, setWorkflowId] = useState('');

  const handleCreate = () => {
    if (!actionName.trim() || !condition.trim()) return;
    createTrigger.mutate({
      bot_id: agent.id,
      workflow_id: workflowId || actionName,
      action_name: actionName.trim(),
      trigger_condition_text: condition.trim(),
      examples: examples.trim() ? examples.split('\n').filter(Boolean) : null,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setActionName('');
        setCondition('');
        setExamples('');
        setWorkflowId('');
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Workflow Triggers</CardTitle>
            <CardDescription className="text-xs">
              Disparar workflows automaticamente com base na intenção detectada
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da ação</Label>
              <Input value={actionName} onChange={(e) => setActionName(e.target.value)} placeholder="Ex: Agendar reunião" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Condição de disparo</Label>
              <Textarea value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ex: Quando o contacto quer agendar uma reunião ou demonstração" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exemplos (um por linha)</Label>
              <Textarea value={examples} onChange={(e) => setExamples(e.target.value)} placeholder="Quero marcar uma reunião&#10;Posso agendar uma demo?" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow ID (código)</Label>
              <Input value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} placeholder="workflow_code ou UUID" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createTrigger.isPending}>
                Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>
        ) : triggers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum trigger configurado
          </p>
        ) : (
          triggers.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-2 p-2 border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.action_name}</span>
                  <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {t.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {t.trigger_condition_text}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => deleteTrigger.mutate(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ===================== Transfer Tab =====================

function TransferTab({ agent, agents }: { agent: AIChannelAgent; agents: AIChannelAgent[] }) {
  const { data: rules = [], isLoading } = useTransferRules(agent.id);
  const createRule = useCreateTransferRule();
  const deleteRule = useDeleteTransferRule();

  const otherAgents = agents.filter(a => a.id !== agent.id);
  const [showForm, setShowForm] = useState(false);
  const [toBotId, setToBotId] = useState('');
  const [condition, setCondition] = useState('');
  const [examples, setExamples] = useState('');

  const handleCreate = () => {
    if (!toBotId || !condition.trim()) return;
    createRule.mutate({
      from_bot_id: agent.id,
      to_bot_id: toBotId,
      trigger_condition_text: condition.trim(),
      examples: examples.trim() ? examples.split('\n').filter(Boolean) : null,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setToBotId('');
        setCondition('');
        setExamples('');
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Regras de Transferência</CardTitle>
            <CardDescription className="text-xs">
              Transferir automaticamente para outro bot com base na intenção
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} disabled={otherAgents.length === 0}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Bot destino</Label>
              <Select value={toBotId} onValueChange={setToBotId}>
                <SelectTrigger><SelectValue placeholder="Selecionar bot..." /></SelectTrigger>
                <SelectContent>
                  {otherAgents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.channel})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Condição de transferência</Label>
              <Textarea value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ex: Quando o contacto pergunta sobre suporte técnico" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exemplos (um por linha)</Label>
              <Textarea value={examples} onChange={(e) => setExamples(e.target.value)} placeholder="Preciso de ajuda técnica&#10;O produto não funciona" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createRule.isPending}>
                Criar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>
        ) : rules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {otherAgents.length === 0 ? 'Crie mais agentes para configurar transferências' : 'Nenhuma regra configurada'}
          </p>
        ) : (
          rules.map((r) => {
            const targetAgent = agents.find(a => a.id === r.to_bot_id);
            return (
              <div key={r.id} className="flex items-start justify-between gap-2 p-2 border rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">→ {targetAgent?.name || 'Bot removido'}</span>
                    <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {r.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {r.trigger_condition_text}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive shrink-0"
                  onClick={() => deleteRule.mutate(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ===================== Booking Tab =====================

function BookingTab({ agent }: { agent: AIChannelAgent }) {
  const { data: calendars = [], isLoading } = useBookingCalendars(agent.id);
  const createCalendar = useCreateBookingCalendar();
  const deleteCalendar = useDeleteBookingCalendar();

  const [showForm, setShowForm] = useState(false);
  const [calendarName, setCalendarName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const handleCreate = () => {
    if (!calendarName.trim()) return;
    createCalendar.mutate({
      bot_id: agent.id,
      calendar_id: crypto.randomUUID(),
      calendar_name: calendarName.trim(),
      description: description.trim() || null,
      keywords: keywords.trim() ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      is_fallback: isFallback,
      allow_cancel: false,
      post_booking_actions: {},
    }, {
      onSuccess: () => {
        setShowForm(false);
        setCalendarName('');
        setDescription('');
        setKeywords('');
        setIsFallback(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Calendários de Agendamento</CardTitle>
            <CardDescription className="text-xs">
              Associe calendários ao bot para agendamento inteligente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do calendário</Label>
              <Input value={calendarName} onChange={(e) => setCalendarName(e.target.value)} placeholder="Ex: Reunião de vendas" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quando usar este calendário..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords (separadas por vírgula)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="reunião, demo, apresentação" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Calendário fallback</Label>
              <Switch checked={isFallback} onCheckedChange={setIsFallback} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createCalendar.isPending}>Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>
        ) : calendars.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum calendário configurado</p>
        ) : (
          calendars.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 p-2 border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{c.calendar_name}</span>
                  {c.is_fallback && <Badge variant="outline" className="text-[10px]">Fallback</Badge>}
                </div>
                {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                {c.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.keywords.map((kw, i) => <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCalendar.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ===================== Follow-up Tab =====================

function FollowupTab({ agent }: { agent: AIChannelAgent }) {
  const { data: policies = [], isLoading } = useFollowupPolicies(agent.id);
  const createPolicy = useCreateFollowupPolicy();
  const deletePolicy = useDeleteFollowupPolicy();

  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState('whatsapp');
  const [delaysText, setDelaysText] = useState('60, 360, 1440');
  const [stoppedReplying, setStoppedReplying] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleCreate = () => {
    const delays = delaysText.split(',').map(d => parseInt(d.trim())).filter(n => !isNaN(n));
    if (delays.length === 0) return;
    createPolicy.mutate({
      bot_id: agent.id,
      channel,
      scenarios: { stopped_replying: stoppedReplying, busy },
      cadence: { delays_minutes: delays },
      working_hours: {},
      allow_channel_switching: false,
      switch_rules: null,
      is_active: true,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setDelaysText('60, 360, 1440');
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Políticas de Follow-up</CardTitle>
            <CardDescription className="text-xs">
              Configure follow-ups automáticos quando o contacto para de responder
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cenários</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={stoppedReplying} onChange={(e) => setStoppedReplying(e.target.checked)} className="rounded" />
                  Parou de responder
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} className="rounded" />
                  Ocupado / pediu para depois
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cadência (minutos, separados por vírgula)</Label>
              <Input value={delaysText} onChange={(e) => setDelaysText(e.target.value)} placeholder="60, 360, 1440" />
              <p className="text-[10px] text-muted-foreground">Ex: 60 = 1h, 360 = 6h, 1440 = 24h</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createPolicy.isPending}>Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>
        ) : policies.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma política configurada</p>
        ) : (
          policies.map((p) => {
            const cadence = p.cadence as any;
            const delays = cadence?.delays_minutes || [];
            return (
              <div key={p.id} className="flex items-start justify-between gap-2 p-2 border rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MailCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium capitalize">{p.channel}</span>
                    <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {delays.length} etapas: {delays.map((d: number) => d >= 60 ? `${Math.round(d / 60)}h` : `${d}m`).join(' → ')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deletePolicy.mutate(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
