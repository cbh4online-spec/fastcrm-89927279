import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  Check, 
  X, 
  Edit3,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { FieldSuggestion } from "@/hooks/useFieldSuggestions";
import { cn } from "@/lib/utils";

// Minimum confidence threshold to show suggestions
const CONFIDENCE_THRESHOLD = 0.5;

interface InlineFieldSuggestionProps {
  suggestion: FieldSuggestion | undefined;
  onAccept: (value: unknown) => Promise<void>;
  onReject: () => void;
  isAccepting?: boolean;
  className?: string;
}

export function InlineFieldSuggestion({ 
  suggestion, 
  onAccept, 
  onReject,
  isAccepting = false,
  className 
}: InlineFieldSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if no suggestion or below threshold
  if (!suggestion || suggestion.confidence < CONFIDENCE_THRESHOLD) {
    return null;
  }

  const displayValue = typeof suggestion.suggested_value === "object" 
    ? JSON.stringify(suggestion.suggested_value)
    : String(suggestion.suggested_value);

  const confidenceColor = suggestion.confidence >= 0.8 
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
    : "bg-amber-500/10 text-amber-700 border-amber-500/30";

  const confidenceLabel = suggestion.confidence >= 0.8 ? "Alta" : "Média";

  const handleStartEdit = () => {
    setEditedValue(displayValue);
    setIsEditing(true);
  };

  const handleAccept = async () => {
    const valueToAccept = isEditing ? editedValue : suggestion.suggested_value;
    await onAccept(valueToAccept);
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleReject = () => {
    onReject();
    setIsEditing(false);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
            "bg-primary/10 text-primary border border-primary/20",
            "hover:bg-primary/20 transition-colors cursor-pointer",
            className
          )}
        >
          <Sparkles className="w-3 h-3" />
          IA sugerida
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="bottom"
      >
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Sugestão IA</span>
            </div>
            <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
              Confiança {confidenceLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {suggestion.explanation}
          </p>
        </div>

        <div className="p-3 space-y-3">
          {/* Suggested Value */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Valor sugerido
            </label>
            {isEditing ? (
              <Input
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="text-sm"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-md px-3 py-2 border text-sm font-medium">
                  {displayValue}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleStartEdit}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar antes de aceitar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={handleReject}
              disabled={isAccepting}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Ignorar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                  A aplicar...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Aceitar
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper to get suggestion for a specific field (call outside of render)
export function getSuggestionForField(
  suggestions: FieldSuggestion[],
  fieldName: string,
  fieldType: "standard" | "custom" = "standard"
): FieldSuggestion | undefined {
  return suggestions.find(
    s => s.field_name === fieldName && 
         s.field_type === fieldType &&
         s.confidence >= CONFIDENCE_THRESHOLD
  );
}

// Hook version (for backward compatibility)
export function useSuggestionForField(
  suggestions: FieldSuggestion[],
  fieldName: string,
  fieldType: "standard" | "custom" = "standard"
): FieldSuggestion | undefined {
  return getSuggestionForField(suggestions, fieldName, fieldType);
}

// Enhanced DetailRow with inline AI suggestion support
interface DetailRowWithSuggestionProps {
  label: string;
  fieldName: string;
  value?: string | React.ReactNode;
  isEditing?: boolean;
  editComponent?: React.ReactNode;
  icon?: React.ReactNode;
  isLink?: boolean;
  suggestion?: FieldSuggestion;
  onAcceptSuggestion?: (value: unknown) => Promise<void>;
  onRejectSuggestion?: () => void;
  isAcceptingSuggestion?: boolean;
}

export function DetailRowWithSuggestion({ 
  label, 
  fieldName,
  value, 
  isEditing, 
  editComponent, 
  icon, 
  isLink,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
  isAcceptingSuggestion
}: DetailRowWithSuggestionProps) {
  const hasValue = value !== undefined && value !== null && value !== "" && value !== "—";
  const showSuggestion = !hasValue && suggestion && suggestion.confidence >= CONFIDENCE_THRESHOLD;

  return (
    <div className="flex items-start py-3 border-b border-border/50 last:border-0">
      <div className="w-32 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="flex-1 text-sm">
        {isEditing && editComponent ? (
          <div className="space-y-1">
            {editComponent}
            {showSuggestion && onAcceptSuggestion && onRejectSuggestion && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Sugestão:</span>
                <span className="font-medium text-foreground">
                  {typeof suggestion.suggested_value === "object" 
                    ? JSON.stringify(suggestion.suggested_value)
                    : String(suggestion.suggested_value)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-primary"
                  onClick={() => onAcceptSuggestion(suggestion.suggested_value)}
                >
                  Usar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {isLink && value ? (
              <a 
                href={typeof value === 'string' && value.includes('@') ? `mailto:${value}` : `tel:${value}`}
                className="text-primary hover:underline flex items-center gap-1"
              >
                {value}
                <ChevronRight className="w-3 h-3" />
              </a>
            ) : (
              <span className={cn(!hasValue && "text-muted-foreground")}>
                {hasValue ? value : "—"}
              </span>
            )}
            
            {/* Show AI suggestion badge for empty fields */}
            {showSuggestion && onAcceptSuggestion && onRejectSuggestion && (
              <InlineFieldSuggestion
                suggestion={suggestion}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                isAccepting={isAcceptingSuggestion}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
