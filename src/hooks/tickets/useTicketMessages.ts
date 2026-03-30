import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface TicketMessageRow {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  content_type: string | null;
  attachments: any;
  is_internal_note: boolean | null;
  created_at: string;
}

export function useTicketMessages(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["client-ticket-messages", ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  return useQuery({
    queryKey: ["client-ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TicketMessageRow[];
    },
    enabled: !!ticketId,
  });
}
