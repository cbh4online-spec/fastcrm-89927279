import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";

export type TicketType = "support" | "commercial" | "technical";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_client" | "waiting_internal" | "resolved" | "closed";

export interface ClientTicket {
  id: string;
  company_id: string | null;
  client_user_id: string;
  workspace_id: string;
  type: TicketType;
  priority: TicketPriority;
  subject: string;
  description: string | null;
  status: TicketStatus;
  sla_deadline: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "client" | "agent" | "system";
  sender_id: string | null;
  message: string;
  attachments: any;
  created_at: string;
}

export function useClientTickets() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser, loading: authLoading } = useClientAuth({ workspaceId });
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["client-tickets", clientUser?.id],
    queryFn: async () => {
      if (!clientUser?.company_id) return [];

      const { data, error } = await supabase
        .from("client_tickets")
        .select("*")
        .eq("company_id", clientUser.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tickets:", error);
        return [];
      }
      return (data || []) as ClientTicket[];
    },
    enabled: !!clientUser?.company_id,
  });

  const createTicket = useMutation({
    mutationFn: async (input: {
      subject: string;
      description?: string;
      type: TicketType;
      priority: TicketPriority;
    }) => {
      if (!clientUser) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("client_tickets")
        .insert({
          subject: input.subject,
          description: input.description || null,
          type: input.type as any,
          priority: input.priority as any,
          client_user_id: clientUser.id,
          company_id: clientUser.company_id,
          workspace_id: clientUser.workspace_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
    },
  });

  const openCount = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status)
  ).length;

  const isLoading = authLoading || ticketsLoading;

  return { tickets, isLoading, createTicket, openCount };
}

export function useTicketMessages(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("client_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
      return (data || []) as TicketMessage[];
    },
    enabled: !!ticketId,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!ticketId || !clientUser) throw new Error("Missing context");

      const { error } = await supabase
        .from("client_ticket_messages")
        .insert({
          ticket_id: ticketId,
          sender_type: "client",
          sender_id: clientUser.id,
          message,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
    },
  });

  return { messages, isLoading, sendMessage };
}
