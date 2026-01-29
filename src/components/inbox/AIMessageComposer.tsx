import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Sparkles,
  Shrink,
  Target,
  FileText,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Copy,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInboxAI, LeadData, OpportunityData, ReplySuggestion, ModifyAction } from "@/hooks/useInboxAI";
import { Message } from "@/hooks/useMessages";
import { InboxTemplatePanel } from "./InboxTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { TemplateFormDialog } from "@/components/communication/TemplateFormDialog";
import { CommunicationTemplate, TemplateChannel } from "@/types/communicationTemplate";

interface AIMessageComposerProps {
  conversationId: string;
  messages: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel: string;
  templateContext: VariableContext;
  onSend: (message: string) => Promise<void>;
  isSending?: boolean;
}

export interface AIMessageComposerRef {
  focus: () => void;
  setMessage: (text: string) => void;
}

export const AIMessageComposer = forwardRef<AIMessageComposerRef, AIMessageComposerProps>(
  ({ conversationId, messages, leadData, opportunityData, channel, templateContext, onSend, isSending }, ref) => {
    const [message, setMessage] = useState("");
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
    const [reasoning, setReasoning] = useState<string>("");
    const [isModifying, setIsModifying] = useState(false);
    const [modifyingAction, setModifyingAction] = useState<ModifyAction | null>(null);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [templateToCreate, setTemplateToCreate] = useState<CommunicationTemplate | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const { isLoading, suggestReplies, modifyReply } = useInboxAI();

    // Map channel to template channel type
    const getTemplateChannel = (): TemplateChannel => {
      switch (channel) {
        case 'email': return 'email';
        case 'whatsapp': return 'whatsapp';
        default: return 'inbox';
      }
    };

    // Handle save current message as template
    const handleSaveAsTemplate = () => {
      if (!message.trim()) {
        toast.error("Escreva uma mensagem primeiro para guardar como template");
        return;
      }
      const prefilledTemplate: Partial<CommunicationTemplate> = {
        channel: getTemplateChannel(),
        body: message,
        language: 'pt',
        tone: 'professional',
        journeyContexts: ['followup'],
        isActive: true,
      };
      setTemplateToCreate(prefilledTemplate as CommunicationTemplate);
      setShowTemplateDialog(true);
    };

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      setMessage: (text: string) => setMessage(text),
    }));

    const handleSuggestReply = async () => {
      setShowAIPanel(true);
      setSuggestions([]);
      setReasoning("");
      
      const result = await suggestReplies(messages, leadData, opportunityData, channel);
      if (result) {
        setSuggestions(result.suggestions);
        setReasoning(result.reasoning);
      }
    };

    const handleModifyReply = async (action: ModifyAction) => {
      if (!message.trim()) {
        toast.error("Escreva uma mensagem primeiro para modificar");
        return;
      }
      
      setIsModifying(true);
      setModifyingAction(action);
      
      const result = await modifyReply(message, action, messages, channel);
      if (result) {
        setMessage(result.modifiedText);
        toast.success(result.changes);
      }
      
      setIsModifying(false);
      setModifyingAction(null);
    };

    const handleSelectSuggestion = (text: string) => {
      setMessage(text);
      setShowAIPanel(false);
      textareaRef.current?.focus();
    };

    const handleTemplateApply = (content: string, subject?: string) => {
      // For email, we could handle subject separately if needed
      // For now, we just apply the content
      setMessage(content);
      textareaRef.current?.focus();
    };

    const handleSend = async () => {
      if (!message.trim() || isSending) return;
      await onSend(message.trim());
      setMessage("");
    };

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copiado!");
    };

    const getToneLabel = (tone: string) => {
      const labels: Record<string, string> = {
        formal: "Formal",
        friendly: "Amigável",
        empathetic: "Empático",
        professional: "Profissional",
      };
      return labels[tone] || tone;
    };

    const getToneColor = (tone: string) => {
      const colors: Record<string, string> = {
        formal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        friendly: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        empathetic: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        professional: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      };
      return colors[tone] || colors.professional;
    };

    const getChannelLabel = (ch: string) => {
      const labels: Record<string, string> = {
        whatsapp: "WhatsApp",
        email: "Email",
        instagram: "Instagram",
        facebook: "Facebook",
        sms: "SMS",
        webchat: "Webchat",
      };
      return labels[ch] || ch;
    };

    return (
      <div className="p-3 border-t border-border bg-card space-y-2">
        {/* AI Actions Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">AI:</span>
          
          <TooltipProvider delayDuration={300}>
            {/* Suggest Reply */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSuggestReply}
                  disabled={isLoading}
                  className="h-7 text-xs gap-1"
                >
                  {isLoading && !isModifying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Sugerir resposta
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI sugere respostas com base no contexto da conversa e dados do CRM</p>
              </TooltipContent>
            </Tooltip>

            {/* Shorten Reply */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("shorten")}
                  disabled={isLoading || !message.trim()}
                  className="h-7 text-xs gap-1"
                >
                  {isModifying && modifyingAction === "shorten" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Shrink className="w-3 h-3" />
                  )}
                  Encurtar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Torna a resposta mais curta e concisa</p>
              </TooltipContent>
            </Tooltip>

            {/* Make Commercial */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("commercial" as ModifyAction)}
                  disabled={isLoading || !message.trim()}
                  className="h-7 text-xs gap-1"
                >
                  {isModifying && modifyingAction === ("commercial" as ModifyAction) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Target className="w-3 h-3" />
                  )}
                  Mais comercial
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Adiciona tom comercial focado em conversão</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Template Panel (NEW - with AI adaptation) */}
          <div className="ml-auto">
            <InboxTemplatePanel
              channel={channel}
              messages={messages}
              templateContext={templateContext}
              leadData={leadData}
              opportunityData={opportunityData}
              onApply={handleTemplateApply}
              trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  Templates
                </Button>
              }
            />
          </div>
        </div>

        {/* Channel indicator */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] py-0">
            {getChannelLabel(channel)}
          </Badge>
          <span className="text-muted-foreground">
            Tom adaptado ao canal
          </span>
        </div>

        {/* AI Suggestions Panel */}
        {showAIPanel && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Sugestões AI</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestReply}
                  disabled={isLoading}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                  className="h-6 text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>

            {isLoading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">A gerar sugestões...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <>
                {reasoning && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                    {reasoning}
                  </p>
                )}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-border bg-background p-2.5 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px] py-0", getToneColor(suggestion.tone))}>
                          {getToneLabel(suggestion.tone)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{suggestion.intent}</span>
                      </div>
                      <p className="text-sm max-h-24 overflow-y-auto">{suggestion.text}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelectSuggestion(suggestion.text)}
                          className="h-6 text-xs gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Usar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(suggestion.text)}
                          className="h-6 text-xs gap-1"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Clique em "Sugerir resposta" para gerar sugestões
              </p>
            )}
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Escreva uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] resize-none flex-1"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="h-auto px-4"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Safety Notice */}
        <p className="text-[10px] text-muted-foreground text-center">
          AI sugere respostas • Revisão humana sempre necessária antes de enviar
        </p>

        {/* Template Form Dialog */}
        <TemplateFormDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          template={templateToCreate}
          onClose={() => {
            setShowTemplateDialog(false);
            setTemplateToCreate(null);
          }}
        />
      </div>
    );
  }
);

AIMessageComposer.displayName = "AIMessageComposer";
