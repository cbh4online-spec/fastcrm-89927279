import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  CheckCircle2, 
  FileText,
  Brain,
  Clock,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { KnowledgeMetrics } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface KnowledgeMetricsPanelProps {
  metrics: KnowledgeMetrics | null;
  isLoading?: boolean;
}

export function KnowledgeMetricsPanel({ metrics, isLoading }: KnowledgeMetricsPanelProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const aiSuccessRate = metrics.totalQueries > 0 
    ? Math.round((metrics.aiResolvedQueries / metrics.totalQueries) * 100) 
    : 0;

  const validationRate = metrics.totalEntries > 0 
    ? Math.round((metrics.validatedEntries / metrics.totalEntries) * 100) 
    : 0;

  const metricsData = [
    {
      label: 'Bases de Conhecimento',
      value: metrics.totalBases,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'Total de Entradas',
      value: metrics.totalEntries,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      label: 'Entradas Validadas',
      value: metrics.validatedEntries,
      subValue: `${validationRate}%`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Rascunhos Pendentes',
      value: metrics.draftEntries,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      highlight: metrics.draftEntries > 0
    },
    {
      label: 'Consultas à IA',
      value: metrics.totalQueries,
      icon: Brain,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
      label: 'Respondidas com Sucesso',
      value: metrics.aiResolvedQueries,
      subValue: `${aiSuccessRate}%`,
      icon: MessageSquare,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30'
    },
    {
      label: 'Sem Resposta (gaps)',
      value: metrics.fallbackQueries || metrics.missingContentQueries || 0,
      icon: HelpCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      highlight: (metrics.fallbackQueries || 0) > 0
    },
    {
      label: 'Tempo Médio Resposta',
      value: `${Math.round((metrics.avgResponseTimeMs || 0) / 1000)}s`,
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricsData.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={index} 
              className={cn(
                "transition-all",
                metric.highlight && "border-amber-300 dark:border-amber-700"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-2xl font-bold", metric.color)}>
                        {metric.value}
                      </span>
                      {metric.subValue && (
                        <span className="text-sm text-muted-foreground">
                          ({metric.subValue})
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                    <Icon className={cn("h-4 w-4", metric.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Taxa de Validação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={validationRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metrics.validatedEntries} validados</span>
                <span>{metrics.totalEntries - metrics.validatedEntries} pendentes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-600" />
              Taxa de Sucesso da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={aiSuccessRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{metrics.aiResolvedQueries} resolvidas</span>
                <span>{metrics.totalQueries - metrics.aiResolvedQueries} fallback/humano</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Used Entries */}
      {metrics.topUsedEntries && metrics.topUsedEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Conteúdos Mais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topUsedEntries.slice(0, 5).map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm truncate max-w-[250px]">{entry.title}</span>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {entry.usageCount} usos
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Governance Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Governança de Conhecimento</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A IA responde <strong>apenas</strong> com base no conhecimento validado. 
                Quando não encontra resposta, assume a incerteza e pode pedir ajuda humana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
