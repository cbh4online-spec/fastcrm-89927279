import { useState } from 'react';
import { useNextBestActions, useActOnNBA, useDismissNBA, useNBAStats, useGenerateNBAs, type NextBestAction } from '@/hooks/useNextBestActions';
import { useExecuteAction } from '@/hooks/useActionExecution';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, TrendingUp, AlertTriangle, Clock, Check, X, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NextBestActionDetail } from './NextBestActionDetail';

const urgencyConfig = {
  critical: { label: 'Crítico', color: 'bg-destructive text-destructive-foreground' },
  high: { label: 'Alta', color: 'bg-amber-500 text-white' },
  medium: { label: 'Média', color: 'bg-primary/20 text-primary' },
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
};

const confidenceConfig = {
  high: { label: 'Alta', color: 'text-emerald-500' },
  medium: { label: 'Média', color: 'text-amber-500' },
  low: { label: 'Baixa', color: 'text-muted-foreground' },
};

const entityIcons: Record<string, string> = {
  lead: '🎯',
  contact: '👤',
  opportunity: '💰',
  company: '🏢',
};

export function NextBestActionsPanel() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<NextBestAction | null>(null);

  const filters: Record<string, string> = { status: 'open' };
  if (entityFilter !== 'all') filters.entity_type = entityFilter;
  if (urgencyFilter !== 'all') filters.urgency = urgencyFilter;

  const { data: actions, isLoading } = useNextBestActions(filters);
  const { data: stats } = useNBAStats();
  const actMutation = useActOnNBA();
  const dismissMutation = useDismissNBA();
  const generateMutation = useGenerateNBAs();
  const executeAction = useExecuteAction();

  const handleActWithExecution = async (action: NextBestAction) => {
    try {
      // Create action execution from NBA
      await executeAction.mutateAsync({
        action_type: action.action_type,
        title: action.title,
        description: action.description || undefined,
        source_type: 'next_best_action',
        source_id: action.id,
        entity_type: action.entity_type,
        entity_id: action.entity_id,
        payload: {
          rationale: action.rationale,
          priority_score: action.priority_score,
          impact_estimate: action.impact_estimate,
          ...(action.suggested_payload_json as Record<string, unknown> || {}),
        },
        correlation_id: `nba-${action.id}-${Date.now()}`,
      });
      // Mark NBA as acted
      actMutation.mutate(action);
    } catch {
      // toast handled by hook
    }
  };

  const topActions = (actions ?? []).slice(0, 10);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-3 text-center">
            <Zap className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-primary">{stats?.open ?? 0}</p>
            <p className="text-xs text-muted-foreground">Ações pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold text-emerald-500">€{(stats?.potential_revenue ?? 0).toLocaleString('pt-PT')}</p>
            <p className="text-xs text-muted-foreground">Receita potencial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Check className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-blue-500">{stats?.acted_today ?? 0}</p>
            <p className="text-xs text-muted-foreground">Executadas hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold text-destructive">{stats?.overdue ?? 0}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Generate */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="contact">Contactos</SelectItem>
            <SelectItem value="opportunity">Oportunidades</SelectItem>
            <SelectItem value="company">Empresas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Urgência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1 ml-auto"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Gerar recomendações
        </Button>
      </div>

      {/* Action List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : topActions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Sem ações recomendadas de momento.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              Analisar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {topActions.map((action, i) => {
              const urg = urgencyConfig[action.urgency as keyof typeof urgencyConfig] ?? urgencyConfig.medium;
              const conf = confidenceConfig[action.confidence as keyof typeof confidenceConfig] ?? confidenceConfig.medium;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="group hover:shadow-md hover:border-primary/30 transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{entityIcons[action.entity_type] ?? '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm truncate">{action.title}</h4>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', urg.color)}>
                              {urg.label}
                            </Badge>
                            <span className={cn('text-[10px] font-medium', conf.color)}>
                              Conf. {conf.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.rationale}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs font-medium text-primary">
                              Prioridade: {action.priority_score}
                            </span>
                            {Number(action.impact_estimate) > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">
                                €{Number(action.impact_estimate).toLocaleString('pt-PT')}
                              </span>
                            )}
                            {action.due_at && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {new Date(action.due_at).toLocaleDateString('pt-PT')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver detalhe"
                            onClick={() => setSelectedAction(action)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                            title="Executar ação"
                            onClick={() => handleActWithExecution(action)}
                            disabled={actMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Ignorar"
                            onClick={() => dismissMutation.mutate(action)}
                            disabled={dismissMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail drawer */}
      {selectedAction && (
        <NextBestActionDetail
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onAct={() => { actMutation.mutate(selectedAction); setSelectedAction(null); }}
          onDismiss={() => { dismissMutation.mutate(selectedAction); setSelectedAction(null); }}
        />
      )}
    </div>
  );
}
