import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Pin, ShoppingBag, LogIn } from "lucide-react";
import { useLivestreamMessages, useSendLiveMessage, type LivestreamMessage } from "@/hooks/c2c/useLivestreams";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface Props {
  livestreamId: string;
  isLive: boolean;
  startedAt?: string | null;
}

// ---------- Simulated messages ----------

const SIMULATED_NAMES = [
  "Maria S.", "João P.", "Ana R.", "Carlos M.", "Sofia L.",
  "Pedro T.", "Inês C.", "Miguel A.", "Beatriz F.", "Tiago N.",
  "Rita G.", "André V.", "Catarina D.", "Hugo B.", "Marta E.",
];

const SIMULATED_MESSAGES = [
  "😍 Adoro!",
  "Quanto custa?",
  "Que lindo!!",
  "Tem em azul?",
  "Quero comprar! 🛒",
  "Olá! Acabei de entrar",
  "Está disponível?",
  "Boa noite a todos! 👋",
  "Já comprei a semana passada, recomendo!",
  "❤️❤️❤️",
  "Envia para o Porto?",
  "Qual o tamanho?",
  "Fantástico 🔥",
  "Mostra mais perto por favor",
  "Já fiz a encomenda!",
  "Parabéns pela live 👏",
  "Excelente qualidade!",
  "Onde posso ver mais?",
  "Voltei! O que perdi?",
  "Preço amigo? 😄",
  "🎉🎉🎉",
  "Top!",
  "Consigo pagar com MB Way?",
  "Adoro este produto!",
  "Boa! Vou partilhar",
];

const SIMULATED_SYSTEM_MESSAGES = [
  "entrou na live",
  "entrou na live",
  "entrou na live",
  "começou a seguir o vendedor",
  "adicionou ao carrinho 🛒",
];

interface SimulatedMsg {
  id: string;
  user_name: string;
  message: string;
  message_type: "chat" | "system" | "product_highlight";
  created_at: string;
  is_pinned: boolean;
}

