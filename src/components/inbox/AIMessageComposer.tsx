import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
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
  Languages,
  CheckSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInboxAI, LeadData, OpportunityData, ReplySuggestion, ModifyAction } from "@/hooks/useInboxAI";
import { Message } from "@/hooks/useMessages";
import { InboxTemplatePanel } from "./InboxTemplatePanel";
import { VariableContext } from "@/lib/templateVariables";
import { TemplateFormDialog } from "@/components/communication/TemplateFormDialog";
import { CommunicationTemplate, TemplateChannel } from "@/types/communicationTemplate";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCannedShortcut } from "@/hooks/useCannedShortcut";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { VoiceNoteRecorder } from "./VoiceNoteRecorder";
import { ConversationSendProductButton } from "./ConversationSendProductButton";

interface AIMessageComposerProps {
  conversationId: string;
  messages: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel: string;
  templateContext: VariableContext;
  onSend: (message: string) => Promise<void>;
  onSendAndResolve?: (message: string) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
}

export interface AIMessageComposerRef {
  focus: () => void;
  setMessage: (text: string) => void;
}

export const AIMessageComposer = forwardRef<AIMessageComposerRef, AIMessageComposerProps>(
  ({ conversationId, messages, leadData, opportunityData, channel, templateContext, onSend, onSendAndResolve, isSending, disabled }, ref) => {
    const [message, setMessage] = useState("");
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showAIBar, setShowAIBar] = useState(() => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem("inbox-ai-bar") === "1";
    });
    const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
    const [reasoning, setReasoning] = useState<string>("");
    const [isModifying, setIsModifying] = useState(false);
    const [modifyingAction, setModifyingAction] = useState<ModifyAction | null>(null);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [templateToCreate, setTemplateToCreate] = useState<CommunicationTemplate | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const { isLoading, suggestReplies, modifyReply } = useInboxAI();
    const { trackConversationReplied, trackAISuggestionGenerated, trackAISuggestionAccepted, trackAISuggestionRejected } = useCRMAnalytics();
    const { currentWorkspace } = useWorkspace();
    const aiSuggestionUsed = useRef(false);
    const aiUsedInReply = useRef(false);
    const templateUsedInReply = useRef(false);

    const { user } = useAuth();
    const agentName =
      (user?.user_metadata as any)?.full_name ||
      (user?.user_metadata as any)?.name ||
      user?.email?.split("@")[0] ||
      "";

    // Canned responses / snippets via slash-command
    const { isOpen: cannedOpen, filtered: cannedFiltered, selectedIndex: cannedIndex, handleSelect: handleCannedSelect, handleKeyDown: handleCannedKeyDown } = useCannedShortcut({
      workspaceId: currentWorkspace?.id,
      inputValue: message,
      variableContext: {
        contactName: leadData?.name,
        contactEmail: leadData?.email,
        contactPhone: leadData?.phone,
        contactCompany: (leadData as any)?.company ?? null,
        agentName,
      },
      onSelect: (expandedContent) => {
        setMessage(expandedContent);
        textareaRef.current?.focus();
      },
    });
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

    const isLastMessageOutbound = messages.length > 0 && messages[messages.length - 1]?.direction === "outbound";

    const handleSuggestReply = async () => {
      if (messages.length === 0) {
        toast.info("Sem mensagens para analisar.");
        return;
      }
      if (isLastMessageOutbound) {
        toast.info("O cliente ainda não respondeu. Aguarde uma resposta antes de pedir sugestões.");
        return;
      }
      setShowAIPanel(true);
      setSuggestions([]);
      setReasoning("");
      
      const result = await suggestReplies(messages, leadData, opportunityData, channel);
      if (result) {
        setSuggestions(result.suggestions);
        setReasoning(result.reasoning);
        trackAISuggestionGenerated({ context: 'inbox', intent_detected: undefined, recommended_tone: result.suggestions[0]?.tone });
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
      aiUsedInReply.current = true;
      aiSuggestionUsed.current = true;
      trackAISuggestionAccepted({ context: 'inbox', tone_used: undefined, edited_before_send: false });
      textareaRef.current?.focus();
    };

    const handleCloseAIPanel = useCallback(() => {
      if (!aiSuggestionUsed.current && suggestions.length > 0) {
        trackAISuggestionRejected({ context: 'inbox' });
      }
      setShowAIPanel(false);
      aiSuggestionUsed.current = false;
    }, [suggestions.length, trackAISuggestionRejected]);

    const handleTemplateApply = (content: string, subject?: string) => {
      setMessage(content);
      templateUsedInReply.current = true;
      textareaRef.current?.focus();
    };

    const handleSend = async () => {
      if (!message.trim() || isSending || disabled) return;
      trackConversationReplied({
        response_time_minutes: 0,
        ai_used: aiUsedInReply.current,
        template_used: templateUsedInReply.current,
        follow_up_scheduled: false,
      });
      await onSend(message.trim());
      setMessage("");
      aiUsedInReply.current = false;
      templateUsedInReply.current = false;
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
      <div className="p-3 border-t border-border bg-card space-y-2 max-h-[50vh] flex flex-col">
        {/* AI toggle header */}
        <div className="flex items-center justify-between">
          <Button
            variant={showAIBar ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setShowAIBar((p) => {
                const next = !p;
                if (typeof window !== "undefined") {
                  localStorage.setItem("inbox-ai-bar", next ? "1" : "0");
                }
                if (!next) setShowAIPanel(false);
                return next;
              });
            }}
            className="h-7 text-xs gap-1"
          >
            <Sparkles className="w-3 h-3" />
            IA
          </Button>
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

        {/* AI Actions Bar (collapsible) */}
        {showAIBar && (
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
                  disabled={isLoading || isLastMessageOutbound}
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
                <p>{isLastMessageOutbound ? "O cliente ainda não respondeu — aguarde uma resposta" : "AI sugere respostas com base no contexto da conversa e dados do CRM"}</p>
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

            {/* Translate */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModifyReply("formal" as ModifyAction)}
                  disabled={isLoading || !message.trim()}
                  className="h-7 text-xs gap-1"
                >
                  {isModifying && modifyingAction === ("formal" as ModifyAction) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3" />
                  )}
                  Traduzir
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Traduz a mensagem para o idioma do contacto</p>
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
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 flex-shrink overflow-y-auto max-h-48">
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
                  onClick={handleCloseAIPanel}
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
        <div className="flex gap-2 relative">
          <Textarea
            ref={textareaRef}
            placeholder={disabled ? "Janela de 24h expirada — não é possível responder" : "Escreva uma mensagem..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              // Check canned shortcut first
              if (handleCannedKeyDown(e)) return;
              
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (onSendAndResolve && message.trim()) {
                  onSendAndResolve(message.trim());
                  setMessage("");
                } else {
                  handleSend();
                }
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] resize-none flex-1"
            rows={2}
            disabled={disabled}
          />

          {/* Snippets / canned responses dropdown */}
          {cannedOpen && (
            <div className="absolute bottom-full left-0 right-12 mb-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {cannedFiltered.length > 0 ? (
                cannedFiltered.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-start gap-2 hover:bg-muted/50 transition-colors",
                      i === cannedIndex && "bg-muted/50"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCannedSelect(r);
                    }}
                  >
                    <Badge variant="outline" className="font-mono text-[9px] shrink-0 mt-0.5">/{r.shortcut}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{r.title}</span>
                        {r.is_personal && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">pessoal</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.content.replace(/<[^>]+>/g, "").slice(0, 80)}
                      </p>
                    </div>
                    <Zap className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhum snippet encontrado para "/{message.slice(1)}"
                </div>
              )}
              <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground flex items-center justify-between">
                <span>↑↓ navegar • Enter inserir • Esc fechar</span>
                <Link
                  to="/dashboard/inbox/snippets"
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Settings2 className="h-3 w-3" />
                  Gerir
                </Link>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 items-stretch">
            <div className="flex items-center gap-1">
              <ConversationSendProductButton
                conversationId={conversationId}
                channel={channel}
                disabled={disabled || isSending}
              />
              <VoiceNoteRecorder
                conversationId={conversationId}
                channel={channel}
                disabled={disabled || isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending || disabled}
                className="h-9 px-4"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {onSendAndResolve && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (message.trim()) {
                        onSendAndResolve(message.trim());
                        setMessage("");
                      }
                    }}
                    disabled={!message.trim() || isSending || disabled}
                    className="h-7 text-[10px] gap-1 px-2"
                  >
                    <CheckSquare className="w-3 h-3" />
                    Resolver
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Enviar e Resolver (⌘+Enter)</p></TooltipContent>
              </Tooltip>
            )}
          </div>
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
