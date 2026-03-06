import { useState, useEffect, useRef, useCallback } from "react";
import { CommandInput } from "./CommandInput";
import { CommandOutput } from "./CommandOutput";
import { useAskFastCRM, AskResultAction, AskResultItem } from "@/hooks/useAskFastCRM";
import { useSlashCommands, SlashCommand, SlashCommandResult } from "@/hooks/useSlashCommands";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { detectIntent, getConversationalResponse } from "@/lib/conversationalIntent";
import { MessageSquare, RotateCcw, Bot, User as UserIcon, X, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const PLACEHOLDERS = [
  "Quais deals estão parados há mais de 7 dias?",
  "Resumo de revenue desta semana...",
  "Leads sem resposta nos últimos 3 dias",
  "Qual é o meu pipeline total?",
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  timestamp: Date;
  type?: 'brief' | 'text';
  actions?: AskResultAction[];
  items?: AskResultItem[];
}

/**
 * Generate contextual follow-up suggestions based on AI response content.
 */
function getContextualSuggestions(content: string): string[] {
  const lower = content.toLowerCase();

  // Forecast / revenue with €0 or low confidence
  if ((lower.includes("€0") || lower.includes("0 €") || lower.includes("confiança baixa") || lower.includes("sem receita"))) {
    return ["O que posso fazer para melhorar?", "Como está o pipeline?", "/leads"];
  }
  // Lead-related
  if (lower.includes("lead") || lower.includes("leads")) {
    return ["Qual tem maior potencial?", "Ver todos os leads", "/pipeline"];
  }
  // Pipeline / deals
  if (lower.includes("pipeline") || lower.includes("deal") || lower.includes("oportunidade")) {
    return ["Quais estão em risco?", "Como acelerar o fecho?", "/forecast"];
  }
  // Brief
  if (lower.includes("brief") || lower.includes("executivo") || lower.includes("resumo")) {
    return ["Quais são as prioridades?", "/pipeline", "/forecast"];
  }
  // Forecast
  if (lower.includes("previsão") || lower.includes("forecast") || lower.includes("receita")) {
    return ["Que deals estão em risco?", "Como melhorar a previsão?", "/brief"];
  }
  // Default
  return ["Explica mais", "O que devo fazer?", "/brief"];
}

export function AIQuestionBox() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [slashResult, setSlashResult] = useState<SlashCommandResult | null>(null);
  const [focused, setFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { ask, result, isLoading, clear, executeAction, pendingAction, confirmPendingAction, cancelPendingAction, confirmAutomation, cancelAutomation, isConfirmingAutomation } = useAskFastCRM();
  const { executeCommand } = useSlashCommands();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-open drawer once when conversation has > 2 exchanges (4 messages)
  const autoOpenedRef = useRef(false);
  const conversationContextRef = useRef<{
    last_question?: string;
    last_dataset?: { intent: string; object_type: string; items_count: number; metric?: any };
    last_analysis?: string;
  }>({});

  useEffect(() => {
    if (messages.length >= 4 && !autoOpenedRef.current) {
      setDrawerOpen(true);
      autoOpenedRef.current = true;
    }
  }, [messages.length]);

  // When ask-fastcrm result comes in, add it to chat with contextual suggestions and actions
  useEffect(() => {
    if (result) {
      const headline = result.answer?.headline || result.header || 'Resultado';
      const subtext = result.answer?.subtext || '';
      const content = subtext ? `**${headline}**\n\n${subtext}` : `**${headline}**`;
      const suggestions = getContextualSuggestions(content);

      // Update conversation context for follow-up support
      conversationContextRef.current = {
        last_question: conversationContextRef.current.last_question,
        last_dataset: {
          intent: result.intent,
          object_type: result.object_type,
          items_count: result.items?.length || 0,
          metric: result.metric,
        },
        last_analysis: `${headline}${subtext ? ' — ' + subtext.slice(0, 200) : ''}`,
      };
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg?.content === content) return prev;
        return [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          suggestions,
          timestamp: new Date(),
          actions: result.actions,
          items: result.items?.slice(0, 5),
        }];
      });
    }
  }, [result]);

  // When slash command result comes in, add to chat with structured data
  useEffect(() => {
    if (slashResult && !slashResult.loading) {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg?.content === slashResult.content) return prev;
        return [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: slashResult.content,
          suggestions: getContextualSuggestions(slashResult.content),
          timestamp: new Date(),
          type: slashResult.type,
          items: slashResult.items?.slice(0, 5),
          actions: slashResult.actions,
        }];
      });
    }
  }, [slashResult]);

  // Build conversation history for AI context
  const getConversationHistory = useCallback(() => {
    return messages.map(m => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSubmit = useCallback((query: string) => {
    setSlashResult(null);
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const intent = detectIntent(query);
    
    if (intent.type === 'conversational' && intent.subtype) {
      const response = getConversationalResponse(intent.subtype, userName);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text,
        suggestions: response.suggestions,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      return;
    }

    // Track last question in context
    conversationContextRef.current.last_question = query;

    // Pass conversation history + structured context for follow-ups
    const history = getConversationHistory();
    ask(query, history, conversationContextRef.current);
  }, [ask, userName, getConversationHistory]);

  const handleSlashCommand = useCallback((cmd: SlashCommand, args: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: cmd.command + (args ? ' ' + args : ''),
      timestamp: new Date(),
    }]);
    executeCommand(cmd, args);
    setSlashResult({ command: cmd.command, title: cmd.label, content: "A processar...", loading: true });
  }, [executeCommand]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSubmit(suggestion);
  }, [handleSubmit]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setDrawerOpen(false);
    autoOpenedRef.current = false;
    conversationContextRef.current = {};
    clear();
    setSlashResult(null);
  }, [clear]);

  const handleClose = useCallback(() => {
    clear();
    setSlashResult(null);
  }, [clear]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Keyboard: Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else if (result || slashResult) {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [result, slashResult, handleClose, drawerOpen]);

  const hasChat = messages.length > 0;
  const showInlineChat = hasChat && !drawerOpen;
  const showOutput = !!(result || slashResult || isLoading) && !hasChat;

  const renderBriefCard = (msg: ChatMessage) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-primary">
        <FileText className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Brief Executivo</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
      <button
        onClick={() => navigate("/dashboard/strategy")}
        className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
      >
        Ler brief completo <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );

  const chatThread = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{messages.length} mensagens</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleNewConversation}
          >
            <RotateCcw className="h-3 w-3" />
            Nova conversa
          </Button>
          {drawerOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleCloseDrawer}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-2.5",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/60 text-foreground rounded-bl-md"
            )}>
              {msg.role === 'assistant' ? (
                msg.type === 'brief' ? renderBriefCard(msg) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )
              ) : (
                <p>{msg.content}</p>
              )}
              {/* Items list */}
              {msg.items && msg.items.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border/20 pt-2">
                  {msg.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.link)}
                      className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        {item.subtitle && <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>}
                      </div>
                      {item.value != null && item.value > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">€{item.value.toLocaleString("pt-PT")}</span>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary ml-1 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {/* Quick actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/20">
                  {msg.actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        if (action.type === 'navigate' && action.payload?.link) {
                          navigate(action.payload.link);
                        } else {
                          executeAction(action);
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Suggestion chips */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/20">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-xs px-3 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-primary/80 flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        ref={containerRef}
        className="w-full space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {/* Inline chat (max-height limited, before drawer kicks in) */}
        <AnimatePresence>
          {showInlineChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
            >
              <div className="max-h-[240px] overflow-hidden">
                {chatThread}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div
          className={cn(
            "rounded-2xl p-[1px] transition-all duration-300",
            focused
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
              : "bg-gradient-to-r from-indigo-500/40 to-purple-500/40"
          )}
        >
          <div className="bg-background rounded-2xl">
            <CommandInput
              onSubmit={handleSubmit}
              onSlashCommand={handleSlashCommand}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Legacy output (only when no chat mode) */}
        <AnimatePresence>
          {showOutput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <CommandOutput
                slashResult={slashResult}
                askResult={result}
                onAction={executeAction}
                onItemClick={(item) => navigate(item.link)}
                pendingAction={pendingAction}
                onConfirmAction={confirmPendingAction}
                onCancelAction={cancelPendingAction}
                onConfirmAutomation={confirmAutomation}
                onCancelAutomation={cancelAutomation}
                isConfirmingAutomation={isConfirmingAutomation}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Side drawer for conversation */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={handleCloseDrawer}
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-[90vw] bg-card border-l border-border/50 shadow-2xl flex flex-col"
            >
              {chatThread}
              {/* Input inside drawer */}
              <div className="p-3 border-t border-border/30">
                <div
                  className={cn(
                    "rounded-xl p-[1px] transition-all duration-300",
                    "bg-gradient-to-r from-indigo-500/40 to-purple-500/40"
                  )}
                >
                  <div className="bg-card rounded-xl">
                    <CommandInput
                      onSubmit={handleSubmit}
                      onSlashCommand={handleSlashCommand}
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
