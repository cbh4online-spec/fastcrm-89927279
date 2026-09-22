import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Package,
  ShoppingBag,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useStoreCartSafe } from "@/contexts/StoreCartContext";
import { toast } from "sonner";

interface StoreAIAdvisorProps {
  workspaceId: string;
  workspaceSlug: string;
  productContext?: { name: string; category?: string };
}

interface AdvisorProduct {
  id: string;
  name: string;
  slug?: string;
  sku?: string | null;
  price: number;
  currency?: string;
  image?: string | null;
  available?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: AdvisorProduct[];
}

export function StoreAIAdvisor({ workspaceId, workspaceSlug, productContext }: StoreAIAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const cart = useStoreCartSafe();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddToCart = (product: AdvisorProduct) => {
    if (!cart || product.available === false) return;
    cart.addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency || "EUR",
        image: product.image || undefined,
        sku: product.sku || undefined,
      },
      1,
    );
    setAddedIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
    toast.success(`${product.name} adicionado ao carrinho`);
  };


  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (overrideInput?: string) => {
    const messageText = (overrideInput || input).trim();
    if (!messageText || isLoading || messageCount >= 10) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    try {
      const { data, error } = await supabase.functions.invoke("store-ai-advisor", {
        body: {
          question: userMsg.content,
          workspaceId,
          productContext: productContext || undefined,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) {
        let status: number | undefined;
        let payload: { error?: string } | null = null;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx === "object" && "status" in ctx) {
          status = ctx.status;
          try {
            payload = await ctx.clone().json();
          } catch {
            payload = null;
          }
        }
        if (status === 402 || payload?.error === "quota_exceeded") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "O assistente está temporariamente indisponível por limite de utilização. Entretanto pode contactar-nos diretamente que respondemos de imediato.",
            },
          ]);
          return;
        }
        if (status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Muitos pedidos ao mesmo tempo. Aguarde alguns segundos e tente novamente.",
            },
          ]);
          return;
        }
        throw error;
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || "Desculpe, não consegui processar o pedido.",
        products: data.products || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <Button
              size="lg"
              className="rounded-full h-14 gap-2 shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <Sparkles className="h-5 w-5" />
              Precisa de ajuda?
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Consultor IA</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <Bot className="h-10 w-10 mx-auto text-primary/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Olá! Sou o consultor IA desta loja. Posso ajudá-lo a escolher o produto certo.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {["Qual o melhor produto para mim?", "O que preciso para começar?"].map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => sendMessage(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="space-y-2 max-w-[85%]">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {/* Produtos recomendados — preços e disponibilidade vindos da loja */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="space-y-1.5">
                          {msg.products.map((p) => (
                            <div
                              key={p.id}
                              className="rounded-lg border bg-card overflow-hidden"
                            >
                              <Link
                                to={`/store/${workspaceSlug}/product/${p.slug || p.id}`}
                                className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors"
                              >
                                {p.image ? (
                                  <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground/30" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{p.name}</p>
                                  <p className="text-xs font-bold text-primary">
                                    {p.price.toLocaleString("pt-PT", {
                                      style: "currency",
                                      currency: p.currency || "EUR",
                                    })}
                                  </p>
                                </div>
                              </Link>
                              {cart && (
                                <div className="px-2 pb-2">
                                  {p.available === false ? (
                                    <p className="text-[11px] text-muted-foreground">Sem stock de momento</p>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant={addedIds.includes(p.id) ? "outline" : "default"}
                                      className="w-full h-7 text-xs gap-1.5"
                                      onClick={() => handleAddToCart(p)}
                                    >
                                      {addedIds.includes(p.id) ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" /> No carrinho
                                        </>
                                      ) : (
                                        <>
                                          <ShoppingBag className="h-3.5 w-3.5" /> Adicionar ao carrinho
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                    {msg.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t px-3 py-2.5">
              {messageCount >= 10 ? (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Limite de mensagens atingido. Recarregue a página para reiniciar.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    placeholder="Escreva a sua pergunta..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 h-9 text-sm"
                    disabled={isLoading}
                  />
                  <Button size="icon" className="h-9 w-9" type="submit" disabled={!input.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
