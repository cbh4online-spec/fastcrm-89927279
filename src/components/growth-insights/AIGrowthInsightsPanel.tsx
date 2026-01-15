import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Target,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AIGrowthAnalysis } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface AIGrowthInsightsPanelProps {
  analysis: AIGrowthAnalysis | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function AIGrowthInsightsPanel({ 
  analysis, 
  isLoading,
  onRefresh
}: AIGrowthInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            Análise IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">A analisar dados de crescimento...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise IA
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <Sparkles className="h-4 w-4 mr-1" />
            Gerar Análise
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Clique para gerar insights com IA.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidenceLabel = analysis.confidenceLevel >= 0.8 
    ? 'Alta' 
    : analysis.confidenceLevel >= 0.6 
      ? 'Média' 
      : 'Baixa';

  const confidenceColor = analysis.confidenceLevel >= 0.8 
    ? 'text-green-600' 
    : analysis.confidenceLevel >= 0.6 
      ? 'text-amber-600' 
      : 'text-muted-foreground';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Análise IA
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={confidenceColor}>
            Confiança: {confidenceLabel}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights
            </h4>
            <ul className="space-y-2">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Patterns */}
        {analysis.patterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Padrões Identificados
            </h4>
            <ul className="space-y-2">
              {analysis.patterns.map((pattern, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Recomendações
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Best Actions */}
        {analysis.nextBestActions.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Próximas Ações Sugeridas
            </h4>
            <div className="space-y-2">
              {analysis.nextBestActions.map((action, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-2 text-sm bg-background/50 rounded px-3 py-2"
                >
                  <span className="font-medium text-primary">{i + 1}.</span>
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Análise gerada em {new Date(analysis.analysisTimestamp).toLocaleString('pt-PT')}
        </div>
      </CardContent>
    </Card>
  );
}
