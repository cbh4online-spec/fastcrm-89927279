import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  FileText,
  CheckCircle,
  MessageCircle,
  Brain,
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { KnowledgeMetrics } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';

interface KnowledgeMetricsCardProps {
  metrics: KnowledgeMetrics | null;
  isLoading?: boolean;
}

export function KnowledgeMetricsCard({ 
  metrics, 
  isLoading 
}: KnowledgeMetricsCardProps) {
  const stats = metrics ? [
    {
      label: 'Bases',
      value: metrics.totalBases,
      icon: BookOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Entradas',
      value: metrics.totalEntries,
      subValue: `${metrics.validatedEntries} validadas`,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'Consultas IA',
      value: metrics.totalQueries,
      subValue: `${metrics.aiResolvedQueries} resolvidas`,
      icon: MessageCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      label: 'Tempo Médio',
      value: metrics.avgResponseTimeMs > 0 ? `${(metrics.avgResponseTimeMs / 1000).toFixed(1)}s` : '-',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      label: 'Conversões',
      value: metrics.conversionsAssisted,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Reuniões',
      value: metrics.meetingsBooked,
      icon: Calendar,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
    }
  ] : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-lg bg-muted mb-2" />
              <div className="h-6 w-12 bg-muted rounded mb-1" />
              <div className="h-4 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Sem métricas disponíveis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", stat.bgColor)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground mt-1">{stat.subValue}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