// Seeded PRNG — deterministic across all devices for the same livestreamId
function createSeededRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return () => {
    h = h ^ (h >>> 16);
    h = Math.imul(h, 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

function useSimulatedMessages(isLive: boolean, livestreamId: string, startedAt?: string | null) {
  const [simulated, setSimulated] = useState<SimulatedMsg[]>([]);

  useEffect(() => {
    if (!isLive) return;

    // Use started_at as the absolute time anchor so all devices compute the same timeline
    const origin = startedAt ? new Date(startedAt).getTime() : Date.now();
    const SLOT_MS = 3000; // one message every 3 seconds

    const rng = createSeededRng(livestreamId);

    // Pre-generate a deterministic sequence of 200 messages from seed
    const sequence: Omit<SimulatedMsg, "id" | "created_at">[] = [];
    for (let i = 0; i < 200; i++) {
      const isSystem = rng() < 0.2;
      const name = SIMULATED_NAMES[Math.floor(rng() * SIMULATED_NAMES.length)];
      sequence.push({
        user_name: name,
        message: isSystem
          ? `${name} ${SIMULATED_SYSTEM_MESSAGES[Math.floor(rng() * SIMULATED_SYSTEM_MESSAGES.length)]}`
          : SIMULATED_MESSAGES[Math.floor(rng() * SIMULATED_MESSAGES.length)],
        message_type: isSystem ? "system" : "chat",
        is_pinned: false,
      });
    }

    // Compute which slot we're in right now and show all past messages
    const computeMessages = (): SimulatedMsg[] => {
      const elapsed = Date.now() - origin;
      const currentSlot = Math.max(0, Math.floor(elapsed / SLOT_MS));
      const count = Math.min(currentSlot + 1, sequence.length);
      const msgs: SimulatedMsg[] = [];
      for (let i = 0; i < count; i++) {
        msgs.push({
          ...sequence[i],
          id: `sim-${i}`,
          created_at: new Date(origin + i * SLOT_MS).toISOString(),
        });
      }
      // Keep only the last 80
      return msgs.slice(-80);
    };

    setSimulated(computeMessages());

    const interval = setInterval(() => {
      setSimulated(computeMessages());
    }, SLOT_MS);

    return () => clearInterval(interval);
  }, [isLive, livestreamId, startedAt]);

  return simulated;
}

// ---------- Component ----------

export function LiveChat({ livestreamId, isLive, startedAt }: Props) {
  const [msg, setMsg] = useState("");
  const [localMessages, setLocalMessages] = useState<SimulatedMsg[]>([]);
  const { data: dbMessages = [] } = useLivestreamMessages(livestreamId);
  const send = useSendLiveMessage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const simulated = useSimulatedMessages(isLive, livestreamId, startedAt);

  // Track auth state without requiring AuthProvider
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!currentUser;

  // Merge DB messages + simulated + local user messages, sorted by time
  const allMessages: LivestreamMessage[] = [
    ...dbMessages,
    ...simulated.map((s) => ({
      ...s,
      livestream_id: livestreamId,
      user_id: "simulated",
    })),
    ...localMessages.map((s) => ({
      ...s,
      livestream_id: livestreamId,
      user_id: "local",
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      // Auto-scroll only if near bottom
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [allMessages.length]);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed || !isLive) return;

    if (!isAuthenticated) {
      toast.error("Faz login para enviar mensagens no chat");
      return;
    }

    // Add locally for instant feedback
    const localMsg: SimulatedMsg = {
      id: `local-${Date.now()}`,
      user_name: "Tu",
      message: trimmed,
      message_type: "chat",
      created_at: new Date().toISOString(),
      is_pinned: false,
    };
    setLocalMessages((prev) => [...prev, localMsg]);

    // Also persist to DB
    send.mutate({ livestream_id: livestreamId, message: trimmed });
    setMsg("");
  };

  const pinnedMessage = allMessages.find((m) => m.is_pinned);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Pinned message */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-primary/5 border-b flex items-center gap-2 text-xs">
          <Pin className="h-3 w-3 text-primary flex-shrink-0" />
          <span className="font-medium text-foreground truncate">{pinnedMessage.message}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {allMessages.map((m) => (
              <ChatMessage key={m.id} message={m} isLocal={m.user_id === "local"} />
            ))}
          </AnimatePresence>
          {allMessages.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">
              {isLive ? "Sê o primeiro a comentar! 💬" : "O chat estará disponível quando a live começar."}
            </p>
          )}
        </div>
      </div>

      {/* Input */}
      {isLive && (
        <div className="p-3 border-t">
          {isAuthenticated ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <Input
                placeholder="Escreve uma mensagem..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="flex-1 text-sm h-9"
                maxLength={500}
              />
              <Button size="sm" type="submit" disabled={!msg.trim() || send.isPending} className="h-9 w-9 p-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
              <LogIn className="h-4 w-4 flex-shrink-0" />
              <span>Faz login para participar no chat</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ message, isLocal }: { message: LivestreamMessage; isLocal?: boolean }) {
  if (message.message_type === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-[11px] text-muted-foreground py-1"
      >
        {message.message}
      </motion.div>
    );
  }

  if (message.message_type === "product_highlight") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 flex items-center gap-2"
      >
        <ShoppingBag className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-medium text-amber-800 dark:text-amber-200">{message.message}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 group"
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className={`text-[10px] ${isLocal ? "bg-primary/20 text-primary" : "bg-muted"}`}>
          {(message.user_name || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className={`text-xs font-semibold mr-1.5 ${isLocal ? "text-primary" : "text-primary/70"}`}>
          {message.user_name || "Utilizador"}
        </span>
        <span className="text-xs text-foreground break-words">{message.message}</span>
      </div>
    </motion.div>
  );
}
