import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClientTickets, useTicketMessages } from "@/hooks/client-portal/useClientTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, User, Bot, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_client: "bg-orange-100 text-orange-800",
  waiting_internal: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-muted text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const typeLabels: Record<string, string> = {
  support: "Suporte",
  commercial: "Comercial",
  technical: "Técnico",
};

export default function ClientTicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { tickets } = useClientTickets();
  const { messages, isLoading, sendMessage } = useTicketMessages(ticketId);
  const [newMessage, setNewMessage] = useState("");

  const ticket = tickets.find((t) => t.id === ticketId);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage.mutateAsync(newMessage);
      setNewMessage("");
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  };

  if (!ticket) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Ticket não encontrado
      </div>
    );
  }

  const isClosed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate("/client/support")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Suporte
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
              <Badge variant="outline">{typeLabels[ticket.type]}</Badge>
              <Badge variant="outline">{priorityLabels[ticket.priority]}</Badge>
            </div>
          </div>
        </CardHeader>
        {ticket.description && (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Messages timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mensagens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-4">Sem mensagens ainda</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender_type !== "client" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {msg.sender_type === "agent" ? <Bot className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender_type === "client"
                    ? "bg-primary text-primary-foreground"
                    : msg.sender_type === "system"
                    ? "bg-muted text-muted-foreground text-sm italic"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.sender_type === "client" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: pt })}
                </p>
              </div>
              {msg.sender_type === "client" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {!isClosed && (
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                rows={2}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={sendMessage.isPending || !newMessage.trim()}
                size="icon"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isClosed && (
            <p className="text-center text-muted-foreground text-sm py-4 border-t">
              Este ticket está {statusLabels[ticket.status].toLowerCase()}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
