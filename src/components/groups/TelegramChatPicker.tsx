import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const sb = supabase as any;

interface TelegramChatPickerProps {
  value: string;
  onChange: (chatId: string) => void;
}

export function TelegramChatPicker({ value, onChange }: TelegramChatPickerProps) {
  const [manualMode, setManualMode] = useState(false);

  // Get distinct chat_ids from recent telegram_messages
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["telegram-active-chats"],
    queryFn: async () => {
      // Get distinct chat_ids with latest message info
      const { data } = await sb
        .from("telegram_messages")
        .select("chat_id, from_username, raw_update")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data?.length) return [];

      // Deduplicate by chat_id, prefer group chats (negative IDs)
      const chatMap = new Map<string, { chat_id: number; title: string; type: string }>();
      for (const msg of data) {
        const chatId = msg.chat_id;
        if (chatMap.has(String(chatId))) continue;
        
        const chat = msg.raw_update?.message?.chat;
        chatMap.set(String(chatId), {
          chat_id: chatId,
          title: chat?.title || chat?.first_name || `Chat ${chatId}`,
          type: chat?.type || "unknown",
        });
      }

      // Filter to groups/supergroups (negative chat_ids) primarily
      return Array.from(chatMap.values()).sort((a, b) => {
        // Groups first, then private chats
        if (a.chat_id < 0 && b.chat_id >= 0) return -1;
        if (a.chat_id >= 0 && b.chat_id < 0) return 1;
        return 0;
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  if (manualMode || chats.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Telegram Chat ID</Label>
          {chats.length > 0 && (
            <button onClick={() => setManualMode(false)} className="text-xs text-primary hover:underline">
              Selecionar da lista
            </button>
          )}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: -1001234567890"
        />
        <p className="text-xs text-muted-foreground mt-1">
          ID do grupo Telegram. Adicione o bot ao grupo primeiro.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Grupo Telegram</Label>
        <button onClick={() => setManualMode(true)} className="text-xs text-primary hover:underline">
          Inserir manualmente
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">A carregar chats...</span>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar grupo do bot..." />
          </SelectTrigger>
          <SelectContent>
            {chats.map((chat) => (
              <SelectItem key={chat.chat_id} value={String(chat.chat_id)}>
                <div className="flex items-center gap-2">
                  <span>{chat.title}</span>
                  <span className="text-xs text-muted-foreground">
                    ({chat.type === "supergroup" ? "Supergrupo" : chat.type === "group" ? "Grupo" : "Chat"})
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
