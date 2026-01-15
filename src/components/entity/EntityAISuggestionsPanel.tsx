import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  Target,
  UserPlus,
  CheckSquare,
  Edit3,
  RefreshCw,
  Clock,
  Loader2,
} from 'lucide-react';
import { EntityType, Entity, AISuggestionAction } from '@/types/entity';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface EntityAISuggestionsPanelProps {
  entityType: EntityType;
  entity: Entity;
  suggestions?: AISuggestionAction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onExecuteAction?: (action: AISuggestionAction) => Promise<void>;
}

const ACTION_ICONS: Record<AISuggestionAction['type'], React.ElementType> = {
  follow_up: MessageSquare,
  convert: UserPlus,
  create_opportunity: Target,
  send_message: MessageSquare,
  add_task: CheckSquare,
  update_field: Edit3,
};

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

// Mock suggestions based on entity state
function generateMockSuggestions(entity: Entity, entityType: EntityType): AISuggestionAction[] {
  const suggestions: AISuggestionAction[] = [];

  // Check last contact
  const lastContact = entity.ai_analyzed_at ? new Date(entity.ai_analyzed_at) : null;
  const daysSinceLastContact = lastContact 
    ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Stale lead suggestion
  if (daysSinceLastContact && daysSinceLastContact > 3) {
    suggestions.push({
      id: 'follow-up-stale',
      type: 'follow_up',
      label: 'Fazer follow-up',
      description: `${entityType === 'lead' ? 'Lead' : entityType === 'contact' ? 'Contacto' : 'Empresa'} sem contacto há ${daysSinceLastContact} dias`,
      priority: daysSinceLastContact > 7 ? 'high' : 'medium',
    });
  }

  // Hot lead conversion
  if (entity.ai_temperature === 'hot' && entityType === 'lead') {
    suggestions.push({
      id: 'convert-hot',
      type: 'create_opportunity',
      label: 'Criar oportunidade',
      description: 'Lead quente com alta probabilidade de conversão',
      priority: 'high',
    });
  }

  // Missing info suggestions
  if (!entity.phone) {
    suggestions.push({
      id: 'add-phone',
      type: 'update_field',
      label: 'Adicionar telefone',
      description: 'Telefone em falta - melhora a taxa de contacto',
      priority: 'low',
      data: { field: 'phone' },
    });
  }

  // Convert lead to contact
  if (entityType === 'lead' && (entity as any).status === 'completed') {
    suggestions.push({
      id: 'convert-contact',
      type: 'convert',
      label: 'Converter em Contacto',
      description: 'Lead concluído - promover para contacto',
      priority: 'medium',
    });
  }

  // Generic task suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      id: 'add-task',
      type: 'add_task',
      label: 'Agendar tarefa',
      description: 'Criar lembrete para acompanhamento',
      priority: 'low',
    });
  }

  return suggestions.slice(0, 4);
}

export function EntityAISuggestionsPanel({
  entityType,
  entity,
  suggestions: propSuggestions,
  isLoading,
  onRefresh,
  onExecuteAction,
}: EntityAISuggestionsPanelProps) {
  const navigate = useNavigate();
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const suggestions = propSuggestions || generateMockSuggestions(entity, entityType);

  const handleExecuteAction = async (action: AISuggestionAction) => {
    setExecutingAction(action.id);
    try {
      if (onExecuteAction) {
        await onExecuteAction(action);
      } else {
        // Default actions
        switch (action.type) {
          case 'follow_up':
          case 'send_message':
            navigate(`/dashboard/inbox?${entityType}=${entity.id}`);
            break;
          case 'create_opportunity':
            navigate(`/dashboard/opportunities?create=true&${entityType}Id=${entity.id}`);
            break;
          case 'add_task':
            toast.info('Funcionalidade de tarefas em desenvolvimento');
            break;
          case 'convert':
            if (entityType === 'lead') {
              toast.info('Converter lead em contacto...');
            }
            break;
          default:
            toast.info('Ação executada');
        }
      }
    } finally {
      setExecutingAction(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">Sugestões IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Sem sugestões no momento
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            A IA analisa a atividade para gerar recomendações
          </p>
          {onRefresh && (
            <Button variant="link" size="sm" onClick={onRefresh} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Analisar agora
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Sugestões IA</CardTitle>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>O que merece a tua atenção agora</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion) => {
          const Icon = ACTION_ICONS[suggestion.type];
          const isExecuting = executingAction === suggestion.id;

          return (
            <div
              key={suggestion.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className={cn(
                'rounded-full p-2 flex-shrink-0',
                PRIORITY_COLORS[suggestion.priority]
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{suggestion.label}</span>
                  <Badge 
                    variant="outline" 
                    className={cn('text-[10px] px-1.5', PRIORITY_COLORS[suggestion.priority])}
                  >
                    {suggestion.priority === 'high' ? 'Urgente' : suggestion.priority === 'medium' ? 'Médio' : 'Baixo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {suggestion.description}
                </p>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleExecuteAction(suggestion)}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
