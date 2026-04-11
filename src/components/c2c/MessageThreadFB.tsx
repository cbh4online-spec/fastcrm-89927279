import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ThumbsUp, Smile, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { C2CMessage } from "@/hooks/useC2CMessages";
import { format, type Locale as DateLocale, isToday, isYesterday } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const dateLocales: Record<string, DateLocale> = { pt, en: enUS, es, fr };

interface MessageThreadFBProps {
  messages: C2CMessage[];
  onSend: (content: string) => void;
  isSending?: boolean;
  otherUserName?: string;
  otherUserAvatar?: string | null;
}

function getDateLabel(dateStr: string, locale: DateLocale): string | null {
  const d = new Date(dateStr);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "d 'de' MMMM", { locale });
}

function shouldShowDateSeparator(messages: C2CMessage[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = new Date(messages[idx - 1].created_at).toDateString();
  const curr = new Date(messages[idx].created_at).toDateString();
  return prev !== curr;
}

function shouldShowAvatar(messages: C2CMessage[], idx: number): boolean {
  if (idx === messages.length - 1) return true;
  return messages[idx].sender_id !== messages[idx + 1].sender_id;
}

function isFirstInGroup(messages: C2CMessage[], idx: number): boolean {
  if (idx === 0) return true;
  return messages[idx].sender_id !== messages[idx - 1].sender_id;
}

function isLastInGroup(messages: C2CMessage[], idx: number): boolean {
  if (idx === messages.length - 1) return true;
  return messages[idx].sender_id !== messages[idx + 1].sender_id;
}

export function MessageThreadFB({
  messages,
  onSend,
  isSending,
  otherUserName,
  otherUserAvatar,
}: MessageThreadFBProps) {
  const { t, i18n } = useTranslation("marketplace");
  const { user } = useAuth();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const locale = dateLocales[i18n.language] || pt;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const handleLike = () => {
    onSend("👍");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-xl font-bold">
              {otherUserAvatar ? (
                <img src={otherUserAvatar} className="w-full h-full rounded-full object-cover" />
              ) : (
                (otherUserName || "?").charAt(0).toUpperCase()
              )}
            </div>
            <p className="font-semibold text-gray-900">{otherUserName || "Utilizador"}</p>
            <p className="text-xs text-gray-400">Marketplace · Começa a conversa</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === user?.id;
          const showDate = shouldShowDateSeparator(messages, idx);
          const showAvatar = shouldShowAvatar(messages, idx) && !isOwn;
          const firstInGroup = isFirstInGroup(messages, idx);
          const lastInGroup = isLastInGroup(messages, idx);

          // Bubble border radius logic (Facebook Messenger style)
          const ownRadius = cn(
            "rounded-[18px]",
            !firstInGroup && "rounded-tr-[4px]",
            !lastInGroup && "rounded-br-[4px]"
          );
          const otherRadius = cn(
            "rounded-[18px]",
            !firstInGroup && "rounded-tl-[4px]",
            !lastInGroup && "rounded-bl-[4px]"
          );

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center py-3">
                  <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                    {getDateLabel(msg.created_at, locale)}
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "flex items-end gap-1.5",
                  isOwn ? "justify-end" : "justify-start",
                  firstInGroup ? "mt-3" : "mt-[2px]"
                )}
              >
                {/* Avatar spot */}
                {!isOwn && (
                  <div className="w-7 h-7 shrink-0">
                    {showAvatar ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                        {otherUserAvatar ? (
                          <img src={otherUserAvatar} className="w-full h-full object-cover" />
                        ) : (
                          (otherUserName || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[70%] px-3 py-2 relative",
                    isOwn
                      ? cn("bg-[#09B1BA] text-white", ownRadius)
                      : cn("bg-gray-100 text-gray-900", otherRadius)
                  )}
                >
                  {/* Emoji-only detection */}
                  {msg.content.match(/^[\p{Emoji}\s]{1,5}$/u) ? (
                    <p className="text-3xl leading-tight">{msg.content}</p>
                  ) : (
                    <p className="text-[14px] leading-[1.35] whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Time tooltip on last in group */}
                  {lastInGroup && (
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      isOwn ? "text-white/60 text-right" : "text-gray-400"
                    )}>
                      {format(new Date(msg.created_at), "HH:mm", { locale })}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar (Messenger style) */}
      <div className="border-t border-gray-100 px-2 py-2 flex items-center gap-1.5 bg-white">
        <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors shrink-0">
          <Smile className="h-5 w-5" />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Aa"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isSending}
            className="w-full h-9 px-4 rounded-full bg-gray-100 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#09B1BA]/30 transition-all"
          />
        </div>

        <AnimatePresence mode="wait">
          {text.trim() ? (
            <motion.button
              key="send"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={handleSend}
              disabled={isSending}
              className="p-2 rounded-full text-[#09B1BA] hover:bg-[#09B1BA]/10 transition-colors shrink-0"
            >
              <Send className="h-5 w-5" />
            </motion.button>
          ) : (
            <motion.button
              key="like"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={handleLike}
              className="p-2 rounded-full text-[#09B1BA] hover:bg-[#09B1BA]/10 transition-colors shrink-0"
            >
              <ThumbsUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
