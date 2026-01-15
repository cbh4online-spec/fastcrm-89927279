import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  History,
  Settings2,
  ChevronRight,
  Loader2,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIInsights, useInsightsHistory } from '@/hooks/useAIInsights';
import { InsightsPanel } from './InsightsPanel';
import { ScoreTemperatureDisplay } from './ScoreTemperatureDisplay';
import { InsightsSettingsDialog } from './InsightsSettingsDialog';
import {
  InsightCategory,
  INSIGHT_CATEGORY_CONFIG,
  AIInsight,
} from '@/types/aiInsights';

interface InsightsFullSectionProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
}

const CATEGORY_ICONS: Record<InsightCategory, React.ElementType> = {
  priority: AlertCircle,
  risk: AlertTriangle,
  opportunity: TrendingUp,
  efficiency: Zap,
};

export function InsightsFullSection({ entityType, entityId }: InsightsFullSectionProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<InsightCategory | 'all'>('all');

  const {
    insights,
    score,
    summary,
    predictedActions,
    analysisTimestamp,
    isLoading,
    isRefreshing,
    refresh,
    dismissInsight,
    submitFeedback,
    settings,
    updateSettings,
  } = useAIInsights({ entityId, entityType });

  const { history } = useInsightsHistory(entityId, entityType);

  // Filter insights by category
  const filteredInsights = activeCategory === 'all'
    ? insights
    : insights.filter((i) => i.category === activeCategory);

  // Count by category
  const categoryCounts = insights.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {} as Record<InsightCategory, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Insights IA</h2>
            <p className="text-sm text-muted-foreground">
              Análise inteligente para decisões mais rápidas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Score & Summary */}
        <div className="space-y-4">
          <ScoreTemperatureDisplay
            score={score}
            isLoading={isLoading}
            showFactors={true}
          />

          {/* Summary Card */}
          {summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Predicted Actions */}
          {predictedActions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Próximos passos previstos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {predictedActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Last Analysis */}
          {analysisTimestamp && (
            <p className="text-xs text-muted-foreground text-center">
              Última análise:{' '}
              {new Date(analysisTimestamp).toLocaleString('pt-PT', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>

        {/* Right Column - Insights with Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Insights Ativos
                  <Badge variant="secondary">{insights.length}</Badge>
                </CardTitle>
              </div>
              <CardDescription>
                Ações recomendadas baseadas na análise de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Category Filter Tabs */}
              <div className="border-b px-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  <Button
                    variant={activeCategory === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                    className="text-xs"
                  >
                    Todos ({insights.length})
                  </Button>
                  {(['priority', 'risk', 'opportunity', 'efficiency'] as InsightCategory[]).map((category) => {
                    const config = INSIGHT_CATEGORY_CONFIG[category];
                    const CategoryIcon = CATEGORY_ICONS[category];
                    const count = categoryCounts[category] || 0;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={category}
                        variant={activeCategory === category ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveCategory(category)}
                        className={cn("text-xs gap-1", activeCategory === category && config.color)}
                      >
                        <CategoryIcon className="h-3 w-3" />
                        {config.label} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Insights List */}
              <ScrollArea className="max-h-[500px]">
                <InsightsPanel
                  entityType={entityType}
                  entityId={entityId}
                  insights={filteredInsights}
                  isLoading={isLoading}
                  onDismiss={dismissInsight}
                  onFeedback={submitFeedback}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <InsightsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </div>
  );
}
