import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CreateSupportTicketInput {
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  whatsapp_message_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  deal_id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  category_id?: string | null;
  priority?: "low" | "medium" | "high" | "critical";
  assigned_to?: string | null;
  ai_summary?: string | null;
  ai_recommendation?: Record<string, unknown> | null;
  ai_intent?: string | null;
  ai_urgency?: string | null;
  ai_draft?: boolean;
  source?: string;
  tags?: string[];
}

export function useSupportCategories() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["support-categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_categories" as any)
        .select("id,name,parent_id,default_priority,active,sort_order")
        .eq("workspace_id", workspaceId!)
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        parent_id: string | null;
        default_priority: string | null;
        active: boolean;
        sort_order: number;
      }>;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateSupportTicketFromConversation() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupportTicketInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "support-create-from-conversation",
        { body: { workspace_id: currentWorkspace.id, ...input } },
      );
      if (error) throw error;
      if (data?.error && !data?.ticket) {
        throw new Error(data.message || data.error);
      }
      return data?.ticket;
    },
    onSuccess: (ticket) => {
      toast.success(
        ticket?.ai_draft
          ? "Rascunho de ticket criado. Confirme para abrir."
          : `Ticket ${ticket?.ticket_number ?? "criado"} com sucesso`,
      );
      queryClient.invalidateQueries({ queryKey: ["client-tickets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-events"] });
    },
    onError: (e: Error) => {
      toast.error(`Erro ao criar ticket: ${e.message}`);
    },
  });
}

export function useTriageTicket() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket_id: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("support-triage-ticket", {
        body: { workspace_id: currentWorkspace.id, ticket_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, ticket_id) => {
      toast.success("Triagem IA concluída");
      queryClient.invalidateQueries({ queryKey: ["client-ticket-detail", ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-events", ticket_id] });
    },
    onError: (e: Error) => {
      toast.error(`Erro na triagem: ${e.message}`);
    },
  });
}

export function useReplyTicketWhatsApp() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { ticket_id: string; message: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("support-reply-whatsapp", {
        body: {
          workspace_id: currentWorkspace.id,
          ticket_id: input.ticket_id,
          message: input.message,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      if (data?.ok) {
        toast.success("Resposta enviada por WhatsApp");
      } else {
        toast.warning(
          `Mensagem registada no ticket, mas envio WhatsApp falhou${data?.error ? `: ${data.error}` : ""}`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["client-ticket-detail", vars.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["client-ticket-messages", vars.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-events", vars.ticket_id] });
    },
    onError: (e: Error) => {
      toast.error(`Erro ao responder: ${e.message}`);
    },
  });
}

export function useSupportTicketEvents(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["support-ticket-events", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_events" as any)
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        event_type: string;
        description: string | null;
        created_at: string;
        created_by: string | null;
        payload: Record<string, unknown>;
      }>;
    },
    enabled: !!ticketId,
  });
}
