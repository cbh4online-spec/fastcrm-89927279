import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UpdateTicketInput {
  id: string;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  tags?: string[];
  satisfaction_rating?: number;
  satisfaction_comment?: string;
  resolved_at?: string;
  closed_at?: string;
}

export function useUpdateClientTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTicketInput) => {
      const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if (updates.status === "resolved" && !updates.resolved_at) {
        payload.resolved_at = new Date().toISOString();
      }
      if (updates.status === "closed" && !updates.closed_at) {
        payload.closed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("client_tickets")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["client-ticket-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["client-ticket-stats"] });
    },
  });
}
