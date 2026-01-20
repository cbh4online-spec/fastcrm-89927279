import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Target,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useGenerateEntitySuggestions, 
  useEntityAutomationStats,
  EntityAutomationContext 
} from '@/hooks/useEntityAutomations';
import { 
  useAutomationSuggestions, 
  useAcceptAutomationSuggestion,
  useDismissAutomationSuggestion 
} from '@/hooks/useAutomationSuggestions';

interface AIEntityAutomationSuggestionsProps {
  entityType: 'lead' | 'contact' | 'company' | 'opportunity';
  entityId: string;
  entityName: string;
  context?: Partial<EntityAutomationContext>;
}

export function AIEntityAutomationSuggestions({
  entityType,
  entityId,
  entityName,
  context
}: AIEntityAutomationSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  
  const { data: stats } = useEntityAutomationStats(entityType, entityId);
  const { data: allSuggestions = [] } = useAutomationSuggestions();
  const generateSuggestions = useGenerateEntitySuggestions();
  const acceptSuggestion = useAcceptAutomationSuggestion();
  const dismissSuggestion = useDismissAutomationSuggestion();

  // Filter suggestions relevant to this entity type
  const suggestions = allSuggestions.filter(s => 
    s.trigger_type?.toLowerCase()?.includes(entityType)
  );

  const handleGenerate = async () => {
    await generateSuggestions.mutateAsync({
      entityType,
      entityId,
      context: context as EntityAutomationContext
    });
  };

  const handleAccept = async (suggestionId: string) => {
    await acceptSuggestion.mutateAsync(suggestionId);
  };

  const handleDismiss = async (suggestionId: string) => {
    await dismissSuggestion.mutateAsync(suggestionId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-emerald-600 bg-emerald-500/10';
    if (confidence >= 0.75) return 'text-blue-600 bg-blue-500/10';
    return 'text-amber-600 bg-amber-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Automações Ativas"
          value={stats?.activeRules || 0}
          icon={<Zap className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          label="Tempo Poupado"
          value={`${Math.round((stats?.timeSavedMinutes || 0) / 60)}h`}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          label="Taxa de Sucesso"
          value={stats?.totalExecutions ? 
            `${Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)}%` : 
            '—'}
          icon={<Target className="w-4 h-4" />}
          color="violet"
        />
        <StatCard
          label="Sugestões Pendentes"
          value={suggestions.length}
          icon={<Sparkles className="w-4 h-4" />}
          color="amber"
        />
      </div>

      {/* AI Suggestions Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Sugestões IA para {entityName}</CardTitle>
                <CardDescription>
                  Automações personalizadas baseadas em padrões de comportamento
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generateSuggestions.isPending}
              className="gap-2"
            >
              {generateSuggestions.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Analisar Padrões
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Lightbulb className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Nenhuma sugestão ainda</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Clica em "Analisar Padrões" para a IA identificar oportunidades de automação
              </p>
              <Button onClick={handleGenerate} disabled={generateSuggestions.isPending}>
                {generateSuggestions.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Sugestões
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const isExpanded = expandedSuggestion === suggestion.id;
                const confidenceClass = getConfidenceColor(suggestion.confidence);

                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "border rounded-lg transition-all",
                      isExpanded ? "shadow-sm" : "hover:border-primary/30"
                    )}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", confidenceClass)}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{suggestion.title}</p>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", confidenceClass)}
                            >
                              {Math.round(suggestion.confidence * 100)}% confiança
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {suggestion.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isExpanded && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(suggestion.id);
                                }}
                                disabled={acceptSuggestion.isPending}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismiss(suggestion.id);
                                }}
                                disabled={dismissSuggestion.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            EXPLICAÇÃO
                          </p>
                          <p className="text-sm">{suggestion.explanation}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              TRIGGER
                            </p>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {suggestion.trigger_type}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              AÇÕES ({(suggestion.actions as any[])?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {((suggestion.actions as any[]) || []).slice(0, 3).map((action: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {action.action_type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Confiança {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismiss(suggestion.id)}
                              disabled={dismissSuggestion.isPending}
                            >
                              Ignorar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAccept(suggestion.id)}
                              disabled={acceptSuggestion.isPending}
                              className="gap-2"
                            >
                              {acceptSuggestion.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Aceitar
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    violet: 'bg-violet-500/10 text-violet-600',
    amber: 'bg-amber-500/10 text-amber-600'
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
