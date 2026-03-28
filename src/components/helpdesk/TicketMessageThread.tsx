import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Lock, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CannedResponsePicker } from "./CannedResponsePicker";

interface Message {
  id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

interface TicketMessageThreadProps {
  messages: Message[];
  onSend: (message: string, isInternal: boolean) => void;
  isSending?: boolean;
}

export function TicketMessageThread({ messages, onSend, isSending }: TicketMessageThreadProps) {
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), isInternal);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Sem mensagens ainda</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg p-3 max-w-[85%]",
              msg.sender_type === "agent" && !msg.is_internal_note && "ml-auto bg-primary/10 border border-primary/20",
              msg.sender_type === "client" && "mr-auto bg-muted border border-border",
              msg.sender_type === "system" && "mx-auto bg-muted/50 text-muted-foreground text-center text-xs max-w-full",
              msg.is_internal_note && "ml-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {msg.is_internal_note && <Lock className="h-3 w-3 text-amber-600" />}
              <span className="text-xs font-medium capitalize">
                {msg.is_internal_note ? "Nota Interna" : msg.sender_type === "agent" ? "Agente" : msg.sender_type === "client" ? "Cliente" : "Sistema"}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(msg.created_at), "dd MMM HH:mm", { locale: pt })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
          </div>
        ))}
      </div>

      {/* Reply area */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="internal" checked={isInternal} onCheckedChange={setIsInternal} />
            <Label htmlFor="internal" className="text-xs flex items-center gap-1 cursor-pointer">
              <Lock className="h-3 w-3" />
              Nota interna
            </Label>
          </div>
          <CannedResponsePicker onSelect={(content) => setText((prev) => prev + content)} />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? "Escrever nota interna..." : "Escrever resposta..."}
            className={cn(
              "min-h-[80px] resize-none",
              isInternal && "border-amber-300 dark:border-amber-700"
            )}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            size="icon"
            className="h-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
