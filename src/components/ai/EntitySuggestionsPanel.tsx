import { useState } from 'react';
import { useEntitySuggestions, useAcceptSuggestionHub, useDismissSuggestionHub, useGenerateSuggestionsHub } from '@/hooks/useAISuggestions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, Check, X, ChevronDown, Loader2, Tag, FileText, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { AISuggestion, SuggestionEntityType } from '@/types/ai-suggestions';

interface EntitySuggestionsPanelProps {
  entityType: SuggestionEntityType;
  entityId: string;
  compact?: boolean;
}

function SuggestionChip({ suggestion, onAccept, onDismiss }: {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const isTag = suggestion.suggestion_type === 'tag';
  const Icon = isTag ? Tag : FileText;
  const label = isTag ? suggestion.tag_value : `${suggestion.field_name}: ${String(suggestion.suggested_value ?? '')}`;
  const pct = Math.round(suggestion.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:border-primary/30 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium truncate flex-1">{label}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pct}%</Badge>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onAccept}>
        <Check className="h-3.5 w-3.5 text-primary" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDismiss}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </motion.div>
  );
}

export function EntitySuggestionsPanel({ entityType, entityId, compact = false }: EntitySuggestionsPanelProps) {
  const { data: suggestions = [], isLoading } = useEntitySuggestions(entityType, entityId);
  const acceptMutation = useAcceptSuggestionHub();
  const dismissMutation = useDismissSuggestionHub();
  const generateMutation = useGenerateSuggestionsHub();
  const [open, setOpen] = useState(true);

  const tagSuggestions = suggestions.filter(s => s.suggestion_type === 'tag');
  const fieldSuggestions = suggestions.filter(s => s.suggestion_type === 'field_value');
  const allSuggestions = [...tagSuggestions, ...fieldSuggestions];

  if (isLoading || allSuggestions.length === 0) {
    if (compact) return null;
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {allSuggestions.slice(0, 3).map(s => (
            <SuggestionChip
              key={s.id}
              suggestion={s}
              onAccept={() => acceptMutation.mutate(s)}
              onDismiss={() => dismissMutation.mutate({ id: s.id })}
            />
          ))}
        </AnimatePresence>
        {allSuggestions.length > 3 && (
          <Badge variant="secondary" className="text-xs">+{allSuggestions.length - 3}</Badge>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sugestões IA</span>
            <Badge variant="secondary" className="text-xs">{allSuggestions.length}</Badge>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-1 pb-2">
        <AnimatePresence>
          {allSuggestions.map(s => (
            <SuggestionChip
              key={s.id}
              suggestion={s}
              onAccept={() => acceptMutation.mutate(s)}
              onDismiss={() => dismissMutation.mutate({ id: s.id })}
            />
          ))}
        </AnimatePresence>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          disabled={generateMutation.isPending}
          onClick={() => {
            generateMutation.mutate({ type: 'tags', entity_type: entityType, entity_id: entityId });
            generateMutation.mutate({ type: 'fields', entity_type: entityType, entity_id: entityId });
          }}
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Gerar novas sugestões
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
