import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Play, Trash2, Pencil, Zap, Clock, AlertTriangle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import {
  useSmartWorkflows, useAutomationTemplates, useAutomationLogs, useAutomationApprovals,
  useToggleAutomation, useDeleteAutomation, useApproveAutomationAction, useRunScheduledChecks,
  useUpsertAutomation,
  type AutomationRule, type AutomationTemplate,
} from '@/hooks/useSmartWorkflows';
import { SmartWorkflowWizard } from '@/components/automations/SmartWorkflowWizard';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function SmartWorkflowsPage() {
  const { data: rules = [], isLoading } = useSmartWorkflows();
  const { data: templates = [] } = useAutomationTemplates();
  const { data: logs = [] } = useAutomationLogs();
  const { data: approvals = [] } = useAutomationApprovals();
  const toggle = useToggleAutomation();
  const del = useDeleteAutomation();
  const approve = useApproveAutomationAction();
  const runChecks = useRunScheduledChecks();
  const upsert = useUpsertAutomation();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AutomationRule> | null>(null);

  const handleNew = () => { setEditing(null); setWizardOpen(true); };
  const handleEdit = (r: AutomationRule) => { setEditing(r); setWizardOpen(true); };
  const handleUseTemplate = async (t: AutomationTemplate) => {
    await upsert.mutateAsync({
      name: t.name,
      description: t.description ?? '',
      category: t.category ?? 'custom',
      trigger_event: t.trigger_event,
      trigger_type: t.trigger_event,
      conditions: t.conditions,
      actions: t.actions,
      conditions_logic: 'all',
      is_active: false,
    });
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Automações Inteligentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie regras operacionais para transformar eventos em ações automáticas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
            <Play className="w-4 h-4 mr-2" />Executar verificações
          </Button>
          <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" />Nova automação</Button>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Regras ({rules.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
          <TabsTrigger value="approvals">
            Aprovações
            {pendingApprovals.length > 0 && <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">A carregar...</p>}
          {!isLoading && rules.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Ainda não existem automações. Comece com um template seguro ou crie uma regra personalizada.
            </CardContent></Card>
          )}
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{r.name}</h3>
                    {r.category && <Badge variant="outline">{r.category}</Badge>}
                    {r.require_human_approval && (
                      <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />Aprovação
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{r.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{r.trigger_event ?? r.trigger_type}</span>
                    <span>{r.actions?.length ?? 0} ações</span>
                    <span>{r.conditions?.length ?? 0} condições</span>
                    <span>{r.run_count} execuções</span>
                    {r.last_run_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Última: {formatDistanceToNow(new Date(r.last_run_at), { locale: pt, addSuffix: true })}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggle.mutate({ id: r.id, is_active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm('Apagar esta automação?')) del.mutate(r.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:border-primary/50 transition">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />{t.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.category && <Badge variant="secondary">{t.category}</Badge>}
                  <Badge variant="outline">{t.actions.length} ações</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleUseTemplate(t)}>
                  Usar template
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Ainda não existem execuções registadas.</p>}
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {l.status === 'success' || l.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                   l.status === 'failed' ? <XCircle className="w-5 h-5 text-destructive" /> :
                   l.status === 'skipped' ? <Clock className="w-5 h-5 text-muted-foreground" /> :
                   <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{l.automation_name ?? l.trigger_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.trigger_type} • {formatDistanceToNow(new Date(l.executed_at), { locale: pt, addSuffix: true })}
                      {l.duration_ms && ` • ${l.duration_ms}ms`}
                      {l.dry_run && ' • dry-run'}
                    </p>
                  </div>
                </div>
                <Badge variant={l.status === 'failed' ? 'destructive' : 'outline'}>{l.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-2">
          {pendingApprovals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Não existem ações pendentes de aprovação.</p>}
          {pendingApprovals.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30">{a.action_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { locale: pt, addSuffix: true })}
                    </span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(a.proposed_payload, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => approve.mutate({ id: a.id, action: 'approve' })}>Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: a.id, action: 'reject' })}>Rejeitar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <SmartWorkflowWizard open={wizardOpen} onOpenChange={setWizardOpen} rule={editing} />
    </div>
  );
}
