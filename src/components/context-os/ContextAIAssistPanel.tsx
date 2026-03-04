import { useState } from "react";
import { useAISuggestFields, AISuggestion } from "@/hooks/useContextAI";
import { useUpsertContextField, ContextBlock, FIELD_LABELS } from "@/hooks/useContextBlocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  block: ContextBlock;
}

export function ContextAIAssistPanel({ block }: Props) {
  const suggestFields = useAISuggestFields();
  const upsertField = useUpsertContextField();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const handleSuggest = () => {
    suggestFields.mutate(
      {
        blockId: block.id,
        workspaceId: block.workspace_id,
        blockType: block.block_type,
        fields: block.fields || [],
      },
      { onSuccess: (data) => setSuggestions(data) }
    );
  };

  const handleAccept = async (s: AISuggestion) => {
    const field = (block.fields || []).find(f => f.field_key === s.field_key);
    if (!field) return;

    await upsertField.mutateAsync({ fieldId: field.id, value: s.suggested_value });

    // Update origin to 'ai'
    await supabase
      .from("context_fields" as any)
      .update({
        origin: "ai",
        origin_details: {
          model: "gemini-3-flash-preview",
          confidence: s.confidence,
          reasoning: s.reasoning,
          timestamp: new Date().toISOString(),
        },
      } as any)
      .eq("id", field.id);

    setAccepted(prev => new Set([...prev, s.field_key]));
    toast.success(`Campo "${FIELD_LABELS[s.field_key] || s.field_key}" preenchido por IA`);
  };

  const handleDismiss = (fieldKey: string) => {
    setSuggestions(prev => prev.filter(s => s.field_key !== fieldKey));
  };

  const emptyCount = (block.fields || []).filter(f =>
    f.field_value === null || f.field_value === "" ||
    (Array.isArray(f.field_value) && f.field_value.length === 0)
  ).length;

  if (emptyCount === 0 && suggestions.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <Sparkles className="h-5 w-5 mx-auto mb-2 text-gold/50" />
        Todos os campos estão preenchidos! 🎉
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.length === 0 && (
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {emptyCount} campo{emptyCount > 1 ? "s" : ""} vazio{emptyCount > 1 ? "s" : ""} neste bloco
          </p>
          <Button
            onClick={handleSuggest}
            disabled={suggestFields.isPending}
            className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            {suggestFields.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Sugerir com IA
          </Button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium text-foreground">Sugestões da IA</span>
          </div>
          {suggestions.map(s => {
            const isAccepted = accepted.has(s.field_key);
            return (
              <div
                key={s.field_key}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  isAccepted
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-gold/20 bg-gold/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {FIELD_LABELS[s.field_key] || s.field_key}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      s.confidence >= 0.7 ? "bg-green-500/10 text-green-500" :
                      s.confidence >= 0.4 ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    )}
                  >
                    {Math.round(s.confidence * 100)}% confiança
                  </Badge>
                </div>
                <p className="text-sm text-foreground bg-background/50 p-2 rounded border border-border/30">
                  {typeof s.suggested_value === 'object'
                    ? JSON.stringify(s.suggested_value)
                    : String(s.suggested_value)}
                </p>
                <p className="text-[11px] text-muted-foreground italic">{s.reasoning}</p>
                {!isAccepted && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(s)}
                      disabled={upsertField.isPending}
                      className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-3 w-3" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(s.field_key)}
                      className="text-xs gap-1"
                    >
                      <X className="h-3 w-3" /> Descartar
                    </Button>
                  </div>
                )}
                {isAccepted && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Aceite e guardado
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
