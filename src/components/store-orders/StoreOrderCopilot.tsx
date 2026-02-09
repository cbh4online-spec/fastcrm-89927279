import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  "Resumo desta encomenda",
  "Sugerir próxima ação",
  "Sugerir upsell para este cliente",
  "Rascunho de email para o cliente",
];

export function StoreOrderCopilot({ order }: { order: Record<string, unknown> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = {
        order_number: order.order_number,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        total: order.total,
        items: order.items,
        created_at: order.created_at,
        paid_at: order.paid_at,
        shipped_at: order.shipped_at,
        notes: order.notes,
      };

      const { data, error } = await supabase.functions.invoke("ai-copilot", {
        body: {
          prompt: text,
          context: `Contexto da encomenda: ${JSON.stringify(context)}`,
          systemPrompt: `Eres um assistente de gestão de encomendas (OMS Copilot) para o FastCRM. Responde em português de Portugal, de forma concisa e profissional. Analisa os dados da encomenda e fornece insights, sugestões de ação, ou rascunhos de comunicação conforme pedido. Foca-te em eficiência operacional, satisfação do cliente e oportunidades de upsell/cross-sell.`,
        },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        role: "assistant",
        content: data?.response || data?.text || "Sem resposta disponível.",
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Erro: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Copilot de Encomenda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Pergunte algo sobre esta encomenda:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => sendMessage(action)}
                  disabled={loading}
                >
                  <Sparkles className="h-3 w-3" />
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <ScrollArea className="max-h-64">
            <div className="space-y-3 pr-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-8"
                      : "bg-muted text-foreground mr-4"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="h-3 w-3 animate-spin" /> A pensar...
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva uma pergunta..."
            rows={1}
            className="min-h-[36px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
