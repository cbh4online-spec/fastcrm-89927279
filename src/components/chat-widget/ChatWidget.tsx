import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetConfig {
  id: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  position: "bottom-right" | "bottom-left";
  bubble_icon: string;
  welcome_message: string;
  placeholder_text: string;
  show_branding: boolean;
  avatar_url?: string;
  company_name?: string;
  require_email_before_chat: boolean;
  auto_open_delay_ms: number;
  custom_css?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface ChatWidgetProps {
  widgetId: string;
  supabaseUrl: string;
}

// Generate or retrieve visitor ID
function getVisitorId(): string {
  const key = "fastcrm_visitor_id";
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
}

export function ChatWidget({ widgetId, supabaseUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getVisitorId());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch widget config on mount
  useEffect(() => {
    fetchConfig();
  }, [widgetId]);

  // Auto-open after delay
  useEffect(() => {
    if (config?.auto_open_delay_ms && config.auto_open_delay_ms > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, config.auto_open_delay_ms);
      return () => clearTimeout(timer);
    }
  }, [config]);

  // Initialize conversation when widget opens
  useEffect(() => {
    if (isOpen && !conversationId && config) {
      initConversation();
    }
  }, [isOpen, conversationId, config]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-widget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_config",
          widgetId,
          visitorId: visitorId.current,
        }),
      });

      if (!response.ok) throw new Error("Failed to load widget");

      const data = await response.json();
      setConfig(data.config);
    } catch (err) {
      console.error("[ChatWidget] Config error:", err);
      setError("Widget não disponível");
    } finally {
      setIsLoading(false);
    }
  };

  const initConversation = async () => {
    if (!config) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-widget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init",
          widgetId,
          visitorId: visitorId.current,
        }),
      });

      if (!response.ok) throw new Error("Failed to initialize chat");

      const data = await response.json();
      setConversationId(data.conversationId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("[ChatWidget] Init error:", err);
      setError("Erro ao iniciar conversa");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !conversationId || isSending) return;

    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-widget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          widgetId,
          visitorId: visitorId.current,
          conversationId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error("[ChatWidget] Send error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, conversationId, isSending, widgetId, supabaseUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (error) return null;
  if (!config) return null;

  const positionClasses = config.position === "bottom-left" 
    ? "left-4" 
    : "right-4";

  return (
    <>
      {/* Inject custom CSS */}
      {config.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: config.custom_css }} />
      )}

      {/* Chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-4 z-50 rounded-full p-4 shadow-lg transition-all hover:scale-110",
            positionClasses
          )}
          style={{ backgroundColor: config.primary_color }}
          aria-label="Abrir chat"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-4 z-50 flex h-[500px] w-[360px] flex-col rounded-2xl shadow-2xl",
            positionClasses
          )}
          style={{ backgroundColor: config.secondary_color }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between rounded-t-2xl px-4 py-3"
            style={{ backgroundColor: config.primary_color }}
          >
            <div className="flex items-center gap-3">
              {config.avatar_url ? (
                <img
                  src={config.avatar_url}
                  alt="Avatar"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <p className="font-semibold text-white">
                  {config.company_name || "Assistente"}
                </p>
                <p className="text-xs text-white/80">Online agora</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
              aria-label="Fechar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "ml-auto rounded-br-sm"
                      : "mr-auto rounded-bl-sm"
                  )}
                  style={{
                    backgroundColor:
                      msg.role === "user" ? config.primary_color : "white",
                    color: msg.role === "user" ? "white" : config.text_color,
                  }}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isSending && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">A escrever...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white p-3 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={config.placeholder_text}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary"
                style={{ color: config.text_color }}
                disabled={isSending}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isSending}
                className="rounded-full p-2 transition-colors disabled:opacity-50"
                style={{ backgroundColor: config.primary_color }}
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
            {config.show_branding && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Powered by <span className="font-medium">FastCRM</span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ChatWidget;
