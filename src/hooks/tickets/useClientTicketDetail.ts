import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClientTicketDetail(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["client-ticket-detail", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tickets")
        .select("*")
        .eq("id", ticketId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}
