import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, RefreshCw, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle, Clock, Settings } from 'lucide-react';
import {
  useWorkspaceMemories,
  useMemoryStats,
  useMemorySettings,
  useTriggerLearningCycle,
  useLearningCycles,
} from '@/hooks/useWorkspaceMemory';
import { WorkspaceLearningBrief } from '@/components/workspace-ops/WorkspaceLearningBrief';

const MEMORY_TYPE_LABELS: Record<string, string> = {
  success_pattern: 'Sucesso',
  failure_pattern: 'Falha',
  execution_lesson: 'Execução',
  routing_lesson: 'Routing',
  conversion_pattern: 'Conversão',
  recovery_pattern: 'Recuperação',
  context_gap_pattern: 'Gap Contexto',
  agent_performance_pattern: 'Performance Agente',
};

const VALIDITY_COLORS: Record<string, string> = {
  valid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  aging: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  stale: 'bg-muted text-muted-foreground',
  contradicted: 'bg-destructive/10 text-destructive border-destructive/30',
  archived: 'bg-muted text-muted-foreground',
};

export default function MemoryCenterPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [validityFilter, setValidityFilter] = useState<string>('all');

  const filters = {
    ...(typeFilter !== 'all' && { memory_type: typeFilter }),
    ...(validityFilter !== 'all' && { validity_status: validityFilter }),
  };

  const { data: memories = [], isLoading } = useWorkspaceMemories(Object.keys(filters).length > 0 ? filters : undefined);
  const { data: stats } = useMemoryStats();
  const { data: settings, upsert: upsertSettings } = useMemorySettings();
  const { data: cycles = [] } = useLearningCycles();
  const triggerCycle = useTriggerLearningCycle();

  const successMemories = memories.filter(m => m.memory_type === 'success_pattern').slice(0, 5);
  const failureMemories = memories.filter(m => m.memory_type === 'failure_pattern').slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Memory Center | FastCRM</title>
      </Helmet>

      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Memory Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Memória operacional e padrões aprendidos pelo workspace
            </p>
          </div>
          <Button onClick={() => triggerCycle.mutate()} disabled={triggerCycle.isPending} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerCycle.isPending ? 'animate-spin' : ''}`} />
            Iniciar Ciclo
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPICard icon={Brain} label="Memórias Ativas" value={stats?.total ?? 0} />
          <KPICard icon={Shield} label="Confiança Média" value={`${((stats?.avgConfidence ?? 0) * 100).toFixed(0)}%`} />
          <KPICard icon={TrendingUp} label="Sucesso" value={stats?.successCount ?? 0} color="text-emerald-500" />
          <KPICard icon={TrendingDown} label="Falha" value={stats?.failureCount ?? 0} color="text-destructive" />
          <KPICard icon={Zap} label="Ciclos" value={cycles.filter(c => c.status === 'completed').length} />
        </div>

        <Tabs defaultValue="memories" className="space-y-4">
          <TabsList>
            <TabsTrigger value="memories">Memórias</TabsTrigger>
            <TabsTrigger value="patterns">Padrões</TabsTrigger>
            <TabsTrigger value="brief">Learning Brief</TabsTrigger>
            <TabsTrigger value="cycles">Ciclos</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              Definições
            </TabsTrigger>
          </TabsList>

          {/* Memories Tab */}
          <TabsContent value="memories" className="space-y-4">
            <div className="flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(MEMORY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={validityFilter} onValueChange={setValidityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Validade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="valid">Válida</SelectItem>
                  <SelectItem value="aging">A envelhecer</SelectItem>
                  <SelectItem value="stale">Obsoleta</SelectItem>
                  <SelectItem value="contradicted">Contradita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">A carregar...</p>
            ) : memories.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Sem memórias. Inicie um ciclo de aprendizagem para extrair padrões.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {memories.map((m) => (
                  <MemoryRow key={m.id} memory={m} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Padrões de Sucesso
              </CardTitle></CardHeader>
              <CardContent>
                {successMemories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem padrões de sucesso registados</p>
                ) : (
                  <ul className="space-y-2">
                    {successMemories.map(m => (
                      <li key={m.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{(Number(m.confidence) * 100).toFixed(0)}%</Badge>
                          <span className="font-medium">{m.title}</span>
                        </div>
                        {m.summary && <p className="text-xs text-muted-foreground ml-12 mt-0.5">{m.summary}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" /> Padrões de Falha
              </CardTitle></CardHeader>
              <CardContent>
                {failureMemories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem padrões de falha registados</p>
                ) : (
                  <ul className="space-y-2">
                    {failureMemories.map(m => (
                      <li key={m.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{(Number(m.confidence) * 100).toFixed(0)}%</Badge>
                          <span className="font-medium">{m.title}</span>
                        </div>
                        {m.summary && <p className="text-xs text-muted-foreground ml-12 mt-0.5">{m.summary}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brief Tab */}
          <TabsContent value="brief">
            <WorkspaceLearningBrief />
          </TabsContent>

          {/* Cycles Tab */}
          <TabsContent value="cycles">
            {cycles.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                Nenhum ciclo de aprendizagem executado.
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {cycles.map(c => (
                  <Card key={c.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={c.status === 'completed' ? 'default' : c.status === 'running' ? 'secondary' : 'outline'}>
                          {c.status}
                        </Badge>
                        <span className="text-sm">{c.cycle_type}</span>
                        {c.summary && <span className="text-xs text-muted-foreground">{c.summary}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>+{c.memories_created || 0} criadas</span>
                        <span>↑{c.memories_updated || 0} reforçadas</span>
                        <span>{new Date(c.created_at).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader><CardTitle className="text-base">Definições de Memória</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Memória ativa</Label>
                  <Switch
                    checked={settings?.is_enabled ?? false}
                    onCheckedChange={(v) => upsertSettings.mutate({ is_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Extração automática</Label>
                  <Switch
                    checked={settings?.auto_extract_enabled ?? false}
                    onCheckedChange={(v) => upsertSettings.mutate({ auto_extract_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Dias de decay</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={settings?.memory_decay_days ?? 90}
                    onChange={(e) => upsertSettings.mutate({ memory_decay_days: parseInt(e.target.value) || 90 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Confiança mínima</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    className="w-24"
                    value={settings?.min_confidence_threshold ?? 0.3}
                    onChange={(e) => upsertSettings.mutate({ min_confidence_threshold: parseFloat(e.target.value) || 0.3 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Máx. memórias por query</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={settings?.max_memories_per_query ?? 5}
                    onChange={(e) => upsertSettings.mutate({ max_memories_per_query: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ── Sub-components ──

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color || 'text-primary'}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MemoryRow({ memory }: { memory: any }) {
  const conf = Number(memory.confidence) * 100;
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] shrink-0">
                {MEMORY_TYPE_LABELS[memory.memory_type] || memory.memory_type}
              </Badge>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${VALIDITY_COLORS[memory.validity_status] || ''}`}>
                {memory.validity_status}
              </Badge>
              <span className="text-sm font-medium truncate">{memory.title}</span>
            </div>
            {memory.summary && <p className="text-xs text-muted-foreground line-clamp-2">{memory.summary}</p>}
          </div>
          <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
            <div className="w-20">
              <div className="flex justify-between mb-0.5">
                <span>Confiança</span>
                <span>{conf.toFixed(0)}%</span>
              </div>
              <Progress value={conf} className="h-1.5" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{memory.reuse_count || 0}</p>
              <p>usos</p>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(memory.updated_at).toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
