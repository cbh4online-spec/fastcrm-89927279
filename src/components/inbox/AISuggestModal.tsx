import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, Copy, Target, MessageSquare, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInboxAI, LeadData, OpportunityData, ReplySuggestion } from "@/hooks/useInboxAI";
import { Message } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";

interface AISuggestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel: string;
  onSelectSuggestion: (text: string) => void;
  conversationId?: string;
  workspaceId?: string;
}

type TonePreset = "direct" | "consultative" | "commercial";

const tonePresets: { key: TonePreset; label: string; icon: React.ElementType; description: string }[] = [
  { key: "direct", label: "Direto", icon: Target, description: "Resposta concisa e objetiva" },
  { key: "consultative", label: "Consultivo", icon: MessageSquare, description: "Tom de aconselhamento" },
  { key: "commercial", label: "Comercial", icon: Briefcase, description: "Focado em conversão" },
];

export function AISuggestModal({
  open,
  onOpenChange,
  messages,
  leadData,
  opportunityData,
  channel,
  onSelectSuggestion,
  conversationId,
  workspaceId,
}: AISuggestModalProps) {
  const [activeTone, setActiveTone] = useState<TonePreset>("direct");
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [reasoning, setReasoning] = useState("");
  const { isLoading, suggestReplies } = useInboxAI();

  const handleGenerate = async (tone: TonePreset) => {
    setActiveTone(tone);
    setSuggestions([]);
    setReasoning("");
    
    const result = await suggestReplies(messages, leadData, opportunityData, channel);
    if (result) {
      setSuggestions(result.suggestions);
      setReasoning(result.reasoning);
    }
  };

  const logAIUsage = async (text: string) => {
    if (!conversationId || !workspaceId) return;
    try {
      await supabase.from("ai_agent_executions").insert({
        workspace_id: workspaceId,
        agent_type: "inbox_suggest",
        trigger_type: "manual",
        entity_id: conversationId,
        entity_type: "conversation",
        executive_summary: `AI suggestion used with tone: ${activeTone}`,
        input_summary: { tone: activeTone, conversation_id: conversationId } as any,
        output: { suggestion_text: text.slice(0, 500) } as any,
        reasoning_trace: {} as any,
      });
    } catch {
      // Non-blocking: don't fail the action if logging fails
    }
  };

  const handleSelect = (text: string) => {
    onSelectSuggestion(text);
    logAIUsage(text);
    onOpenChange(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Suggest
          </DialogTitle>
        </DialogHeader>

        {/* Tone Selection */}
        <div className="grid grid-cols-3 gap-2">
          {tonePresets.map((preset) => {
            const Icon = preset.icon;
            const isActive = activeTone === preset.key;
            return (
              <Button
                key={preset.key}
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "flex-col h-auto py-3 gap-1",
                  isActive && "ring-1 ring-primary/30"
                )}
                onClick={() => handleGenerate(preset.key)}
                disabled={isLoading}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground">{preset.description}</span>
              </Button>
            );
          })}
        </div>

        {/* Results */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">A gerar sugestões...</span>
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Selecione um tom para gerar sugestões
            </p>
          )}

          {reasoning && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {reasoning}
            </p>
          )}

          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] py-0">
                  {suggestion.tone === "formal" ? "Formal" :
                   suggestion.tone === "friendly" ? "Amigável" :
                   suggestion.tone === "empathetic" ? "Empático" : "Profissional"}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{suggestion.intent}</span>
              </div>
              <p className="text-sm leading-relaxed">{suggestion.text}</p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => handleSelect(suggestion.text)}
                  className="h-7 text-xs gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Usar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(suggestion.text)}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
