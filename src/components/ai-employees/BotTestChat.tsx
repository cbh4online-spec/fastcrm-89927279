import { useState, useRef, useEffect } from "react";
import { Bot } from "@/hooks/useBots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Bot as BotIcon, User, Trash2, Bug } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  debug?: Record<string, unknown>;
  timestamp: Date;
}

interface BotTestChatProps {
  bot: Bot;
}

export function BotTestChat({ bot }: BotTestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ai-employee-executor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            bot_id: bot.id,
            workspace_id: bot.workspace_id,
            message: text,
            dry_run: true,
            conversation_history: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      const result: any = await response.json();

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply || result.message || result.error || "Sem resposta",
        debug: result.debug || { actions: result.actions, side_effects: result.side_effects },
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Erro: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BotIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{bot.name}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-500/30 bg-amber-500/10">
              Modo Teste (dry_run)
            </Badge>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowDebug(!showDebug)}
            title="Toggle debug info"
          >
            <Bug className={`h-3.5 w-3.5 ${showDebug ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat} title="Limpar chat">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <BotIcon className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Envia uma mensagem para testar o bot</p>
            <p className="text-xs text-muted-foreground/60 mt-1">As respostas são geradas em modo dry_run — sem efeitos reais</p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BotIcon className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[75%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/60 border border-border/40 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {showDebug && msg.debug && Object.keys(msg.debug).length > 0 && (
                  <pre className="text-[10px] bg-muted/30 border border-border/30 rounded p-2 max-h-32 overflow-auto text-muted-foreground">
                    {JSON.stringify(msg.debug, null, 2)}
                  </pre>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BotIcon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="rounded-xl px-3.5 py-2.5 bg-muted/60 border border-border/40 rounded-bl-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/60 px-4 py-3">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escreve uma mensagem de teste..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
