import { useState, useRef, useEffect } from "react";
import { Group, useGroupMessages, useGroupMembers, useSendGroupMessage } from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Send, Users, Package, Pin, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface GroupChatProps {
  group: Group;
  onBack: () => void;
}

export function GroupChat({ group, onBack }: GroupChatProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useGroupMessages(group.id);
  const { data: members } = useGroupMembers(group.id);
  const sendMessage = useSendGroupMessage();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // Subscribe to realtime
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`group-messages-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          // Refetch handled by react-query polling
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [group.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await sendMessage.mutateAsync({
      groupId: group.id,
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-foreground">{group.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs py-0">
                {group.group_type === "telegram" ? "Telegram" : group.group_type === "hybrid" ? "Híbrido" : "Interno"}
              </Badge>
              <span>{members?.length ?? 0} membros</span>
              {group.telegram_chat_id && (
                <Badge variant="secondary" className="text-xs py-0">
                  <Send className="h-3 w-3 mr-1" /> Ligado
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Users className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Membros ({members?.length ?? 0})</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {members?.map((m) => {
                const name = m.profile?.full_name || m.contact?.name || m.telegram_username || "Membro";
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">{m.role}</p>
                    </div>
                    {m.telegram_username && (
                      <Badge variant="outline" className="text-xs">@{m.telegram_username}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">A carregar mensagens...</div>
        ) : !messages?.length ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg mb-1">Sem mensagens ainda</p>
            <p className="text-sm">Escreva a primeira mensagem!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.sender_user_id === user?.id;
              const senderName = msg.profile?.full_name || msg.sender_name || "Desconhecido";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {senderName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>
                    )}
                    {msg.content_type === "product" && msg.product_id && (
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="h-3 w-3" />
                        <span className="text-xs font-medium">Produto partilhado</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: pt })}
                      {msg.telegram_message_id && " • via Telegram"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="border-t p-4 bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
