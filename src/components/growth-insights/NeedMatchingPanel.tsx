import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  ArrowRight,
  Calendar,
  Target,
  User,
  Package,
  Check,
  X
} from 'lucide-react';
import { NeedMatch } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface NeedMatchingPanelProps {
  matches: NeedMatch[];
  isLoading?: boolean;
  onAccept?: (match: NeedMatch) => void;
  onDismiss?: (matchId: string) => void;
  onViewCustomer?: (customerId: string) => void;
}

export function NeedMatchingPanel({ 
  matches, 
  isLoading,
  onAccept,
  onDismiss,
  onViewCustomer
}: NeedMatchingPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Matching de Necessidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 w-48 bg-muted rounded mb-2" />
                <div className="h-3 w-64 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const highConfidenceMatches = matches.filter(m => m.confidence >= 0.7);
  const otherMatches = matches.filter(m => m.confidence < 0.7 && m.confidence >= 0.5);

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Matching de Necessidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>A IA ainda está a aprender padrões.</p>
            <p className="text-sm">Quanto mais dados, melhores as sugestões.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const renderMatch = (match: NeedMatch, priority: 'high' | 'normal') => (
    <div 
      key={match.id}
      className={cn(
        "p-4 rounded-lg border transition-all hover:shadow-md",
        priority === 'high' 
          ? "border-purple-200 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-900/10"
          : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <User 
            className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary"
            onClick={() => onViewCustomer?.(match.customerId)}
          />
          <span 
            className="font-medium cursor-pointer hover:text-primary"
            onClick={() => onViewCustomer?.(match.customerId)}
          >
            {match.customerName}
          </span>
          {priority === 'high' && (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Sparkles className="h-3 w-3 mr-1" />
              Alta Confiança
            </Badge>
          )}
        </div>
        <span className={cn("text-sm font-medium", getConfidenceColor(match.confidence))}>
          {(match.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Product Flow */}
      <div className="flex items-center gap-2 mb-3">
        {match.currentProduct && (
          <>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-sm">
              <Package className="h-3.5 w-3.5" />
              {match.currentProduct}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
          <Target className="h-3.5 w-3.5" />
          {match.recommendedProduct}
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-muted-foreground mb-3">
        {match.reasoning}
      </p>

      {/* Ideal Window */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Calendar className="h-4 w-4" />
        <span>
          Janela ideal: {formatDate(match.idealWindow.start)} - {formatDate(match.idealWindow.end)}
        </span>
      </div>

      {/* Pattern Details */}
      {match.patternDetails && (
        <p className="text-xs text-muted-foreground italic mb-3">
          💡 {match.patternDetails}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={() => onAccept?.(match)}
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-1" />
          Criar Oportunidade
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onDismiss?.(match.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Matching de Necessidades
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          {matches.length} oportunidades identificadas
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* High Confidence Matches */}
        {highConfidenceMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Alta Probabilidade
            </h4>
            <div className="space-y-3">
              {highConfidenceMatches.slice(0, 5).map(match => renderMatch(match, 'high'))}
            </div>
          </div>
        )}

        {/* Other Matches */}
        {otherMatches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              Outras Oportunidades
            </h4>
            <div className="space-y-3">
              {otherMatches.slice(0, 5).map(match => renderMatch(match, 'normal'))}
            </div>
          </div>
        )}

        {/* AI Learning Note */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <Sparkles className="h-3 w-3 inline mr-1" />
          Clientes semelhantes costumam precisar destes produtos a seguir.
        </div>
      </CardContent>
    </Card>
  );
}
