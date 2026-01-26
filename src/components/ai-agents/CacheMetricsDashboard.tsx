import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Zap, 
  DollarSign, 
  Clock, 
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useCacheMetrics } from '@/hooks/useCacheMetrics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AGENT_COLORS: Record<string, string> = {
  lead: 'hsl(var(--chart-1))',
  opportunity: 'hsl(var(--chart-2))',
  client: 'hsl(var(--chart-3))',
  contact: 'hsl(var(--chart-4))',
};

const AGENT_LABELS: Record<string, string> = {
  lead: 'Lead Agent',
  opportunity: 'Opportunity Agent',
  client: 'Client Agent',
  contact: 'Contact Agent',
};

export function CacheMetricsDashboard() {
  const { stats, statsByAgent, metricsOverTime, isLoading } = useCacheMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-8 rounded-lg mb-3" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hitRatio = stats && stats.totalHits > 0 
    ? Math.round((stats.totalHits / (stats.totalHits + stats.totalEntries)) * 100)
    : 0;

  const chartData = metricsOverTime?.map(m => ({
    date: format(new Date(m.periodStart), 'dd/MM', { locale: pt }),
    hits: m.cacheHits,
    misses: m.cacheMisses,
    hitRatio: Math.round(m.hitRatio * 100),
    tokensSaved: m.tokensSaved,
  })) || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats?.totalEntries || 0}</div>
            <p className="text-sm text-muted-foreground">Entradas em Cache</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {stats?.validEntries || 0} válidas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats?.totalHits || 0}</div>
            <p className="text-sm text-muted-foreground">Cache Hits Total</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Hit Ratio</span>
                <span className="font-medium">{hitRatio}%</span>
              </div>
              <Progress value={hitRatio} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">
              {((stats?.totalTokensSaved || 0) / 1000).toFixed(1)}K
            </div>
            <p className="text-sm text-muted-foreground">Tokens Economizados</p>
            <p className="text-xs text-muted-foreground mt-2">
              Menos chamadas à API de IA
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">
              €{(stats?.estimatedCostSaved || 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Custo Estimado Poupado</p>
            <p className="text-xs text-muted-foreground mt-2">
              Baseado em €0.002/1K tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hit Ratio Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Evolução do Cache (7 dias)
            </CardTitle>
            <CardDescription>Hits vs Misses ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="hitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="missGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hits" 
                    stroke="hsl(var(--chart-2))" 
                    fill="url(#hitGradient)"
                    name="Hits"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="misses" 
                    stroke="hsl(var(--chart-5))" 
                    fill="url(#missGradient)"
                    name="Misses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Sem dados de métricas ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats by Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache por Agente
            </CardTitle>
            <CardDescription>Distribuição de entradas e hit ratio</CardDescription>
          </CardHeader>
          <CardContent>
            {statsByAgent && statsByAgent.length > 0 ? (
              <div className="space-y-4">
                {statsByAgent.map((agent) => (
                  <div key={agent.agentType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: AGENT_COLORS[agent.agentType] || 'hsl(var(--muted))' }}
                        />
                        <span className="text-sm font-medium">
                          {AGENT_LABELS[agent.agentType] || agent.agentType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{agent.entries} entradas</span>
                        <Badge 
                          variant={agent.hitRatio > 0.5 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {Math.round(agent.hitRatio * 100)}% hit
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={agent.hitRatio * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{agent.hits} hits</span>
                      <span>{(agent.tokensSaved / 1000).toFixed(1)}K tokens economizados</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p>Nenhum agente com cache ativo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cache Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Estado do Cache
          </CardTitle>
          <CardDescription>Visão geral da saúde do sistema de cache</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.validEntries || 0}</div>
                <p className="text-sm text-muted-foreground">Entradas Válidas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.expiredEntries || 0}</div>
                <p className="text-sm text-muted-foreground">Expiradas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.invalidatedEntries || 0}</div>
                <p className="text-sm text-muted-foreground">Invalidadas</p>
              </div>
            </div>
          </div>

          {stats?.avgHitLatencyMs && stats.avgHitLatencyMs > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latência Média Original (sem cache)</span>
                <span className="font-medium">{Math.round(stats.avgHitLatencyMs)}ms</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cache hits retornam instantaneamente (~1-5ms)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
