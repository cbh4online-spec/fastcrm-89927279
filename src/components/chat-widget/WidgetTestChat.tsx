import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, X, RefreshCw, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface WidgetTestChatProps {
  widgetId: string;
  config: {
    primary_color: string;
    secondary_color: string;
    text_color: string;
    welcome_message: string;
    placeholder_text: string;
    company_name: string | null;
    avatar_url: string | null;
    show_branding: boolean;
  };
  onClose: () => void;
}

export function WidgetTestChat({ widgetId, config, onClose }: WidgetTestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [visitorId] = useState(() => `test-${crypto.randomUUID()}`);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      setIsInitializing(true);
      try {
        const { data, error } = await supabase.functions.invoke("chat-widget", {
          body: {
            action: "init",
            widgetId,
            visitorId,
          },
        });

        if (error) throw error;

        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        // Set initial messages from response or use welcome message
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }))
          );
        } else if (config.welcome_message) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: config.welcome_message,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        // Fallback to welcome message
        if (config.welcome_message) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: config.welcome_message,
              timestamp: new Date(),
            },
          ]);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initConversation();
  }, [widgetId, visitorId, config.welcome_message]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-widget", {
        body: {
          action: "send_message",
          widgetId,
          visitorId,
          conversationId,
          message: userMessage.content,
          metadata: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            referrer: window.location.href,
            isTestMode: true,
          },
        },
      });

      if (error) throw error;

      // Store conversation ID for subsequent messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || data.message || "Desculpe, não consegui processar a sua mensagem.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Erro ao enviar mensagem. Por favor, tente novamente.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: config.welcome_message || "Olá! Como posso ajudar?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "600px", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-center justify-between"
          style={{ backgroundColor: config.primary_color }}
        >
          <div className="flex items-center gap-3">
            {config.avatar_url ? (
              <img 
                src={config.avatar_url} 
                alt="Avatar" 
                className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-white text-sm">
                {config.company_name || "Assistente"}
              </p>
              <p className="text-white/80 text-xs flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                Modo de Teste
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={resetChat}
              title="Reiniciar conversa"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea 
          className="flex-1 p-4"
          style={{ backgroundColor: config.secondary_color }}
          ref={scrollRef}
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <div 
                    className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[85%] shadow-sm ${
                    message.role === "user" 
                      ? "rounded-tr-none" 
                      : "rounded-tl-none bg-white"
                  }`}
                  style={
                    message.role === "user"
                      ? { backgroundColor: config.primary_color }
                      : undefined
                  }
                >
                  <p 
                    className="text-sm whitespace-pre-wrap"
                    style={{ 
                      color: message.role === "user" ? "white" : config.text_color 
                    }}
                  >
                    {message.content}
                  </p>
                  <p 
                    className={`text-[10px] mt-1 ${
                      message.role === "user" ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2">
                <div 
                  className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: config.primary_color }}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-lg rounded-tl-none p-3 bg-white shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-white">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isInitializing ? "A inicializar..." : (config.placeholder_text || "Escreva a sua mensagem...")}
              disabled={isLoading || isInitializing || !conversationId}
              className="flex-1 rounded-full"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isInitializing || !conversationId}
              className="rounded-full"
              style={{ backgroundColor: config.primary_color }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {config.show_branding && (
            <p className="text-center text-[10px] text-gray-400 mt-2">
              Powered by FastCRM
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
