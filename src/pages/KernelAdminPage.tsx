import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, AlertTriangle, Brain, GitBranch, Layers, ShieldCheck, Stethoscope, Workflow,
} from 'lucide-react';
import {
  useKernelOverview, useEventRegistryFull, useEventStream,
  useDecisionsList, useChangeImpacts,
  useContextGraph, useAuditLogs, useKernelDiagnostics,
} from '@/hooks/useKernel';
import { DecisionRulesEditor } from '@/components/kernel/DecisionRulesEditor';
import { ActionRunsPanel } from '@/components/kernel/ActionRunsPanel';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const sevColor: Record<string, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function KernelAdminPage() {
  const overview = useKernelOverview();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">FastCRM Kernel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          O núcleo que liga eventos, contexto, decisões e ações em todo o FastCRM.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Eventos 24h" value={overview.data?.eventsToday ?? 0} icon={Activity} />
        <KpiCard label="Falhados" value={overview.data?.failed ?? 0} icon={AlertTriangle} accent="text-red-600" />
        <KpiCard label="Decisões 24h" value={overview.data?.decisions ?? 0} icon={Brain} />
        <KpiCard label="Impactos abertos" value={overview.data?.impacts ?? 0} icon={Workflow} accent="text-amber-600" />
        <KpiCard label="Context nodes" value={overview.data?.nodes ?? 0} icon={GitBranch} />
        <KpiCard label="Context edges" value={overview.data?.edges ?? 0} icon={Layers} />
        <KpiCard label="Registry" value={overview.data?.registry ?? 0} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="stream" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="stream">Fluxo de Eventos</TabsTrigger>
          <TabsTrigger value="registry">Registo</TabsTrigger>
          <TabsTrigger value="decisions">Decisões</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="actions">Execuções</TabsTrigger>
          <TabsTrigger value="context">Grafo</TabsTrigger>
          <TabsTrigger value="impact">Impacto</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="diag">Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="stream"><EventStreamPanel /></TabsContent>
        <TabsContent value="registry"><RegistryPanel /></TabsContent>
        <TabsContent value="decisions"><DecisionsPanel /></TabsContent>
        <TabsContent value="rules"><DecisionRulesEditor /></TabsContent>
        <TabsContent value="actions"><ActionRunsPanel /></TabsContent>
        <TabsContent value="context"><ContextGraphPanel /></TabsContent>
        <TabsContent value="impact"><ChangeImpactPanel /></TabsContent>
        <TabsContent value="audit"><AuditPanel /></TabsContent>
        <TabsContent value="diag"><DiagnosticsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent ?? 'text-muted-foreground'}`} />
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

// ───────── Event Stream ─────────
function EventStreamPanel() {
  const [eventType, setEventType] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const { data = [], isLoading } = useEventStream({ eventType: eventType || undefined, status: status || undefined, limit: 200 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Eventos</CardTitle>
        <div className="flex gap-2 mt-2">
          <Input placeholder="Filtrar por event_name…" value={eventType} onChange={(e) => setEventType(e.target.value)} className="max-w-xs" />
          <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="max-w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processed">Processado</SelectItem>
              <SelectItem value="failed">Falhado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Ainda não existem eventos registados no Kernel.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e: any) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: pt })}</TableCell>
                  <TableCell className="font-mono text-xs">{e.event_name ?? e.type}</TableCell>
                  <TableCell className="text-xs">{e.entity_kind}</TableCell>
                  <TableCell><Badge className={sevColor[e.severity ?? 'info']}>{e.severity ?? 'info'}</Badge></TableCell>
                  <TableCell><Badge variant={e.status === 'failed' ? 'destructive' : e.status === 'processed' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                  <TableCell className="text-xs">{e.source_module ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-[500px] sm:max-w-[600px] overflow-y-auto">
            {selected && (
              <>
                <SheetHeader><SheetTitle>{selected.event_name ?? selected.type}</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4 text-sm">
                  <Row label="Entidade" value={`${selected.entity_kind} / ${selected.entity_id}`} />
                  <Row label="Categoria" value={selected.category ?? '—'} />
                  <Row label="Severidade" value={selected.severity} />
                  <Row label="Estado" value={selected.status} />
                  <Row label="Correlation ID" value={selected.correlation_id ?? '—'} />
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Payload</div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">{JSON.stringify(selected.payload, null, 2)}</pre>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return <div className="grid grid-cols-3 gap-2"><span className="text-muted-foreground text-xs">{label}</span><span className="col-span-2 text-xs font-mono break-all">{String(value)}</span></div>;
}

// ───────── Registry ─────────
function RegistryPanel() {
  const { data = [], isLoading } = useEventRegistryFull();
  const [q, setQ] = useState('');
  const filtered = data.filter((r: any) => !q || r.event_type?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registo de Eventos</CardTitle>
        <Input placeholder="Filtrar event_type…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs mt-2" />
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">O Event Registry ainda não tem eventos configurados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event type</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>PII</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.event_type}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.domain}</TableCell>
                  <TableCell className="text-xs">{r.entity_type ?? '—'}</TableCell>
                  <TableCell><Badge className={sevColor[r.severity_default]}>{r.severity_default}</Badge></TableCell>
                  <TableCell className="text-xs">{r.pii_level}</TableCell>
                  <TableCell><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ───────── Decisions ─────────
function DecisionsPanel() {
  const { data = [], isLoading } = useDecisionsList();
  return (
    <Card>
      <CardHeader><CardTitle>Decisões</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma decisão gerada neste período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: pt })}</TableCell>
                  <TableCell className="text-xs">{d.decision_type ?? d.type}</TableCell>
                  <TableCell className="text-xs">{d.title ?? d.summary}</TableCell>
                  <TableCell className="text-xs">{d.confidence ? `${Math.round(d.confidence * 100)}%` : '—'}</TableCell>
                  <TableCell className="text-xs">{d.decision_source ?? 'system'}</TableCell>
                  <TableCell><Badge variant={d.status === 'executed' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Rules panel agora vive em src/components/kernel/DecisionRulesEditor.tsx

// ───────── Context Graph ─────────
function ContextGraphPanel() {
  const { data, isLoading } = useContextGraph();
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Nós ({data?.nodes.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
          {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : (data?.nodes ?? []).map((n: any) => (
            <div key={n.id} className="text-xs flex items-center justify-between py-1 border-b">
              <span className="font-mono">{n.entity_type}</span>
              <span className="text-muted-foreground">{n.label ?? n.entity_id?.slice(0, 8)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ligações ({data?.edges.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
          {(data?.edges ?? []).map((e: any) => (
            <div key={e.id} className="text-xs py-1 border-b">
              <span className="font-mono">{e.from_entity_type}</span>
              <span className="text-muted-foreground"> → {e.relationship_type} → </span>
              <span className="font-mono">{e.to_entity_type}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ───────── Change Impact ─────────
function ChangeImpactPanel() {
  const { data = [], isLoading, updateStatus } = useChangeImpacts();
  return (
    <Card>
      <CardHeader><CardTitle>Mapa de Impacto</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum impacto aberto.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Entidade impactada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{i.title}</TableCell>
                  <TableCell className="text-xs">{i.impact_type}</TableCell>
                  <TableCell><Badge className={sevColor[i.severity === 'critical' ? 'critical' : i.severity === 'high' ? 'warning' : 'info']}>{i.severity}</Badge></TableCell>
                  <TableCell className="text-xs">{i.impacted_entity_type}</TableCell>
                  <TableCell><Badge variant={i.status === 'resolved' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {i.status === 'open' && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: i.id, status: 'acknowledged' })}>Reconhecer</Button>
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: i.id, status: 'resolved' })}>Resolver</Button>
                      </div>
                    )}
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

// ───────── Audit ─────────
function AuditPanel() {
  const { data = [], isLoading } = useAuditLogs();
  return (
    <Card>
      <CardHeader><CardTitle>Logs de Auditoria</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">A carregar…</p> : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem logs de auditoria.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Acção</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: pt })}</TableCell>
                  <TableCell className="text-xs font-mono">{l.action}</TableCell>
                  <TableCell className="text-xs">{l.entity_type ?? '—'}</TableCell>
                  <TableCell className="text-xs">{l.actor_user_id ?? 'system'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ───────── Diagnostics ─────────
function DiagnosticsPanel() {
  const { data, isLoading, refetch, isFetching } = useKernelDiagnostics();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Verificações automáticas do Kernel.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <Stethoscope className="h-4 w-4 mr-1" /> Re-executar
        </Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">A correr diagnósticos…</p> : (
        <>
          <Card>
            <CardHeader><CardTitle>Recomendações</CardTitle></CardHeader>
            <CardContent>
              {(data?.recommendations ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Tudo limpo. Nenhuma recomendação.</p>
              ) : (
                <ul className="space-y-2">
                  {data.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />{r}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Eventos não registados</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 max-h-64 overflow-y-auto">
                {(data?.unregistered_events ?? []).map((n: string) => <div key={n} className="font-mono">{n}</div>)}
                {!data?.unregistered_events?.length && <p className="text-muted-foreground">Nenhum.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Eventos falhados</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 max-h-64 overflow-y-auto">
                {(data?.failed_events ?? []).map((e: any) => <div key={e.id} className="font-mono">{e.event_name}</div>)}
                {!data?.failed_events?.length && <p className="text-muted-foreground">Nenhum.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
