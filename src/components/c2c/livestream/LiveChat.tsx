import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Pin, ShoppingBag } from "lucide-react";
import { useLivestreamMessages, useSendLiveMessage, type LivestreamMessage } from "@/hooks/c2c/useLivestreams";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  livestreamId: string;
  isLive: boolean;
}

export function LiveChat({ livestreamId, isLive }: Props) {
  const [msg, setMsg] = useState("");
  const { data: messages = [] } = useLivestreamMessages(livestreamId);
  const send = useSendLiveMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed || !isLive) return;
    send.mutate({ livestream_id: livestreamId, message: trimmed });
    setMsg("");
  };

  const pinnedMessage = messages.find((m) => m.is_pinned);

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
      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef as any}>
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">
              {isLive ? "Sê o primeiro a comentar! 💬" : "O chat estará disponível quando a live começar."}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      {isLive && (
        <div className="p-3 border-t">
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
        </div>
      )}
    </div>
  );
}

function ChatMessage({ message }: { message: LivestreamMessage }) {
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
        <AvatarFallback className="text-[10px] bg-muted">
          {(message.user_name || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className="text-xs font-semibold text-primary mr-1.5">
          {message.user_name || "Utilizador"}
        </span>
        <span className="text-xs text-foreground break-words">{message.message}</span>
      </div>
    </motion.div>
  );
}
