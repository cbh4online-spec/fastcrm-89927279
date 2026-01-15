import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  CheckCircle2, 
  X,
  HelpCircle,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { FAQSuggestion } from '@/types/knowledge-base';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface FAQSuggestionsPanelProps {
  suggestions: FAQSuggestion[];
  isLoading?: boolean;
  onApprove?: (suggestion: FAQSuggestion) => void;
  onReject?: (suggestionId: string) => void;
  onRefresh?: () => void;
}

export function FAQSuggestionsPanel({
  suggestions,
  isLoading,
  onApprove,
  onReject,
  onRefresh
}: FAQSuggestionsPanelProps) {
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Sugestões da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-5 w-full bg-muted rounded mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Sugestões da IA
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingSuggestions.length} pendentes
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Baseado em perguntas frequentes e padrões detectados.
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <span className="text-amber-700 dark:text-amber-400">
            A IA nunca publica automaticamente. Todas as sugestões requerem validação humana.
          </span>
        </div>

        {/* Empty State */}
        {pendingSuggestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sem sugestões pendentes</p>
            <p className="text-sm mt-1">
              A IA vai sugerir FAQs com base nas perguntas dos clientes.
            </p>
          </div>
        )}

        {/* Suggestions List */}
        <div className="space-y-3">
          {pendingSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-primary">
                    {suggestion.question}
                  </h4>
                  {suggestion.suggestedAnswer && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {suggestion.suggestedAnswer}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {suggestion.frequency}x perguntado
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(suggestion.createdAt), "d MMM", { locale: pt })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(suggestion.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => onApprove?.(suggestion)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aprovar e Criar FAQ
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Show Examples of What AI Can Suggest */}
        {pendingSuggestions.length === 0 && (
          <div className="pt-4 border-t">
            <h5 className="text-sm font-medium mb-2">A IA pode sugerir:</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                "Criar FAQ para esta pergunta recorrente"
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                "Atualizar este artigo desatualizado"
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                "Este conteúdo precisa de revisão"
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
