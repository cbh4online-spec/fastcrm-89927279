import { type TicketMessageRow } from "@/hooks/tickets/useTicketMessages";
import { type CannedResponse } from "@/hooks/tickets/useTicketCannedResponses";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Send, Bot, Lock, Zap, MessageSquare } from "lucide-react";
import TimeAgo from "react-timeago";
import { cn } from "@/lib/utils";

interface TicketConversationProps {
  messages: TicketMessageRow[];
  isLoading: boolean;
  replyText: string;
  setReplyText: (text: string) => void;
  isInternalNote: boolean;
  setIsInternalNote: (v: boolean) => void;
  onSend: () => void;
  isSending: boolean;
  cannedResponses: CannedResponse[];
}

export function TicketConversation({
  messages,
  isLoading,
  replyText,
  setReplyText,
  isInternalNote,
  setIsInternalNote,
  onSend,
  isSending,
  cannedResponses,
}: TicketConversationProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 1 && "justify-end")}>
            <Skeleton className="h-20 w-[60%] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t p-4 bg-card">
        {/* Toggle bar */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant={isInternalNote ? "outline" : "default"}
            size="sm"
            className="text-xs h-7"
            onClick={() => setIsInternalNote(false)}
          >
            <Send className="h-3 w-3 mr-1" />
            Resposta
          </Button>
          <Button
            variant={isInternalNote ? "default" : "outline"}
            size="sm"
            className={cn("text-xs h-7", isInternalNote && "bg-amber-600 hover:bg-amber-700")}
            onClick={() => setIsInternalNote(true)}
          >
            <Lock className="h-3 w-3 mr-1" />
            Nota interna
          </Button>
          {cannedResponses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto">
                  <Zap className="h-3 w-3 mr-1" />
                  Respostas rápidas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-60 overflow-auto">
                {cannedResponses.map((cr) => (
                  <DropdownMenuItem key={cr.id} onClick={() => setReplyText(cr.content)}>
                    <span className="text-sm">{cr.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className={cn(
          "rounded-lg border p-2 transition-colors",
          isInternalNote ? "border-amber-500/50 bg-amber-500/5" : "border-border"
        )}>
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternalNote ? "Escrever nota interna..." : "Escrever resposta..."}
            rows={3}
            className="border-0 focus-visible:ring-0 resize-none p-0 bg-transparent"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">⌘+Enter para enviar</span>
            <Button
              size="sm"
              onClick={onSend}
              disabled={isSending || !replyText.trim()}
              className={cn(isInternalNote && "bg-amber-600 hover:bg-amber-700")}
            >
              {isSending ? "A enviar..." : isInternalNote ? "Guardar nota" : "Enviar"}
              <Send className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: TicketMessageRow }) {
  const isAgent = message.sender_type === "agent";
  const isSystem = message.sender_type === "system";
  const isAI = message.sender_type === "ai";
  const isInternal = message.is_internal_note;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{message.message}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isAgent && "justify-end")}>
      {!isAgent && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn(
            "text-xs",
            isAI ? "bg-purple-500/15 text-purple-400" : "bg-muted text-muted-foreground"
          )}>
            {isAI ? <Bot className="h-4 w-4" /> : (message.sender_name?.[0]?.toUpperCase() || "C")}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "max-w-[70%] rounded-xl px-4 py-2.5",
        isInternal && "bg-amber-500/10 border border-amber-500/20",
        !isInternal && isAgent && "bg-primary/10 border border-primary/20",
        !isInternal && !isAgent && isAI && "bg-purple-500/10 border border-purple-500/20",
        !isInternal && !isAgent && !isAI && "bg-muted",
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">{message.sender_name || (isAgent ? "Agente" : "Cliente")}</span>
          {isAI && <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-400">IA</Badge>}
          {isInternal && <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400">Nota interna</Badge>}
          <span className="text-[10px] text-muted-foreground ml-auto"><TimeAgo date={message.created_at} /></span>
        </div>
        {message.content_type === "markdown" ? (
          <MarkdownRenderer content={message.message} className="text-sm" />
        ) : (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{message.message}</p>
        )}
      </div>
      {isAgent && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-xs">
            {message.sender_name?.[0]?.toUpperCase() || "A"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
