import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users,
  UserCheck,
  Sparkles,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { GrowthInsightsSummary } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface GrowthInsightsSummaryCardProps {
  summary: GrowthInsightsSummary;
  isLoading?: boolean;
}

export function GrowthInsightsSummaryCard({ 
  summary, 
  isLoading 
}: GrowthInsightsSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const stats = [
    {
      label: 'Top Clientes',
      value: summary.topCustomersCount,
      subValue: formatCurrency(summary.topCustomersTotalRevenue),
      icon: Users,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      label: 'Top Vendedores',
      value: summary.topSellersCount,
      icon: UserCheck,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Oportunidades IA',
      value: summary.pendingNeedMatches,
      icon: Sparkles,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      label: 'Eventos Pendentes',
      value: summary.upcomingLifecycleEvents,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'Risco Médio Churn',
      value: `${(summary.averageChurnRisk * 100).toFixed(0)}%`,
      icon: AlertTriangle,
      color: summary.averageChurnRisk > 0.3 ? 'text-red-500' : 'text-green-500',
      bgColor: summary.averageChurnRisk > 0.3 
        ? 'bg-red-100 dark:bg-red-900/30' 
        : 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Insights Gerados',
      value: summary.insightsGenerated,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((_, i) => (
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

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
