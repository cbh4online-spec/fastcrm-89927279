import { useState, useRef, useEffect } from "react";
import { Group, useGroupMessages, useGroupMembers, useSendGroupMessage } from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Send, Users, Package, UserPlus, MoreVertical, UserMinus, AlertTriangle, Link2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AddMemberDialog } from "./AddMemberDialog";
import { ProductPickerButton } from "./ProductPickerButton";
import { ProductMessageCard } from "./ProductMessageCard";
import { TelegramChatPicker } from "./TelegramChatPicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const sb = supabase as any;

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
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [linkTelegramOpen, setLinkTelegramOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const needsTelegramLink = (group.group_type === "telegram" || group.group_type === "hybrid") && !group.telegram_chat_id;

  const linkTelegram = useMutation({
    mutationFn: async () => {
      if (!telegramChatId.trim()) throw new Error("Chat ID é obrigatório");
      const { error } = await sb.from("groups").update({ telegram_chat_id: parseInt(telegramChatId) }).eq("id", group.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Telegram ligado com sucesso!");
      setLinkTelegramOpen(false);
      // Update the group object in parent
      group.telegram_chat_id = parseInt(telegramChatId);
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${group.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["group-messages", group.id] });
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [group.id, qc]);

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await sb.from("group_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-members", group.id] });
      toast.success("Membro removido");
    },
  });

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await sendMessage.mutateAsync({ groupId: group.id, content });
  };

  const handleSendProduct = async (product: { id: string; name: string; price: number }) => {
    await sendMessage.mutateAsync({
      groupId: group.id,
      content: `🏷️ ${product.name} — €${product.price.toFixed(2)}`,
      contentType: "product",
      productId: product.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const existingMemberIds = new Set(
    members?.map((m) => m.user_id || m.contact_id || "").filter(Boolean) || []
  );

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
              <SheetTitle className="flex items-center justify-between">
                <span>Membros ({members?.length ?? 0})</span>
                <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {members?.map((m) => {
                const name = m.profile?.full_name || m.contact?.name || m.telegram_username || "Membro";
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 px-1 group/member rounded-md hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{name[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs py-0">{m.role || "member"}</Badge>
                        {m.telegram_username && (
                          <span className="text-xs text-muted-foreground">@{m.telegram_username}</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/member:opacity-100">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => removeMember.mutate(m.id)}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4 mr-2" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Telegram not linked warning */}
      {needsTelegramLink && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400 flex-1">
            Este grupo não está ligado ao Telegram. As mensagens não serão enviadas.
          </p>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => setLinkTelegramOpen(true)}>
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Ligar Telegram
          </Button>
        </div>
      )}

      {/* Link Telegram Dialog */}
      <Dialog open={linkTelegramOpen} onOpenChange={setLinkTelegramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ligar Grupo ao Telegram</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TelegramChatPicker value={telegramChatId} onChange={setTelegramChatId} />
            <Button
              onClick={() => linkTelegram.mutate()}
              disabled={!telegramChatId.trim() || linkTelegram.isPending}
              className="w-full"
            >
              {linkTelegram.isPending ? "A ligar..." : "Ligar ao Telegram"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">{senderName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!isMe && <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>}
                    {msg.content_type === "product" && msg.product_id && (
                      <ProductMessageCard productId={msg.product_id} isMe={isMe} />
                    )}
                    {msg.content_type !== "product" && (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
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
          <ProductPickerButton onSelect={handleSendProduct} disabled={sendMessage.isPending} />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sendMessage.isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        groupId={group.id}
        existingMemberIds={existingMemberIds}
      />
    </div>
  );
}
