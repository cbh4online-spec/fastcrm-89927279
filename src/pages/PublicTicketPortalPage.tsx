import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Headphones, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

const statusLabels: Record<string, string> = {
  open: "Aberto", in_progress: "Em Progresso", waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno", on_hold: "Em Espera", resolved: "Resolvido", closed: "Fechado",
};
const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  waiting_client: "bg-orange-100 text-orange-800", resolved: "bg-green-100 text-green-800",
  closed: "bg-muted text-muted-foreground",
};

export default function PublicTicketPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadTicket();
  }, [token]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      // 1. Validate token
      const { data: tokenData, error: tokenErr } = await supabase
        .from("ticket_portal_tokens")
        .select("ticket_id, is_active, expires_at")
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (tokenErr || !tokenData) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        setError("Este link expirou.");
        setLoading(false);
        return;
      }

      // 2. Get ticket
      const { data: t } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, description, status, priority, type, created_at")
        .eq("id", tokenData.ticket_id)
        .single();

      if (!t) {
        setError("Ticket não encontrado.");
        setLoading(false);
        return;
      }
      setTicket(t);

      // 3. Get public messages (not internal notes)
      const { data: msgs } = await supabase
        .from("support_ticket_messages")
        .select("id, sender_type, message, content_type, is_internal_note, created_at")
        .eq("ticket_id", t.id)
        .eq("is_internal_note", false)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
    } catch {
      setError("Erro ao carregar ticket.");
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !ticket) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "client",
        message: newMessage.trim(),
        is_internal_note: false,
      });
      if (error) throw error;
      setNewMessage("");
      toast.success("Mensagem enviada");
      await loadTicket();
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">Acesso Restrito</p>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClosed = ["resolved", "closed"].includes(ticket?.status);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Ticket de Suporte</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>#{ticket.ticket_number} — {ticket.subject}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Criado em {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                </p>
              </div>
              <Badge className={statusColors[ticket.status] || "bg-muted"}>
                {statusLabels[ticket.status] || ticket.status}
              </Badge>
            </div>
          </CardHeader>
          {ticket.description && (
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Sem mensagens</p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] rounded-lg p-3 ${
                  msg.sender_type === "client"
                    ? "bg-primary text-primary-foreground"
                    : msg.sender_type === "ai"
                    ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800"
                    : "bg-muted"
                }`}>
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {msg.sender_type === "client" ? "Você" : msg.sender_type === "ai" ? "Assistente IA" : "Agente"}
                  </div>
                  {msg.content_type === "markdown" ? (
                    <MarkdownRenderer content={msg.message} className="text-sm" />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  )}
                  <p className={`text-xs mt-1 opacity-60`}>
                    {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: pt })}
                  </p>
                </div>
              </div>
            ))}

            {!isClosed && (
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva a sua resposta..."
                  rows={2}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon" className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isClosed && (
              <p className="text-center text-muted-foreground text-sm py-4 border-t">
                Este ticket está {statusLabels[ticket.status]?.toLowerCase()}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
