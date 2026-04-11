import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Send, ThumbsUp, Smile, Image as ImageIcon, Phone, Video, Info, Plus } from "lucide-react";
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

function isEmojiOnly(text: string) {
  return /^[\p{Emoji}\u200d\uFE0F\s]{1,8}$/u.test(text.trim());
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
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = dateLocales[i18n.language] || pt;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    inputRef.current?.focus();
  };

  const handleLike = () => {
    onSend("👍");
  };

  const initials = (otherUserName || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header - Messenger style */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white font-bold text-sm">
            {otherUserAvatar ? (
              <img src={otherUserAvatar} className="w-full h-full object-cover" alt="" />
            ) : (
              initials
            )}
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-gray-900 truncate">{otherUserName || "Utilizador"}</p>
          <p className="text-[11px] text-green-600 font-medium">Ativo agora</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors">
            <Phone className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors">
            <Video className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 bg-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {otherUserAvatar ? (
                <img src={otherUserAvatar} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            <p className="font-bold text-lg text-gray-900">{otherUserName || "Utilizador"}</p>
            <p className="text-xs text-gray-400 text-center max-w-[200px]">
              Marketplace · Enviar uma mensagem para iniciar a conversa
            </p>
            <div className="flex gap-2 mt-2">
              {["Olá! 👋", "Ainda disponível?", "Qual o preço?"].map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="px-3 py-1.5 rounded-full border border-[#09B1BA]/30 text-[#09B1BA] text-xs font-medium hover:bg-[#09B1BA]/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === user?.id;
          const showDate = shouldShowDateSeparator(messages, idx);
          const showAvatar = shouldShowAvatar(messages, idx) && !isOwn;
          const firstInGroup = isFirstInGroup(messages, idx);
          const lastInGroup = isLastInGroup(messages, idx);
          const emojiOnly = isEmojiOnly(msg.content);

          // Bubble border radius logic (Facebook Messenger)
          const ownRadius = cn(
            "rounded-[18px]",
            !firstInGroup && "rounded-tr-[5px]",
            !lastInGroup && "rounded-br-[5px]"
          );
          const otherRadius = cn(
            "rounded-[18px]",
            !firstInGroup && "rounded-tl-[5px]",
            !lastInGroup && "rounded-bl-[5px]"
          );

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center py-4">
                  <span className="text-[11px] text-gray-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                    {getDateLabel(msg.created_at, locale)}
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "flex items-end gap-1.5",
                  isOwn ? "justify-end" : "justify-start",
                  firstInGroup ? "mt-3" : "mt-[2px]"
                )}
              >
                {/* Avatar spot */}
                {!isOwn && (
                  <div className="w-7 h-7 shrink-0 mb-0.5">
                    {showAvatar ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#09B1BA] to-[#078E96] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shadow-sm">
                        {otherUserAvatar ? (
                          <img src={otherUserAvatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          initials
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Bubble */}
                {emojiOnly ? (
                  <div className="max-w-[70%] px-1 py-0.5">
                    <p className="text-4xl leading-tight">{msg.content}</p>
                    {lastInGroup && (
                      <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                        {format(new Date(msg.created_at), "HH:mm", { locale })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "max-w-[70%] px-3.5 py-2 relative group/bubble",
                      isOwn
                        ? cn("bg-gradient-to-br from-[#09B1BA] to-[#0AA3AC] text-white", ownRadius)
                        : cn("bg-gray-100 text-gray-900", otherRadius)
                    )}
                  >
                    <p className="text-[14px] leading-[1.38] whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Time - shows on hover or last in group */}
                    {lastInGroup && (
                      <p className={cn(
                        "text-[10px] mt-0.5",
                        isOwn ? "text-white/50 text-right" : "text-gray-400"
                      )}>
                        {format(new Date(msg.created_at), "HH:mm", { locale })}
                        {isOwn && " ✓"}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Seen indicator on last own message */}
              {isOwn && idx === messages.length - 1 && otherUserAvatar && (
                <div className="flex justify-end mt-1 mr-1">
                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden">
                    <img src={otherUserAvatar} className="w-full h-full object-cover" alt="Visto" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar (Messenger style) */}
      <div className="border-t border-gray-100 px-2 py-2 flex items-center gap-1 bg-white">
        <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors shrink-0">
          <Plus className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors shrink-0">
          <ImageIcon className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-[#09B1BA] transition-colors shrink-0">
          <Smile className="h-5 w-5" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Aa"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isSending}
            className="w-full h-9 px-4 rounded-full bg-gray-100 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#09B1BA]/20 transition-all"
          />
        </div>

        <AnimatePresence mode="wait">
          {text.trim() ? (
            <motion.button
              key="send"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
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
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onClick={handleLike}
              className="p-2 rounded-full hover:bg-[#09B1BA]/10 transition-colors shrink-0"
            >
              <span className="text-xl">👍</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
