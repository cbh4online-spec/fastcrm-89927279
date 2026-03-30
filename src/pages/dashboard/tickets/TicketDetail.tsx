import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClientTicketDetail } from "@/hooks/tickets/useClientTicketDetail";
import { useTicketMessages, type TicketMessageRow } from "@/hooks/tickets/useTicketMessages";
import { useCreateTicketMessage } from "@/hooks/tickets/useCreateTicketMessage";
import { useUpdateClientTicket } from "@/hooks/tickets/useUpdateClientTicket";
import { useTicketCannedResponses } from "@/hooks/tickets/useTicketCannedResponses";
import { TicketConversation } from "@/components/tickets/TicketConversation";
import { TicketDetailSidebar } from "@/components/tickets/TicketDetailSidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageSquare, Activity, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading: ticketLoading } = useClientTicketDetail(id);
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(id);
  const createMessage = useCreateTicketMessage();
  const updateTicket = useUpdateClientTicket();
  const { responses: cannedResponses } = useTicketCannedResponses();

  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !id) return;

    const { data: { user } } = await supabase.auth.getUser();

    try {
      await createMessage.mutateAsync({
        ticket_id: id,
        sender_type: "agent",
        sender_id: user?.id,
        sender_name: user?.email?.split("@")[0] || "Agente",
        message: replyText,
        content_type: "text",
        is_internal_note: isInternalNote,
      });
      setReplyText("");
      toast.success(isInternalNote ? "Nota interna adicionada" : "Resposta enviada");
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleUpdateTicket = async (updates: Record<string, any>) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({ id, ...updates });
      toast.success("Ticket atualizado");
    } catch {
      toast.error("Erro ao atualizar ticket");
    }
  };

  if (ticketLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-[1fr_350px] gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-muted-foreground">Ticket não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/tickets")}>Voltar à lista</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{(ticket as any).ticket_number || "—"}</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground truncate">{(ticket as any).subject}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Left: Conversation */}
        <div className="flex flex-col overflow-hidden border-r">
          <Tabs defaultValue="conversation" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-4 mt-3 w-fit">
              <TabsTrigger value="conversation" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Conversação
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Atividade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversation" className="flex-1 flex flex-col overflow-hidden m-0 mt-2">
              <TicketConversation
                messages={messages}
                isLoading={messagesLoading}
                replyText={replyText}
                setReplyText={setReplyText}
                isInternalNote={isInternalNote}
                setIsInternalNote={setIsInternalNote}
                onSend={handleSendMessage}
                isSending={createMessage.isPending}
                cannedResponses={cannedResponses}
              />
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-auto p-4 m-0 mt-2">
              <div className="text-sm text-muted-foreground text-center py-12">
                <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>Histórico de atividade em desenvolvimento</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Sidebar */}
        <TicketDetailSidebar
          ticket={ticket as any}
          onUpdate={handleUpdateTicket}
        />
      </div>
    </motion.div>
  );
}
