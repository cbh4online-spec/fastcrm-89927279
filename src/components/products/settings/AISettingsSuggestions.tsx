import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AISettingsSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsType: string;
  settingsLabel: string;
  existingEntries: any[];
  industryContext?: string;
  onAddEntry: (entry: any) => Promise<void>;
}

export function AISettingsSuggestions({
  open,
  onOpenChange,
  settingsType,
  settingsLabel,
  existingEntries,
  industryContext,
  onAddEntry,
}: AISettingsSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCodes, setAddedCodes] = useState<Set<string>>(new Set());
  const [addingCode, setAddingCode] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setAddedCodes(new Set());

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest-settings",
          settingsType,
          existingEntries,
          industryContext,
        },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Erro ao obter sugestões");

      setSuggestions(data.data.suggestions || []);
      if ((data.data.suggestions || []).length === 0) {
        setError("A IA não encontrou sugestões adicionais relevantes para este contexto.");
      }
    } catch (err: any) {
      console.error("AI settings suggestions error:", err);
      setError(err.message || "Erro ao obter sugestões da IA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && suggestions.length === 0 && !isLoading) {
      fetchSuggestions();
    }
  };

  const handleAdd = async (suggestion: any) => {
    const code = suggestion.code || suggestion.name;
    setAddingCode(code);
    try {
      await onAddEntry(suggestion);
      setAddedCodes((prev) => new Set(prev).add(code));
      toast.success(`"${suggestion.label || suggestion.name}" adicionado!`);
    } catch (err: any) {
      toast.error(`Erro ao adicionar: ${err.message}`);
    } finally {
      setAddingCode(null);
    }
  };

  const handleAddAll = async () => {
    const toAdd = suggestions.filter((s) => !addedCodes.has(s.code || s.name));
    for (const suggestion of toAdd) {
      await handleAdd(suggestion);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões IA — {settingsLabel}
          </DialogTitle>
          <DialogDescription>
            Sugestões geradas por IA para complementar as suas configurações
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A gerar sugestões...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchSuggestions}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => {
                const code = suggestion.code || suggestion.name;
                const isAdded = addedCodes.has(code);
                const isAdding = addingCode === code;

                return (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors"
                    style={{ borderLeftColor: suggestion.color, borderLeftWidth: 3 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{suggestion.label || suggestion.name}</span>
                        {suggestion.code && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {suggestion.code}
                          </Badge>
                        )}
                      </div>
                      {suggestion.description && (
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                      )}
                      {suggestion.days !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">{suggestion.days} dias</p>
                      )}
                      {suggestion.interval_days !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">{suggestion.interval_days} dias</p>
                      )}
                      {suggestion.is_recurring !== undefined && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {suggestion.is_recurring ? "Recorrente" : "Único"}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "ghost" : "outline"}
                      disabled={isAdded || isAdding}
                      onClick={() => handleAdd(suggestion)}
                      className="shrink-0"
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isAdded ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {!isLoading && suggestions.length > 0 && (
          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" size="sm" onClick={fetchSuggestions}>
              <Sparkles className="h-4 w-4 mr-1" />
              Gerar novas
            </Button>
            <Button
              size="sm"
              onClick={handleAddAll}
              disabled={suggestions.every((s) => addedCodes.has(s.code || s.name))}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar todas
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
