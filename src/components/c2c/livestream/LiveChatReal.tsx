import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, LogIn } from "lucide-react";
import { useLiveChatMessages, useSendLiveChatMessage, type LiveChatMessage } from "@/hooks/c2c/useLiveSessions";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Props {
  sessionId: string;
  isLive: boolean;
}

export function LiveChatReal({ sessionId, isLive }: Props) {
  const [msg, setMsg] = useState("");
  const { data: messages = [] } = useLiveChatMessages(sessionId);
  const send = useSendLiveChatMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!currentUser;

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed || !isLive) return;
    if (!isAuthenticated) {
      toast.error("Faz login para enviar mensagens no chat");
      return;
    }
    send.mutate({ live_session_id: sessionId, message: trimmed });
    setMsg("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={scrollRef}>
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {messages.map((m) => (
              <ChatMsg key={m.id} message={m} isMe={m.user_id === currentUser?.id} />
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">
              {isLive ? "Sê o primeiro a comentar! 💬" : "O chat estará disponível quando a live começar."}
            </p>
          )}
        </div>
      </div>

      {isLive && (
        <div className="p-3 border-t">
          {isAuthenticated ? (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
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

function ChatMsg({ message, isMe }: { message: LiveChatMessage; isMe?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 group"
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className={`text-[10px] ${isMe ? "bg-primary/20 text-primary" : "bg-muted"}`}>
          {(message.user_name || "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <span className={`text-xs font-semibold mr-1.5 ${isMe ? "text-primary" : "text-primary/70"}`}>
          {isMe ? "Tu" : (message.user_name || "Utilizador")}
        </span>
        <span className="text-xs text-foreground break-words">{message.message}</span>
      </div>
    </motion.div>
  );
}
