import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Activity,
  StickyNote,
  ArrowRight,
  Plus,
  Clock,
  MessageSquare,
  Target,
  TrendingUp,
} from 'lucide-react';
import { EntityType, Entity } from '@/types/entity';
import { EntityAISuggestionsPanel } from './EntityAISuggestionsPanel';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EntityOverviewSectionProps {
  entityType: EntityType;
  entity: Entity;
  onGenerateSuggestions: () => void;
  isGeneratingSuggestions?: boolean;
  recentActivities?: {
    id: string;
    type: string;
    title: string;
    timestamp: Date;
  }[];
  onAddNote?: (note: string) => void;
  isAddingNote?: boolean;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'agora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
}

export function EntityOverviewSection({
  entityType,
  entity,
  onGenerateSuggestions,
  isGeneratingSuggestions,
  recentActivities = [],
  onAddNote,
  isAddingNote,
}: EntityOverviewSectionProps) {
  const [quickNote, setQuickNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleAddNote = () => {
    if (quickNote.trim() && onAddNote) {
      onAddNote(quickNote);
      setQuickNote('');
      setShowNoteInput(false);
    }
  };

  const entityLabels: Record<EntityType, string> = {
    lead: 'Lead',
    contact: 'Contacto',
    company: 'Empresa',
  };

  // AI Summary (from entity insights)
  const aiSummary = entity.ai_insight;
  const nextAction = entity.ai_next_action;

  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Resumo Inteligente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{aiSummary}</p>
            {nextAction && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Próxima ação
                </Badge>
                <span className="text-muted-foreground">{nextAction}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Suggestions */}
        <EntityAISuggestionsPanel
          entityType={entityType}
          entity={entity}
          onRefresh={onGenerateSuggestions}
          isLoading={isGeneratingSuggestions}
        />

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Atividade Recente</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem atividade recente</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  As interações aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Note */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Nota Rápida</CardTitle>
            </div>
            {!showNoteInput && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNoteInput(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          <CardDescription>
            Adiciona observações importantes sobre este {entityLabels[entityType].toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showNoteInput ? (
            <div className="space-y-3">
              <Textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder={`Escreve uma nota sobre ${entity.name}...`}
                className="min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowNoteInput(false);
                    setQuickNote('');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!quickNote.trim() || isAddingNote}
                >
                  {isAddingNote ? 'A guardar...' : 'Guardar Nota'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {entity.notes || 'Sem notas. Clica em "Adicionar" para começar.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
