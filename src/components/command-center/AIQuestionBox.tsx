import { useState, useEffect, useRef, useCallback } from "react";
import { CommandInput } from "./CommandInput";
import { CommandOutput } from "./CommandOutput";
import { useAskFastCRM } from "@/hooks/useAskFastCRM";
import { useSlashCommands, SlashCommand, SlashCommandResult } from "@/hooks/useSlashCommands";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { detectIntent, getConversationalResponse, ConversationalResponse } from "@/lib/conversationalIntent";
import { MessageSquare, RotateCcw, Bot, User as UserIcon } from "lucide-react";
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
}

export function AIQuestionBox() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [slashResult, setSlashResult] = useState<SlashCommandResult | null>(null);
  const [focused, setFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // When ask-fastcrm result comes in, add it to chat
  useEffect(() => {
    if (result) {
      const headline = result.answer?.headline || result.header || 'Resultado';
      const subtext = result.answer?.subtext || '';
      const content = subtext ? `**${headline}**\n\n${subtext}` : `**${headline}**`;
      
      setMessages(prev => {
        // Avoid duplicates
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg?.content === content) return prev;
        return [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: new Date(),
        }];
      });
    }
  }, [result]);

  const handleSubmit = useCallback((query: string) => {
    setSlashResult(null);
    
    // Add user message to chat
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Check conversational intent
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

    // Business query — call ask-fastcrm
    ask(query);
  }, [ask, userName]);

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
    clear();
    setSlashResult(null);
  }, [clear]);

  const handleClose = useCallback(() => {
    clear();
    setSlashResult(null);
  }, [clear]);

  // Keyboard: Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (result || slashResult)) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [result, slashResult, handleClose]);

  const hasChat = messages.length > 0;
  const showOutput = !!(result || slashResult || isLoading) && !hasChat;

  return (
    <motion.div
      ref={containerRef}
      className="w-full space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {/* Chat thread */}
      <AnimatePresence>
        {hasChat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{messages.length} mensagens</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleNewConversation}
              >
                <RotateCcw className="h-3 w-3" />
                Nova conversa
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
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
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    {/* Suggestion buttons */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/20">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(s)}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
  );
}
