import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface TicketExpense {
  id: string;
  ticket_id: string;
  workspace_id: string;
  user_id: string;
  expense_type: "deslocacao" | "material" | "licenca" | "outro";
  description: string | null;
  amount: number;
  currency: string;
  created_at: string;
  agent_name?: string | null;
}

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  deslocacao: "Deslocação",
  material: "Material",
  licenca: "Licença",
  outro: "Outro",
};

export function useTicketExpenses(ticketId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["ticket-expenses", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_expenses")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      }

      return (data || []).map((e: any) => ({
        ...e,
        agent_name: profileMap.get(e.user_id) || null,
      })) as TicketExpense[];
    },
    enabled: !!ticketId,
  });

  const addExpense = useMutation({
    mutationFn: async (input: {
      expense_type: string;
      description?: string;
      amount: number;
    }) => {
      if (!ticketId || !workspaceId) throw new Error("Missing context");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("support_ticket_expenses")
        .insert({
          ticket_id: ticketId,
          workspace_id: workspaceId,
          user_id: user!.id,
          expense_type: input.expense_type as any,
          description: input.description || null,
          amount: input.amount,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-expenses", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_ticket_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-expenses", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    },
  });

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return { expenses, isLoading, addExpense, deleteExpense, totalExpenses };
}
