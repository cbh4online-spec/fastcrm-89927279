import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { AIFunnelRecommendation } from "./AIFunnelBuilder";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendation?: AIFunnelRecommendation;
}

const QUICK_PROMPTS = [
  "Vender curso online para terapeutas",
  "Gerar leads para clínicas dentárias",
  "Captar por quiz e vender por masterclass",
  "Criar funil para mentoria 1:1",
  "Criar funil para recrutamento",
  "Funil com CTA para WhatsApp",
];

interface Props {
  onRecommendation: (rec: AIFunnelRecommendation) => void;
}

export function AIFunnelChat({ onRecommendation }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! 👋 Sou o assistente de funis do FastCRM.\n\nDescreve-me o que queres vender ou promover e eu construo o funil ideal para ti.\n\nPodes ser específico — por exemplo:\n- \"Quero vender um curso online para terapeutas\"\n- \"Quero captar leads com um quiz\"\n- \"Quero um funil para clínicas com CTA para WhatsApp\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for AI
      const conversationMessages = [...messages.filter(m => m.id !== "welcome"), userMsg]
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("ai-funnel-builder", {
        body: { messages: conversationMessages, mode: "chat" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rec = data.recommendation as AIFunnelRecommendation;

      const summaryContent = `Analisei o teu briefing e aqui está a minha recomendação:\n\n🎯 **Vertical:** ${rec.vertical}\n📄 **Template:** ${rec.pageTemplate}\n🎣 **Captura:** ${rec.captureType}\n\n**Headline sugerida:** "${rec.headline}"\n\n**Estrutura do funil:**\n${rec.funnelSteps.map((s, i) => `${i + 1}. ${s.name} (${s.type})`).join("\n")}\n\n**Automações sugeridas:** ${rec.automations.length} automações configuradas\n\n**Raciocínio:** ${rec.reasoning}\n\nO resumo completo está no painel lateral. Clica em **"Gerar Funil"** para criar.`;

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: summaryContent,
        recommendation: rec,
      };

      setMessages((prev) => [...prev, aiMsg]);
      onRecommendation(rec);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao gerar recomendação";
      toast.error(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ Ocorreu um erro: ${errorMessage}\n\nTenta novamente ou reformula o teu pedido.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-0">
        {/* Quick prompts */}
        <div className="p-4 border-b border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Prompts rápidos:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <Badge
                key={prompt}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors text-xs"
                onClick={() => handleSend(prompt)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {prompt}
              </Badge>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-4 py-3 max-w-[80%] text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreve o que queres vender ou promover..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
