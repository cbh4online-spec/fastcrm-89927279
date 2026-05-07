/**
 * Call Center Operations — Fase 1R
 * Operação completa: Dashboard, Filas, IVR, Routing, Chamadas Perdidas,
 * Callbacks, Agentes, Horários, SLA, Logs.
 */
import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, Users, ListOrdered, Workflow, PhoneMissed, PhoneCall, UserCog,
  Clock, ShieldAlert, FileText, Plus, Trash2, Pencil, Play,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useVoiceQueues, useUpsertVoiceQueue, useDeleteVoiceQueue,
  useVoiceQueueMembers, useUpsertVoiceQueueMember, useDeleteVoiceQueueMember,
  useVoiceIvrMenus, useUpsertVoiceIvrMenu, useDeleteVoiceIvrMenu,
  useVoiceIvrOptions, useUpsertVoiceIvrOption, useDeleteVoiceIvrOption,
  useVoiceRoutingRules, useUpsertVoiceRoutingRule, useDeleteVoiceRoutingRule,
  useVoiceBusinessHours, useUpsertVoiceBusinessHours, useDeleteVoiceBusinessHours,
  useVoiceSlaPolicies, useUpsertVoiceSlaPolicy, useDeleteVoiceSlaPolicy,
  useVoiceCallbacks, useUpsertVoiceCallback, useCompleteCallback,
  useVoiceAgentStatus, useUpsertVoiceAgentStatus,
  useVoiceQueueEvents, useMissedCallRecovery,
} from "@/hooks/useCallCenter";
import { useVoiceCallLogs } from "@/hooks/useVoiceHub";

