import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ClientTicketRow {
  id: string;
  workspace_id: string;
  ticket_number: string | null;
  subject: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  client_user_id: string;
  company_id: string | null;
  tags: string[];
  source: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  type?: string;
  assigned_to?: string;
  search?: string;
}

export function useClientTicketsAdmin(filters?: TicketFilters) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["client-tickets-admin", workspaceId, filters],
    queryFn: async () => {
      let query = supabase
        .from("client_tickets")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status as any);
      if (filters?.priority) query = query.eq("priority", filters.priority as any);
      if (filters?.type) query = query.eq("type", filters.type as any);
      if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ClientTicketRow[];
    },
    enabled: !!workspaceId,
  });
}
