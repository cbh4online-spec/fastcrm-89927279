import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Loader2, 
  Sparkles, 
  Zap, 
  Filter, 
  PlayCircle, 
  ArrowRight,
  Shield,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface SuggestedAutomation {
  title: string;
  description: string;
  trigger_type: string;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  explanation: string;
}

interface AIAutomationSuggestionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: {
    type: "custom_field_created" | "form_created" | "field_updated";
    entityType: string;
    fieldName?: string;
    fieldType?: string;
    formName?: string;
  };
  onAcceptSuggestion?: (suggestion: SuggestedAutomation) => void;
}

const triggerLabels: Record<string, string> = {
  lead_created: "Lead Criado",
  lead_updated: "Lead Atualizado",
  custom_field_updated: "Campo Alterado",
  opportunity_created: "Oportunidade Criada",
  contact_created: "Contacto Criado",
  company_created: "Empresa Criada",
};

const actionLabels: Record<string, string> = {
  create_task: "Criar Tarefa",
  notify_user: "Notificar",
  add_tag: "Adicionar Tag",
  update_field: "Atualizar Campo",
  create_opportunity: "Criar Oportunidade",
  send_template_message: "Enviar Template",
};

export function AIAutomationSuggestionPrompt({
  open,
  onOpenChange,
  context,
  onAcceptSuggestion,
}: AIAutomationSuggestionPromptProps) {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedAutomation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = async () => {
    if (!currentWorkspace) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-contextual-automation", {
        body: {
          workspaceId: currentWorkspace.id,
          context,
        },
      });

      if (fnError) throw fnError;

      setSuggestions(data.suggestions || []);
      
      if (data.suggestions?.length === 0) {
        toast.info("Nenhuma sugestão de automação neste momento.");
      }
    } catch (err) {
      console.error("Error generating suggestions:", err);
      setError("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (suggestion: SuggestedAutomation) => {
    onAcceptSuggestion?.(suggestion);
    onOpenChange(false);
    toast.success("Sugestão aceite! Configure e ative a automação manualmente.");
  };

  // Generate suggestions when dialog opens
  useState(() => {
    if (open && suggestions.length === 0 && !isLoading) {
      generateSuggestions();
    }
  });

  const contextDescription = {
    custom_field_created: `Campo "${context.fieldName}" (${context.fieldType}) criado em ${context.entityType}`,
    form_created: `Formulário "${context.formName}" criado`,
    field_updated: `Campo "${context.fieldName}" modificado`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            Sugestões de Automação
          </DialogTitle>
          <DialogDescription>
            A IA identificou oportunidades de automação baseadas na sua ação recente:
            <Badge variant="secondary" className="ml-2">
              {contextDescription[context.type]}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>A analisar oportunidades de automação...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={generateSuggestions}>
                Tentar novamente
              </Button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sugestão de automação neste momento.</p>
              <p className="text-sm mt-1">
                Continue a usar o CRM e a IA irá sugerir automações relevantes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>

                  {/* Rule Preview */}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded">
                      <Zap className="h-3 w-3 text-amber-600" />
                      <span>{triggerLabels[suggestion.trigger_type] || suggestion.trigger_type}</span>
                    </div>
                    
                    {suggestion.conditions.length > 0 && (
                      <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded">
                          <Filter className="h-3 w-3 text-blue-600" />
                          <span>{suggestion.conditions.length} condição(ões)</span>
                        </div>
                      </>
                    )}
                    
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded">
                      <PlayCircle className="h-3 w-3 text-green-600" />
                      <span>
                        {suggestion.actions.map(a => actionLabels[a.action_type] || a.action_type).join(", ")}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    {suggestion.explanation}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSuggestions(suggestions.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ignorar
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      onClick={() => handleAccept(suggestion)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Criar Automação
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Safety Notice */}
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">
              Confirmação obrigatória
            </p>
            <p className="text-muted-foreground mt-0.5">
              Automações criadas a partir de sugestões começam <strong>desativadas</strong>. 
              Deve ativar manualmente após revisão.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
