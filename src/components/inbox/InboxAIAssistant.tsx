import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  MessageSquare,
  Loader2,
  Check,
  Copy,
  RefreshCw,
  Scissors,
  ArrowRight,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { useCopilot, ReplySuggestion } from "@/hooks/useCopilot";
import { Message } from "@/hooks/useMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  messages: Message[];
  leadName?: string | null;
  onInsertReply?: (text: string) => void;
}

export function InboxAIAssistant({ messages, leadName, onInsertReply }: Props) {
  const { isLoading, suggestReplies, summarizeConversation } = useCopilot();
  
  const [replies, setReplies] = useState<ReplySuggestion[] | null>(null);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [modifiedReply, setModifiedReply] = useState<string | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);

  const copilotMessages = messages.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.content,
    direction: m.direction,
  }));

  const handleSuggestReplies = async () => {
    setReplies(null);
    setSelectedReply(null);
    setModifiedReply(null);
    const result = await suggestReplies(copilotMessages);
    if (result?.suggestions) {
      setReplies(result.suggestions);
      // Set AI reasoning
      if (result.suggestions.length > 0) {
        setAiReason(`Baseado na conversa, o cliente parece interessado. Sugiro uma resposta ${result.suggestions[0].tone}.`);
      }
    }
  };

  const handleModifyReply = async (action: "rewrite" | "shorten" | "direct") => {
    if (!selectedReply) return;
    setIsModifying(true);
    
    // Simulate modification (in real implementation, call AI)
    setTimeout(() => {
      let modified = selectedReply;
      if (action === "shorten") {
        // Take first sentence or half the text
        const sentences = selectedReply.split('. ');
        modified = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ');
        if (!modified.endsWith('.') && !modified.endsWith('!') && !modified.endsWith('?')) {
          modified += '.';
        }
      } else if (action === "direct") {
        modified = selectedReply
          .replace(/Gostaria de /gi, '')
          .replace(/Seria possível /gi, '')
          .replace(/Por favor, /gi, '');
        modified = modified.charAt(0).toUpperCase() + modified.slice(1);
      } else {
        modified = `${selectedReply}\n\nFico ao dispor para qualquer esclarecimento adicional.`;
      }
      setModifiedReply(modified);
      setIsModifying(false);
    }, 500);
  };

  const handleCopyReply = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Resposta copiada");
  };

  const handleInsertReply = (text: string) => {
    if (onInsertReply) {
      onInsertReply(text);
      toast.success("Resposta inserida no campo de mensagem");
    }
  };

  const handleSelectReply = (text: string) => {
    setSelectedReply(text);
    setModifiedReply(null);
  };

  const displayReply = modifiedReply || selectedReply;

  if (messages.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistente AI</span>
          <Badge variant="outline" className="text-[10px] ml-auto">
            Apenas Sugestões
          </Badge>
        </div>

        {/* AI Notice */}
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            O AI sugere, mas nunca envia mensagens automaticamente. Revise sempre antes de enviar.
          </p>
        </div>

        {/* Generate Suggestions Button */}
        <Button
          onClick={handleSuggestReplies}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4 mr-2" />
          )}
          Sugerir Respostas
        </Button>

        {/* AI Reasoning */}
        {aiReason && (
          <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{aiReason}</p>
          </div>
        )}

        {/* Reply Suggestions */}
        {replies && replies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Sugestões de Resposta
            </h4>
            {replies.map((reply, i) => (
              <div 
                key={i} 
                className={cn(
                  "p-2 rounded-lg cursor-pointer transition-colors border",
                  selectedReply === reply.text 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-muted hover:bg-muted/80 border-transparent"
                )}
                onClick={() => handleSelectReply(reply.text)}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {reply.tone === "formal" ? "Formal" :
                     reply.tone === "friendly" ? "Amigável" : reply.tone}
                  </Badge>
                  {selectedReply === reply.text && (
                    <Check className="w-3 h-3 text-primary" />
                  )}
                </div>
                <p className="text-xs line-clamp-3">{reply.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Selected Reply Actions */}
        {selectedReply && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                Ajustar Resposta
              </h4>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("rewrite")}
                  disabled={isModifying}
                  className="flex-1 text-xs h-7"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reescrever
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("shorten")}
                  disabled={isModifying}
                  className="flex-1 text-xs h-7"
                >
                  <Scissors className="w-3 h-3 mr-1" />
                  Encurtar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("direct")}
                  disabled={isModifying}
                  className="flex-1 text-xs h-7"
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Direto
                </Button>
              </div>

              {/* Preview */}
              {displayReply && (
                <div className="p-2 bg-background rounded-lg border">
                  <p className="text-xs whitespace-pre-wrap">{displayReply}</p>
                </div>
              )}

              {/* Final Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyReply(displayReply!)}
                  className="flex-1"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleInsertReply(displayReply!)}
                  className="flex-1"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Usar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
