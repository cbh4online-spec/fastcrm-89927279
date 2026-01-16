import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw,
  Repeat,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  CheckSquare,
  FileText,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { useAIJourneySuggestions } from '@/hooks/useAIJourneySuggestions';
import { 
  AIJourneySuggestion, 
  SUGGESTION_TYPE_CONFIG, 
  PRIORITY_CONFIG,
  SuggestionType 
} from '@/types/aiJourneySuggestion';
import { toast } from 'sonner';

interface AIJourneySuggestionsPanelProps {
  entityType: 'contact' | 'company';
  entityId: string;
  entityName?: string;
}

const TYPE_ICONS: Record<SuggestionType, React.ElementType> = {
  schedule_session: Calendar,
  consumption_alert: AlertTriangle,
  upsell_opportunity: TrendingUp,
  churn_risk: AlertCircle,
  reactivation: RefreshCw,
  renewal: Repeat
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  schedule: Calendar,
  call: Phone,
  email: Mail,
  task: CheckSquare,
  proposal: FileText
};

export function AIJourneySuggestionsPanel({ 
  entityType, 
  entityId,
  entityName 
}: AIJourneySuggestionsPanelProps) {
  const { suggestions, isLoading } = useAIJourneySuggestions({ entityType, entityId });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAction = (suggestion: AIJourneySuggestion) => {
    // For now, just show a toast - in the future this could create tasks, open modals, etc.
    toast.success(`Ação sugerida: ${suggestion.suggestedAction}`, {
      description: suggestion.description
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Sugestões IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Sugestões IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sem sugestões no momento
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              As sugestões aparecerão com base na atividade do cliente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Sugestões IA
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length} {suggestions.length === 1 ? 'sugestão' : 'sugestões'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.type];
          const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
          const TypeIcon = TYPE_ICONS[suggestion.type];
          const ActionIcon = suggestion.actionType ? ACTION_ICONS[suggestion.actionType] : Lightbulb;
          const isExpanded = expandedId === suggestion.id;

          return (
            <Collapsible 
              key={suggestion.id}
              open={isExpanded}
              onOpenChange={(open) => setExpandedId(open ? suggestion.id : null)}
            >
              <div className={`rounded-lg border ${typeConfig.bgColor} p-3`}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-1.5 bg-background ${typeConfig.color}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{suggestion.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${priorityConfig.bgColor} ${priorityConfig.color} border-0`}
                          >
                            {priorityConfig.label}
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                    {/* Reasoning */}
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Porquê:</span>
                        <p className="text-sm">{suggestion.reasoning}</p>
                      </div>
                    </div>

                    {/* Metadata if available */}
                    {suggestion.metadata && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {suggestion.metadata.percentageConsumed !== undefined && (
                          <Badge variant="outline">
                            {Math.round(suggestion.metadata.percentageConsumed)}% consumido
                          </Badge>
                        )}
                        {suggestion.metadata.daysSinceLastInteraction !== undefined && (
                          <Badge variant="outline">
                            {suggestion.metadata.daysSinceLastInteraction} dias sem interação
                          </Badge>
                        )}
                        {suggestion.metadata.expectedFrequencyDays !== undefined && (
                          <Badge variant="outline">
                            Frequência esperada: {Math.round(suggestion.metadata.expectedFrequencyDays)} dias
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Suggested Action */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ActionIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{suggestion.suggestedAction}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleAction(suggestion)}
                      >
                        Executar
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
