import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Zap,
  Shield
} from "lucide-react";
import { 
  useFieldSuggestions, 
  useGenerateFieldSuggestions, 
  useAcceptSuggestion, 
  useRejectSuggestion,
  useDismissAllSuggestions,
  EntityType,
  FieldSuggestion
} from "@/hooks/useFieldSuggestions";
import { cn } from "@/lib/utils";
import { ConfidenceScore, SuggestionExplanation } from "./AIConfidenceDisplay";

interface FieldSuggestionsPanelProps {
  entityType: EntityType;
  entityId: string;
  onApplySuggestion: (
    fieldName: string, 
    value: unknown, 
    fieldType: "standard" | "custom", 
    customFieldId?: string
  ) => Promise<void>;
  className?: string;
}

function SuggestionCard({ 
  suggestion, 
  onAccept, 
  onReject,
  isAccepting,
}: { 
  suggestion: FieldSuggestion;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
}) {
  const displayValue = typeof suggestion.suggested_value === "object" 
    ? JSON.stringify(suggestion.suggested_value)
    : String(suggestion.suggested_value);

  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground capitalize">
              {suggestion.field_name.replace(/_/g, " ")}
            </span>
            {suggestion.field_type === "custom" && (
              <Badge variant="outline" className="text-xs">
                Personalizado
              </Badge>
            )}
          </div>
          <div className="bg-background rounded px-2 py-1.5 border border-primary/20">
            <span className="text-sm text-foreground font-medium truncate block">
              {displayValue}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onReject}
                  disabled={isAccepting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rejeitar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={onAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aceitar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex-1 truncate pr-2">
          {suggestion.explanation}
        </span>
        <ConfidenceScore confidence={suggestion.confidence} size="sm" />
      </div>
    </div>
  );
}

export function FieldSuggestionsPanel({ 
  entityType, 
  entityId, 
  onApplySuggestion,
  className 
}: FieldSuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: suggestions = [], isLoading } = useFieldSuggestions(entityType, entityId);
  const generateSuggestions = useGenerateFieldSuggestions();
  const acceptSuggestion = useAcceptSuggestion();
  const rejectSuggestion = useRejectSuggestion();
  const dismissAll = useDismissAllSuggestions();

  const handleGenerate = () => {
    generateSuggestions.mutate({ entityType, entityId });
  };

  const handleAccept = async (suggestion: FieldSuggestion) => {
    setAcceptingId(suggestion.id);
    try {
      await acceptSuggestion.mutateAsync({
        suggestion,
        onApply: onApplySuggestion,
      });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = (suggestion: FieldSuggestion) => {
    rejectSuggestion.mutate(suggestion);
  };

  const handleDismissAll = () => {
    dismissAll.mutate({ entityType, entityId });
  };

  const hasSuggestions = suggestions.length > 0;

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-b from-primary/5 to-transparent", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sugestões IA
            {hasSuggestions && (
              <Badge variant="secondary" className="ml-1">
                {suggestions.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleGenerate}
                    disabled={generateSuggestions.isPending}
                  >
                    {generateSuggestions.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Gerar sugestões</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasSuggestions && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : generateSuggestions.isPending ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            A analisar dados...
          </div>
        ) : !hasSuggestions ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Clique para gerar sugestões baseadas em IA
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Sugestões
            </Button>
          </div>
        ) : isExpanded ? (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => handleAccept(suggestion)}
                onReject={() => handleReject(suggestion)}
                isAccepting={acceptingId === suggestion.id}
              />
            ))}
            
            {suggestions.length > 1 && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleDismissAll}
                >
                  Ignorar todas
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">
            {suggestions.length} sugestão(ões) disponível(eis)
          </div>
        )}

        {generateSuggestions.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive mt-2">
            <AlertCircle className="h-4 w-4" />
            Erro ao gerar sugestões
          </div>
        )}
      </CardContent>
    </Card>
  );
}