// ============ Helpers ============
function StatusBadge({ value, map }: { value: string; map: Record<string, string> }) {
  return <Badge variant="outline" className={map[value] || ""}>{value}</Badge>;
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm">{hint}</p>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardTab() {
  const { data: calls = [] } = useVoiceCallLogs({});
  const { data: callbacks = [] } = useVoiceCallbacks();
  const { data: queues = [] } = useVoiceQueues();

  const today = new Date(); today.setHours(0,0,0,0);
  const todayCalls = calls.filter((c: any) => new Date(c.created_at) >= today);
  const inbound = todayCalls.filter((c: any) => c.call_direction === "inbound");
  const missed = todayCalls.filter((c: any) => c.status === "missed" || c.call_direction === "missed");
  const answered = todayCalls.filter((c: any) => c.answered_at);
  const avgWait = (() => {
    const ws = todayCalls.filter((c: any) => c.wait_seconds).map((c: any) => c.wait_seconds);
    return ws.length ? Math.round(ws.reduce((a: number, b: number) => a + b, 0) / ws.length) : 0;
  })();
  const pendingCallbacks = callbacks.filter((c: any) => c.status === "pending");
  const overdueCallbacks = pendingCallbacks.filter((c: any) => c.due_at && new Date(c.due_at) < new Date());

  const kpis = [
    { label: "Recebidas hoje", value: inbound.length, color: "text-emerald-600" },
    { label: "Atendidas", value: answered.length, color: "text-blue-600" },
    { label: "Perdidas", value: missed.length, color: "text-red-600" },
    { label: "% Perdidas", value: inbound.length ? `${Math.round((missed.length/inbound.length)*100)}%` : "0%", color: "" },
    { label: "Tempo médio espera", value: `${avgWait}s`, color: "" },
    { label: "Callbacks pendentes", value: pendingCallbacks.length, color: "text-amber-600" },
    { label: "Callbacks vencidos", value: overdueCallbacks.length, color: "text-red-600" },
    { label: "Filas ativas", value: queues.filter((q: any) => q.status === "active").length, color: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-semibold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Volume por fila (hoje)</CardTitle></CardHeader>
        <CardContent>
          {queues.length === 0 ? (
            <EmptyState title="Sem filas" hint="Crie uma fila para começar a organizar chamadas." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fila</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead>
                <TableHead className="text-right">Chamadas hoje</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queues.map((q: any) => {
                  const count = todayCalls.filter((c: any) => c.queue_id === q.id).length;
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.name}</TableCell>
                      <TableCell>{q.queue_type}</TableCell>
                      <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ QUEUES ============
function QueuesTab() {
  const { data: queues = [] } = useVoiceQueues();
  const { data: hours = [] } = useVoiceBusinessHours();
  const { data: slas = [] } = useVoiceSlaPolicies();
  const { data: members = [] } = useVoiceQueueMembers();
  const upsert = useUpsertVoiceQueue();
  const del = useDeleteVoiceQueue();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const onEdit = (q: any) => { setEditing(q); setOpen(true); };
  const onNew = () => { setEditing({ name: "", queue_type: "general", routing_strategy: "least_loaded", status: "active", max_wait_seconds: 120, overflow_action: "voicemail_or_callback", recording_enabled: false, transcription_enabled: false }); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{queues.length} fila(s)</p>
        <Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Nova fila</Button>
      </div>

      {queues.length === 0 ? (
        <EmptyState title="Ainda não existem filas" hint="Crie uma fila para organizar chamadas por equipa ou objetivo." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Estratégia</TableHead>
            <TableHead>Agentes</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {queues.map((q: any) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.name}</TableCell>
                <TableCell><Badge variant="secondary">{q.queue_type}</Badge></TableCell>
                <TableCell className="text-xs">{q.routing_strategy}</TableCell>
                <TableCell>{members.filter((m: any) => m.queue_id === q.id && m.active).length}</TableCell>
                <TableCell><Badge variant={q.status === "active" ? "default" : "outline"}>{q.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(q.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar fila" : "Nova fila"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.queue_type} onValueChange={(v) => setEditing({ ...editing, queue_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["sales","support","billing","clinic","training","general","custom"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estratégia</Label>
                  <Select value={editing.routing_strategy} onValueChange={(v) => setEditing({ ...editing, routing_strategy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["round_robin","least_loaded","priority_based","skills_based","fixed_order","simultaneous","manual"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["active","inactive","archived"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Max. espera (s)</Label><Input type="number" value={editing.max_wait_seconds || 120} onChange={(e) => setEditing({ ...editing, max_wait_seconds: +e.target.value })} /></div>
                <div>
                  <Label>Ação overflow</Label>
                  <Select value={editing.overflow_action} onValueChange={(v) => setEditing({ ...editing, overflow_action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["voicemail","callback","voicemail_or_callback","transfer_to_fallback","send_whatsapp","create_ticket","hangup"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Horário</Label>
                  <Select value={editing.business_hours_id || "_none"} onValueChange={(v) => setEditing({ ...editing, business_hours_id: v === "_none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem horário</SelectItem>
                      {hours.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SLA</Label>
                  <Select value={editing.sla_policy_id || "_none"} onValueChange={(v) => setEditing({ ...editing, sla_policy_id: v === "_none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem SLA</SelectItem>
                      {slas.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.recording_enabled} onCheckedChange={(v) => setEditing({ ...editing, recording_enabled: v })} />Gravação</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={editing.transcription_enabled} onCheckedChange={(v) => setEditing({ ...editing, transcription_enabled: v })} />Transcrição</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutateAsync(editing).then(() => setOpen(false))}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ IVR ============
function IvrTab() {
  const { data: menus = [] } = useVoiceIvrMenus();
  const { data: options = [] } = useVoiceIvrOptions();
  const { data: queues = [] } = useVoiceQueues();
  const upsertMenu = useUpsertVoiceIvrMenu();
  const delMenu = useDeleteVoiceIvrMenu();
  const upsertOpt = useUpsertVoiceIvrOption();
  const delOpt = useDeleteVoiceIvrOption();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [optDialog, setOptDialog] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{menus.length} menu(s) IVR</p>
        <Button size="sm" onClick={() => { setEditing({ name: "", language: "pt-PT", status: "draft", timeout_seconds: 5, max_retries: 2, fallback_action: "queue", greeting_text: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo IVR
        </Button>
      </div>

      {menus.length === 0 ? (
        <EmptyState title="Ainda não existe IVR configurado" hint="Crie um menu simples para encaminhar chamadas." />
      ) : menus.map((m: any) => {
        const opts = options.filter((o: any) => o.ivr_menu_id === m.id).sort((a: any, b: any) => a.digit.localeCompare(b.digit));
        return (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{m.greeting_text || "Sem saudação"}</p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delMenu.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {opts.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between border rounded p-2 text-sm">
                    <span><Badge className="mr-2">{o.digit}</Badge>{o.label} → <span className="text-muted-foreground">{o.action_type}</span></span>
                    <Button size="icon" variant="ghost" onClick={() => delOpt.mutate(o.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full" onClick={() => setOptDialog({ ivr_menu_id: m.id, digit: "", label: "", action_type: "route_to_queue", priority: 100, active: true })}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar opção
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar IVR" : "Novo IVR"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Saudação</Label><Textarea value={editing.greeting_text || ""} onChange={(e) => setEditing({ ...editing, greeting_text: e.target.value })} placeholder="Prima 1 para Vendas, 2 para Suporte, 0 para falar com operador." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Idioma</Label><Input value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value })} /></div>
                <div><Label>Timeout (s)</Label><Input type="number" value={editing.timeout_seconds} onChange={(e) => setEditing({ ...editing, timeout_seconds: +e.target.value })} /></div>
                <div><Label>Tentativas</Label><Input type="number" value={editing.max_retries} onChange={(e) => setEditing({ ...editing, max_retries: +e.target.value })} /></div>
              </div>
              <div><Label>Estado</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","active","inactive","archived"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">⚠ Configuração preparada. O fornecedor atual pode não suportar IVR dinâmico.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsertMenu.mutateAsync(editing).then(() => setOpen(false))}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!optDialog} onOpenChange={(o) => !o && setOptDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova opção IVR</DialogTitle></DialogHeader>
          {optDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tecla</Label><Input value={optDialog.digit} onChange={(e) => setOptDialog({ ...optDialog, digit: e.target.value })} /></div>
                <div><Label>Etiqueta</Label><Input value={optDialog.label} onChange={(e) => setOptDialog({ ...optDialog, label: e.target.value })} /></div>
              </div>
              <div><Label>Ação</Label>
                <Select value={optDialog.action_type} onValueChange={(v) => setOptDialog({ ...optDialog, action_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["route_to_queue","route_to_user","route_to_number","create_ticket","send_whatsapp","voicemail","callback","repeat_menu","hangup"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {optDialog.action_type === "route_to_queue" && (
                <div><Label>Fila destino</Label>
                  <Select value={optDialog.target_queue_id || ""} onValueChange={(v) => setOptDialog({ ...optDialog, target_queue_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{queues.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptDialog(null)}>Cancelar</Button>
            <Button onClick={() => upsertOpt.mutateAsync(optDialog).then(() => setOptDialog(null))}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ ROUTING ============
function RoutingTab() {
  const { data: rules = [] } = useVoiceRoutingRules();
  const upsert = useUpsertVoiceRoutingRule();
  const del = useDeleteVoiceRoutingRule();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} regra(s)</p>
        <Button size="sm" onClick={() => { setEditing({ name: "", trigger_type: "inbound_call", priority: 100, active: true, conditions: [], actions: [{ action: "route_to_queue", target: {} }] }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Nova regra
        </Button>
      </div>
      {rules.length === 0 ? (
        <EmptyState title="Não existem regras de routing" hint="Comece por uma regra simples para chamadas recebidas." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Trigger</TableHead><TableHead>Prioridade</TableHead>
            <TableHead>Execuções</TableHead><TableHead>Ativa</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rules.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="secondary">{r.trigger_type}</Badge></TableCell>
                <TableCell>{r.priority}</TableCell>
                <TableCell>{r.execution_count || 0}</TableCell>
                <TableCell><Switch checked={r.active} onCheckedChange={(v) => upsert.mutate({ id: r.id, active: v })} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar regra" : "Nova regra"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Trigger</Label>
                <Select value={editing.trigger_type} onValueChange={(v) => setEditing({ ...editing, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["inbound_call","outbound_call","missed_call","after_hours","ivr_selection","callback_request"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Prioridade</Label><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: +e.target.value })} /></div>
              <div><Label>Condições (JSON)</Label><Textarea rows={3} value={JSON.stringify(editing.conditions || [], null, 2)} onChange={(e) => { try { setEditing({ ...editing, conditions: JSON.parse(e.target.value) }); } catch {} }} /></div>
              <div><Label>Ações (JSON)</Label><Textarea rows={3} value={JSON.stringify(editing.actions || [], null, 2)} onChange={(e) => { try { setEditing({ ...editing, actions: JSON.parse(e.target.value) }); } catch {} }} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutateAsync(editing).then(() => setOpen(false))}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ MISSED CALLS ============
function MissedCallsTab() {
  const { data: calls = [] } = useVoiceCallLogs({});
  const recovery = useMissedCallRecovery();
  const missed = calls.filter((c: any) => c.status === "missed" || c.call_direction === "missed" || (!c.answered_at && c.call_direction === "inbound"));

  return (
    <div className="space-y-4">
      {missed.length === 0 ? (
        <EmptyState title="Sem chamadas perdidas" hint="Todas as chamadas foram atendidas." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead>
            <TableHead>Motivo</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {missed.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{format(new Date(c.created_at), "dd MMM HH:mm", { locale: pt })}</TableCell>
                <TableCell className="font-mono text-sm">{c.from_number}</TableCell>
                <TableCell className="font-mono text-sm">{c.to_number}</TableCell>
                <TableCell><Badge variant="outline">{c.missed_reason || "—"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => recovery.mutate({ call_log_id: c.id, mode: "manual" })}>
                    <PhoneCall className="h-3 w-3 mr-1" />Recuperar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============ CALLBACKS ============
function CallbacksTab() {
  const { data: callbacks = [] } = useVoiceCallbacks();
  const complete = useCompleteCallback();
  const upsert = useUpsertVoiceCallback();
  const [filter, setFilter] = useState<string>("pending");

  const filtered = useMemo(() => {
    if (filter === "all") return callbacks;
    if (filter === "overdue") return callbacks.filter((c: any) => c.status === "pending" && c.due_at && new Date(c.due_at) < new Date());
    return callbacks.filter((c: any) => c.status === filter);
  }, [callbacks, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending","overdue","completed","all"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Não existem callbacks" hint="Os callbacks aparecem aqui quando uma chamada é perdida ou agendada." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Telefone</TableHead><TableHead>Origem</TableHead><TableHead>Prioridade</TableHead>
            <TableHead>Devido</TableHead><TableHead>Tentativas</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((c: any) => {
              const overdue = c.status === "pending" && c.due_at && new Date(c.due_at) < new Date();
              return (
                <TableRow key={c.id} className={overdue ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{c.source}</Badge></TableCell>
                  <TableCell><Badge variant={c.priority === "critical" ? "destructive" : "outline"}>{c.priority}</Badge></TableCell>
                  <TableCell className="text-xs">{c.due_at ? format(new Date(c.due_at), "dd MMM HH:mm", { locale: pt }) : "—"}</TableCell>
                  <TableCell>{c.attempts}</TableCell>
                  <TableCell><Badge>{c.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {c.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => complete.mutate({ callback_id: c.id, outcome: "completed" })}>Concluir</Button>
                        <Button size="sm" variant="outline" onClick={() => complete.mutate({ callback_id: c.id, outcome: "no_answer" })}>Sem resposta</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============ AGENTS ============
function AgentsTab() {
  const { data: statuses = [] } = useVoiceAgentStatus();
  const { data: members = [] } = useVoiceQueueMembers();
  const { data: queues = [] } = useVoiceQueues();
  const upsert = useUpsertVoiceAgentStatus();

  const colorMap: Record<string, string> = {
    available: "bg-emerald-500/10 text-emerald-700",
    busy: "bg-amber-500/10 text-amber-700",
    on_call: "bg-blue-500/10 text-blue-700",
    away: "bg-gray-500/10 text-gray-700",
    offline: "bg-muted text-muted-foreground",
    do_not_disturb: "bg-red-500/10 text-red-700",
  };

  return (
    <div className="space-y-4">
      {statuses.length === 0 ? (
        <EmptyState title="Sem agentes registados" hint="Os agentes aparecem aqui quando definem o seu estado ou são adicionados a filas." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Agente</TableHead><TableHead>Estado</TableHead><TableHead>Filas</TableHead>
            <TableHead>Última alteração</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {statuses.map((s: any) => {
              const userQueues = members.filter((m: any) => m.user_id === s.user_id).map((m: any) => queues.find((q: any) => q.id === m.queue_id)?.name).filter(Boolean);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
                  <TableCell><Badge className={colorMap[s.status]}>{s.status}</Badge></TableCell>
                  <TableCell className="text-xs">{userQueues.join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(s.last_status_change_at), "HH:mm", { locale: pt })}</TableCell>
                  <TableCell className="text-right">
                    <Select value={s.status} onValueChange={(v) => upsert.mutate({ id: s.id, user_id: s.user_id, status: v, last_status_change_at: new Date().toISOString() })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["available","busy","away","on_call","offline","do_not_disturb"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============ HOURS ============
function HoursTab() {
  const { data: hours = [] } = useVoiceBusinessHours();
  const upsert = useUpsertVoiceBusinessHours();
  const del = useDeleteVoiceBusinessHours();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const defaultSchedule = {
    monday: [{ start: "09:00", end: "18:00" }],
    tuesday: [{ start: "09:00", end: "18:00" }],
    wednesday: [{ start: "09:00", end: "18:00" }],
    thursday: [{ start: "09:00", end: "18:00" }],
    friday: [{ start: "09:00", end: "18:00" }],
    saturday: [], sunday: [],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{hours.length} horário(s)</p>
        <Button size="sm" onClick={() => { setEditing({ name: "", timezone: "Europe/Lisbon", weekly_schedule: defaultSchedule, holidays: [], after_hours_action: "callback", active: true }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo horário
        </Button>
      </div>
      {hours.length === 0 ? (
        <EmptyState title="Sem horários" hint="Defina horários de atendimento para gerir chamadas fora-de-horas." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {hours.map((h: any) => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div>
                    <CardTitle className="text-base">{h.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{h.timezone}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(h); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                {Object.entries(h.weekly_schedule || {}).map(([day, slots]: any) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}</span>
                    <span>{slots.length === 0 ? "fechado" : slots.map((s: any) => `${s.start}-${s.end}`).join(", ")}</span>
                  </div>
                ))}
                <p className="pt-2 text-muted-foreground">Fora de horas: {h.after_hours_action}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar horário" : "Novo horário"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Timezone</Label><Input value={editing.timezone} onChange={(e) => setEditing({ ...editing, timezone: e.target.value })} /></div>
              <div><Label>Ação fora-de-horas</Label>
                <Select value={editing.after_hours_action} onValueChange={(v) => setEditing({ ...editing, after_hours_action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["voicemail","callback","whatsapp","ticket","transfer","closed_message"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Mensagem fora-de-horas</Label><Textarea value={editing.after_hours_message || ""} onChange={(e) => setEditing({ ...editing, after_hours_message: e.target.value })} /></div>
              <div><Label>Horário semanal (JSON)</Label><Textarea rows={6} value={JSON.stringify(editing.weekly_schedule, null, 2)} onChange={(e) => { try { setEditing({ ...editing, weekly_schedule: JSON.parse(e.target.value) }); } catch {} }} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutateAsync(editing).then(() => setOpen(false))}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SLA ============
function SlaTab() {
  const { data: slas = [] } = useVoiceSlaPolicies();
  const upsert = useUpsertVoiceSlaPolicy();
  const del = useDeleteVoiceSlaPolicy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">{slas.length} política(s)</p>
        <Button size="sm" onClick={() => { setEditing({ name: "", first_answer_seconds: 30, missed_call_callback_minutes: 15, voicemail_response_minutes: 60, callback_completion_minutes: 120, priority: "medium", business_hours_only: true, active: true }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Nova política
        </Button>
      </div>
      {slas.length === 0 ? (
        <EmptyState title="Sem políticas SLA" hint="Crie SLAs para garantir tempos de resposta consistentes." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Atender (s)</TableHead><TableHead>Callback (min)</TableHead>
            <TableHead>Prioridade</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {slas.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.first_answer_seconds}</TableCell>
                <TableCell>{s.missed_call_callback_minutes}</TableCell>
                <TableCell><Badge>{s.priority}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar SLA" : "Nova SLA"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Atender (s)</Label><Input type="number" value={editing.first_answer_seconds} onChange={(e) => setEditing({ ...editing, first_answer_seconds: +e.target.value })} /></div>
              <div><Label>Callback chamada perdida (min)</Label><Input type="number" value={editing.missed_call_callback_minutes} onChange={(e) => setEditing({ ...editing, missed_call_callback_minutes: +e.target.value })} /></div>
              <div><Label>Voicemail (min)</Label><Input type="number" value={editing.voicemail_response_minutes} onChange={(e) => setEditing({ ...editing, voicemail_response_minutes: +e.target.value })} /></div>
              <div><Label>Conclusão callback (min)</Label><Input type="number" value={editing.callback_completion_minutes} onChange={(e) => setEditing({ ...editing, callback_completion_minutes: +e.target.value })} /></div>
              <div><Label>Prioridade</Label>
                <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2"><Switch checked={editing.business_hours_only} onCheckedChange={(v) => setEditing({ ...editing, business_hours_only: v })} />Apenas em horário</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutateAsync(editing).then(() => setOpen(false))}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ LOGS ============
function LogsTab() {
  const { data: events = [] } = useVoiceQueueEvents(200);
  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <EmptyState title="Sem eventos" hint="Os eventos operacionais (entrada em fila, atribuição, abandono) aparecem aqui." />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Hora</TableHead><TableHead>Evento</TableHead><TableHead>Fila</TableHead>
            <TableHead>Agente</TableHead><TableHead>Payload</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {events.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{format(new Date(e.created_at), "dd/MM HH:mm:ss", { locale: pt })}</TableCell>
                <TableCell><Badge variant="outline">{e.event_type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.queue_id?.slice(0, 8) || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.user_id?.slice(0, 8) || "—"}</TableCell>
                <TableCell className="text-xs font-mono truncate max-w-xs">{JSON.stringify(e.payload)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ============ MAIN ============
export function CallCenterOperations() {
  const [tab, setTab] = useState("dashboard");
  const tabs = [
    { v: "dashboard", l: "Dashboard", icon: Activity },
    { v: "queues", l: "Filas", icon: Users },
    { v: "ivr", l: "IVR", icon: ListOrdered },
    { v: "routing", l: "Routing", icon: Workflow },
    { v: "missed", l: "Perdidas", icon: PhoneMissed },
    { v: "callbacks", l: "Callbacks", icon: PhoneCall },
    { v: "agents", l: "Agentes", icon: UserCog },
    { v: "hours", l: "Horários", icon: Clock },
    { v: "sla", l: "SLA", icon: ShieldAlert },
    { v: "logs", l: "Logs", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Operação de Call Center</h2>
        <p className="text-sm text-muted-foreground">Organize chamadas, reduza perdas e encaminhe cada contacto para a pessoa certa.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full h-auto">
          {tabs.map(t => (
            <TabsTrigger key={t.v} value={t.v} className="text-xs gap-1">
              <t.icon className="h-3 w-3" />{t.l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="queues"><QueuesTab /></TabsContent>
        <TabsContent value="ivr"><IvrTab /></TabsContent>
        <TabsContent value="routing"><RoutingTab /></TabsContent>
        <TabsContent value="missed"><MissedCallsTab /></TabsContent>
        <TabsContent value="callbacks"><CallbacksTab /></TabsContent>
        <TabsContent value="agents"><AgentsTab /></TabsContent>
        <TabsContent value="hours"><HoursTab /></TabsContent>
        <TabsContent value="sla"><SlaTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default CallCenterOperations;
