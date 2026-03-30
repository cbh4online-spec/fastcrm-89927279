import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  workspace_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export function useHelpdeskHistory(ticketId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["helpdesk-history", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for changed_by
      const userIds = [...new Set((data || []).map((h: any) => h.changed_by).filter(Boolean))];
      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      }

      return (data || []).map((h: any) => ({
        ...h,
        profile: profileMap.get(h.changed_by) || null,
      })) as TicketHistoryEntry[];
    },
    enabled: !!ticketId,
  });

  const addHistory = useMutation({
    mutationFn: async (input: {
      ticket_id: string;
      workspace_id: string;
      field_changed: string;
      old_value?: string | null;
      new_value?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("support_ticket_history")
        .insert({
          ticket_id: input.ticket_id,
          workspace_id: input.workspace_id,
          field_changed: input.field_changed,
          old_value: input.old_value || null,
          new_value: input.new_value || null,
          changed_by: user?.id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-history", ticketId] });
    },
  });

  return { history, isLoading, addHistory };
}
