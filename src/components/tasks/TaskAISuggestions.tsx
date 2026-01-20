import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2, RefreshCw, Zap, Clock, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskPriority, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from "@/types/taskTemplate";

export interface AITaskSuggestion {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  reason: string;
  dueDays: number;
  confidence: number;
  impactScore: number;
}

interface TaskAISuggestionsProps {
  entityType: string;
  entityId: string;
  entityName: string;
  onAddTask: (suggestion: AITaskSuggestion) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Mock AI suggestions - in production would come from AI endpoint
const mockSuggestions: AITaskSuggestion[] = [
  {
    id: '1',
    title: 'Follow-up após proposta',
    description: 'Contactar para verificar receção da proposta e esclarecer dúvidas',
    priority: 'high',
    category: 'follow_up',
    reason: 'Proposta enviada há 3 dias sem resposta',
    dueDays: 1,
    confidence: 92,
    impactScore: 85
  },
  {
    id: '2',
    title: 'Agendar demonstração',
    description: 'Marcar sessão de demonstração do produto premium',
    priority: 'medium',
    category: 'meeting',
    reason: 'Cliente mostrou interesse em funcionalidades avançadas',
    dueDays: 5,
    confidence: 78,
    impactScore: 90
  },
  {
    id: '3',
    title: 'Preparar proposta upsell',
    description: 'Elaborar proposta de upgrade baseado no consumo atual',
    priority: 'medium',
    category: 'upsell',
    reason: 'Consumo a 80% - ideal para upgrade',
    dueDays: 7,
    confidence: 85,
    impactScore: 95
  }
];

export function TaskAISuggestions({
  entityType,
  entityId,
  entityName,
  onAddTask,
  isLoading = false,
  onRefresh
}: TaskAISuggestionsProps) {
  const [suggestions] = useState<AITaskSuggestion[]>(mockSuggestions);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAddTask = (suggestion: AITaskSuggestion) => {
    onAddTask(suggestion);
    setAddedIds(prev => new Set([...prev, suggestion.id]));
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Sugestões IA</CardTitle>
              <CardDescription>
                Tarefas recomendadas para {entityName}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analisando contexto...
            </span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem sugestões de momento</p>
            <p className="text-xs mt-1">A IA vai analisar e sugerir quando relevante</p>
          </div>
        ) : (
          suggestions.map((suggestion) => {
            const isAdded = addedIds.has(suggestion.id);
            
            return (
              <div
                key={suggestion.id}
                className={cn(
                  "p-4 rounded-lg border bg-card transition-all",
                  isAdded && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", TASK_PRIORITY_COLORS[suggestion.priority])}
                      >
                        {TASK_PRIORITY_LABELS[suggestion.priority]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                    
                    {/* AI Insights */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-primary">
                        <Zap className="w-3 h-3" />
                        <span>{suggestion.confidence}% confiança</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>{suggestion.impactScore}% impacto</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{suggestion.dueDays} dias</span>
                      </div>
                    </div>
                    
                    {/* Reason */}
                    <div className="mt-2 p-2 rounded bg-muted/50 border border-dashed">
                      <p className="text-xs text-muted-foreground italic">
                        💡 {suggestion.reason}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={isAdded ? "ghost" : "default"}
                    onClick={() => handleAddTask(suggestion)}
                    disabled={isAdded}
                    className="shrink-0"
                  >
                    {isAdded ? (
                      "Adicionada"
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
