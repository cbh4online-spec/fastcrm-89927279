import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useHelpdeskTickets, useHelpdeskTicketMessages } from "@/hooks/useHelpdeskTickets";
import { useHelpdeskHistory } from "@/hooks/useHelpdeskHistory";
import { TicketMessageThread } from "@/components/helpdesk/TicketMessageThread";
import { TicketSidebar } from "@/components/helpdesk/TicketSidebar";
import { TicketActivityTimeline } from "@/components/helpdesk/TicketActivityTimeline";
import { TicketRelatedList } from "@/components/helpdesk/TicketRelatedList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Headphones, MessageSquare, History, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function HelpdeskTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, isLoading: ticketsLoading, updateTicket } = useHelpdeskTickets();
  const { messages, isLoading: messagesLoading, sendMessage } = useHelpdeskTicketMessages(id);
  const { addHistory } = useHelpdeskHistory(id);

  const ticket = tickets.find((t) => t.id === id);

  if (ticketsLoading) {
    return (
      <DashboardLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Ticket não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/helpdesk/tickets")}>
          Voltar à lista
        </Button>
      </div>
    );
  }

  const handleUpdate = (updates: any) => {
    // Track changes for audit log
    const changedFields = Object.keys(updates);
    changedFields.forEach((field) => {
      if (field !== "updated_at" && (ticket as any)[field] !== updates[field]) {
        addHistory.mutate({
          ticket_id: ticket.id,
          workspace_id: ticket.workspace_id,
          field_changed: field,
          old_value: String((ticket as any)[field] ?? ""),
          new_value: String(updates[field] ?? ""),
        });
      }
    });

    updateTicket.mutate(
      { id: ticket.id, ...updates },
      {
        onSuccess: () => toast.success("Ticket atualizado"),
        onError: () => toast.error("Erro ao atualizar ticket"),
      }
    );
  };

  const handleSend = (message: string, isInternal: boolean) => {
    sendMessage.mutate(
      { message, is_internal_note: isInternal },
      {
        onError: () => toast.error("Erro ao enviar mensagem"),
      }
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/helpdesk/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Headphones className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-lg truncate">
            #{ticket.ticket_number} — {ticket.subject}
          </h1>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main — tabbed content */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          <Tabs defaultValue="conversation" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2 w-fit">
              <TabsTrigger value="conversation" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Conversação
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Atividade
              </TabsTrigger>
              <TabsTrigger value="related" className="gap-1.5 text-xs">
                <Link2 className="h-3.5 w-3.5" />
                Relacionados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversation" className="flex-1 flex flex-col mt-0 overflow-hidden">
              <TicketMessageThread
                messages={messages as any}
                onSend={handleSend}
                isSending={sendMessage.isPending}
                ticketId={ticket.id}
              />
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-y-auto mt-0">
              <TicketActivityTimeline ticketId={ticket.id} />
            </TabsContent>

            <TabsContent value="related" className="flex-1 overflow-y-auto mt-0">
              <TicketRelatedList currentTicket={ticket} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-72 lg:w-80 overflow-y-auto bg-muted/20">
          <TicketSidebar ticket={ticket} onUpdate={handleUpdate} />
        </div>
      </div>
    </div>
  );
}
