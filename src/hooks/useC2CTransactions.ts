import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export function useC2CTransactions(filters?: { status?: string; sellerId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["c2c-transactions", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("c2c_transactions")
        .select("*, c2c_listings(title, photos, price)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("c2c_transactions")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-transactions"] });
      toast.success("Transação atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { transactions, isLoading, updateTransaction };
}

export function useC2CDisputes() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["c2c-disputes", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_disputes")
        .select("*, c2c_transactions(listing_id, buyer_email, amount_total)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createDispute = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from("c2c_disputes")
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-disputes"] });
      toast.success("Disputa criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ id, resolution, status }: { id: string; resolution: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("c2c_disputes")
        .update({
          resolution,
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-disputes"] });
      toast.success("Disputa resolvida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { disputes, isLoading, createDispute, resolveDispute };
}
