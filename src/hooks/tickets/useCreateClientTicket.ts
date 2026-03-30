import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface CreateTicketInput {
  subject: string;
  description?: string;
  type: string;
  priority: string;
  client_user_id?: string;
  company_id?: string;
  assigned_to?: string;
  tags?: string[];
  source?: string;
}

export function useCreateClientTicket() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data, error } = await supabase
        .from("client_tickets")
        .insert({
          workspace_id: currentWorkspace!.id,
          subject: input.subject,
          description: input.description || null,
          type: input.type as any,
          priority: input.priority as any,
          client_user_id: input.client_user_id || null,
          company_id: input.company_id || null,
          assigned_to: input.assigned_to || null,
          tags: input.tags || [],
          source: input.source || "manual",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["client-ticket-stats"] });
    },
  });
}
