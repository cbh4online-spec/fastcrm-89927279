import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Demo recommendation for UI preview
const DEMO_RECOMMENDATION: AIFunnelRecommendation = {
  vertical: "Educação Online",
  pageTemplate: "Masterclass de Conversão",
  captureType: "masterclass",
  objective: "Vender curso online",
  headline: "Descubra Como Transformar a Sua Prática Terapêutica",
  subheadline: "Masterclass gratuita com estratégias comprovadas para terapeutas que querem escalar",
  ctaPrimary: "Inscrever-me na Masterclass",
  ctaSecondary: "Saber mais",
  funnelSteps: [
    { name: "Landing Page", type: "page", description: "Página de captura com promessa e CTA" },
    { name: "Inscrição", type: "optin", description: "Formulário de registo para a masterclass" },
    { name: "Obrigado", type: "thankyou", description: "Confirmação + instruções de acesso" },
    { name: "Masterclass", type: "page", description: "Página de conteúdo + oferta" },
    { name: "Checkout", type: "checkout", description: "Página de compra do curso" },
  ],
  routing: { pipeline: "Vendas Online", tags: ["masterclass", "terapeutas"], sla: "24h" },
  automations: [
    { trigger: "registration", action: "Enviar email de confirmação", channel: "email" },
    { trigger: "registration", action: "Lembrete 24h antes", channel: "email" },
    { trigger: "registration", action: "Lembrete 1h antes", channel: "whatsapp" },
    { trigger: "attend_live", action: "Enviar replay", channel: "email" },
    { trigger: "no_purchase_48h", action: "Sequência de urgência", channel: "email" },
  ],
  tracking: ["PageView", "Registration", "Attend_Live", "Replay_View", "Offer_Click", "Purchase"],
  kpis: ["Taxa de registo", "Show-up rate", "Replay views", "Conversão para venda", "Receita total"],
  slug: "masterclass-terapeutas",
  domain: "masterclass.cliente.pt",
  thankYou: "Redirect para página de obrigado com countdown para a masterclass",
  seo: {
    title: "Masterclass Gratuita para Terapeutas | Transforme a Sua Prática",
    description: "Inscreva-se na masterclass gratuita e descubra estratégias comprovadas para escalar a sua prática terapêutica com cursos online.",
  },
  reasoning: "Recomendado porque o objectivo é vender um curso online. A masterclass é o formato ideal para educar antes da venda, especialmente com ticket médio. O tráfego virá de Meta Ads, logo a landing page precisa de ser altamente optimizada para conversão.",
};

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

    // Simulate AI response (will be replaced with real AI call in Phase 4)
    setTimeout(() => {
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Analisei o teu briefing: **"${msg}"**\n\nAqui está a minha recomendação:\n\n🎯 **Vertical:** ${DEMO_RECOMMENDATION.vertical}\n📄 **Template:** ${DEMO_RECOMMENDATION.pageTemplate}\n🎣 **Captura:** ${DEMO_RECOMMENDATION.captureType}\n\n**Headline sugerida:** "${DEMO_RECOMMENDATION.headline}"\n\n**Estrutura do funil:**\n${DEMO_RECOMMENDATION.funnelSteps.map((s, i) => `${i + 1}. ${s.name} (${s.type})`).join("\n")}\n\n**Automações sugeridas:** ${DEMO_RECOMMENDATION.automations.length} automações configuradas\n\n**Raciocínio:** ${DEMO_RECOMMENDATION.reasoning}\n\nO resumo completo está no painel lateral. Clica em **"Gerar Funil"** para criar.`,
        recommendation: DEMO_RECOMMENDATION,
      };
      setMessages((prev) => [...prev, aiMsg]);
      onRecommendation(DEMO_RECOMMENDATION);
      setIsLoading(false);
    }, 1500);
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
                  className={`rounded-xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}
                >
                  {msg.content}
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
