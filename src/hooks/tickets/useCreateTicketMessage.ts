import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateMessageInput {
  ticket_id: string;
  sender_type: "client" | "agent" | "system" | "ai";
  sender_id?: string;
  sender_name?: string;
  message: string;
  content_type?: string;
  attachments?: any[];
  is_internal_note?: boolean;
}

export function useCreateTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      const { data, error } = await supabase
        .from("client_ticket_messages")
        .insert({
          ticket_id: input.ticket_id,
          sender_type: input.sender_type,
          sender_id: input.sender_id || null,
          sender_name: input.sender_name || null,
          message: input.message,
          content_type: input.content_type || "text",
          attachments: input.attachments || [],
          is_internal_note: input.is_internal_note || false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-ticket-messages", vars.ticket_id] });
    },
  });
}
