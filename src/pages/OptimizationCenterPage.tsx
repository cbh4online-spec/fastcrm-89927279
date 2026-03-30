import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Zap, TrendingUp, AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  ArrowUpRight, Sparkles, Clock, Target, History, Settings,
} from 'lucide-react';
import {
  useOptimizationRecommendations,
  useOptimizationStats,
  useOptimizationActionLogs,
  useApplyRecommendation,
  useDismissRecommendation,
  useRevertAction,
  type OptimizationRecommendation,
  type OptimizationActionLog,
} from '@/hooks/useOptimizationEngine';
import { OptimizationSettingsPanel } from '@/components/optimization/OptimizationSettingsPanel';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  promote_variant: 'Promover Variante',
  pause_variant: 'Pausar Variante',
  switch_default_variant: 'Trocar Default',
  highlight_top_revenue_template: 'Top Receita',
  disable_low_performing_step: 'Desativar Step',
  increase_delay: 'Aumentar Delay',
  decrease_delay: 'Reduzir Delay',
  switch_channel: 'Mudar Canal',
  suggest_predictive_copy_refresh: 'Refrescar Copy',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  promote_variant: TrendingUp,
  pause_variant: XCircle,
  highlight_top_revenue_template: Sparkles,
  pause_variant_2: AlertTriangle,
};

export default function OptimizationCenterPage() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  const { data: recs, isLoading: recsLoading } = useOptimizationRecommendations({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    recommendation_type: typeFilter !== 'all' ? typeFilter : undefined,
    confidence: confidenceFilter !== 'all' ? confidenceFilter : undefined,
  });
  const { data: stats, isLoading: statsLoading } = useOptimizationStats();
  const { data: logs } = useOptimizationActionLogs();
  const applyRec = useApplyRecommendation();
  const dismissRec = useDismissRecommendation();
  const revertAction = useRevertAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Otimização"
        description="Recomendações automáticas para melhorar a performance de templates e sequências"
        icon={<Zap className="h-6 w-6 text-primary" />}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Recomendações Abertas"
          value={stats?.open}
          icon={<Target className="h-5 w-5 text-primary" />}
          loading={statsLoading}
        />
        <KPICard
          title="Uplift Estimado"
          value={stats?.estimatedUplift ? `+${stats.estimatedUplift.toFixed(1)}pp` : '0'}
          icon={<ArrowUpRight className="h-5 w-5 text-green-500" />}
          loading={statsLoading}
        />
        <KPICard
          title="Ações Aplicadas"
          value={stats?.applied}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />}
          loading={statsLoading}
        />
        <KPICard
          title="Auto-Aplicadas"
          value={stats?.autoApplied}
          icon={<Sparkles className="h-5 w-5 text-amber-500" />}
          loading={statsLoading}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Recomendações
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Definições
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="applied">Aplicadas</SelectItem>
                <SelectItem value="dismissed">Ignoradas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Confiança" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : !recs?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma recomendação encontrada</p>
                <p className="text-xs mt-1">O motor de otimização analisará os dados automaticamente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recs.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onApply={() => applyRec.mutate(rec)}
                  onDismiss={() => dismissRec.mutate(rec.id)}
                  isApplying={applyRec.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {!logs?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma ação registada</p>
              </CardContent>
            </Card>
          ) : (
            logs.map(log => (
              <ActionLogCard key={log.id} log={log} onRevert={() => revertAction.mutate(log)} isReverting={revertAction.isPending} />
            ))
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-lg">
            <OptimizationSettingsPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, icon, loading }: { title: string; value: any; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{value ?? 0}</p>}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ rec, onApply, onDismiss, isApplying }: {
  rec: OptimizationRecommendation;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
}) {
  const Icon = TYPE_ICONS[rec.recommendation_type] || Zap;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium">{rec.title}</h4>
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}
              </Badge>
              <Badge className={`text-[10px] ${CONFIDENCE_COLORS[rec.confidence]}`}>
                {rec.confidence === 'high' ? 'Alta' : rec.confidence === 'medium' ? 'Média' : 'Baixa'}
              </Badge>
              {rec.auto_applied && (
                <Badge variant="secondary" className="text-[10px]">Auto</Badge>
              )}
            </div>
            {rec.rationale && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.rationale}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(rec.created_at), "d MMM yyyy", { locale: pt })}
              </span>
              {rec.impact_estimate > 0 && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +{rec.impact_estimate.toFixed(1)} impacto estimado
                </span>
              )}
            </div>
          </div>
          {rec.status === 'open' && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={onApply} disabled={isApplying}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Aplicar
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLogCard({ log, onRevert, isReverting }: {
  log: OptimizationActionLog;
  onRevert: () => void;
  isReverting: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{TYPE_LABELS[log.action_type] || log.action_type}</h4>
              <Badge variant="outline" className="text-[10px]">{log.applied_mode}</Badge>
              {log.reverted_at && <Badge variant="destructive" className="text-[10px]">Revertido</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
              {' · '}Por: {log.applied_by === 'system' ? 'Sistema' : 'Utilizador'}
            </p>
          </div>
          {!log.reverted_at && (
            <Button size="sm" variant="outline" onClick={onRevert} disabled={isReverting}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reverter
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
