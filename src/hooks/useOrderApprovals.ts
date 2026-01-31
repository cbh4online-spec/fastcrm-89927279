import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OrderNote, OrderNoteStatus } from "@/types/order-note";
import { toast } from "sonner";

interface ApprovalFilters {
  type?: 'installment' | 'high_value' | 'all';
  search?: string;
}

interface UseOrderApprovalsReturn {
  pendingOrders: OrderNote[];
  loading: boolean;
  error: string | null;
  approveOrder: (orderId: string, notes?: string) => Promise<boolean>;
  rejectOrder: (orderId: string, reason: string) => Promise<boolean>;
  bulkApprove: (orderIds: string[]) => Promise<boolean>;
  refetch: () => void;
}

export function useOrderApprovals(filters?: ApprovalFilters): UseOrderApprovalsReturn {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  // Fetch pending orders awaiting approval
  const { data: pendingOrders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["order-approvals", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("order_notes")
        .select(`
          *,
          client_user:client_users!order_notes_client_user_id_fkey(
            id, name, email, tax_id, phone, credit_limit
          ),
          items:order_note_items(*)
        `)
        .eq("workspace_id", workspaceId)
        .in("status", ["submitted", "awaiting_approval"])
        .order("submitted_at", { ascending: true });

      // Filter by type
      if (filters?.type === 'installment') {
        query = query.eq("installment_requested", true);
      }

      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Post-filter for high value if needed
      let orders = data as unknown as OrderNote[];
      
      if (filters?.type === 'high_value') {
        orders = orders.filter(o => o.total_gross > 1000);
      }

      return orders;
    },
    enabled: !!workspaceId,
  });

  // Approve order mutation
  const approveMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = {
        status: "approved" as OrderNoteStatus,
        approved_at: new Date().toISOString(),
        approved_by: user?.id || null,
      };

      if (notes) {
        // Append to admin notes
        const { data: order } = await supabase
          .from("order_notes")
          .select("admin_notes")
          .eq("id", orderId)
          .single();

        const timestamp = new Date().toLocaleString("pt-PT");
        updateData.admin_notes = order?.admin_notes
          ? `${order.admin_notes}\n\n[${timestamp}] Aprovação: ${notes}`
          : `[${timestamp}] Aprovação: ${notes}`;
      }

      const { error } = await supabase
        .from("order_notes")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Encomenda aprovada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["order-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      queryClient.invalidateQueries({ queryKey: ["order-note"] });
    },
    onError: (error) => {
      toast.error("Erro ao aprovar encomenda: " + error.message);
    },
  });

  // Reject order mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("order_notes")
        .update({
          status: "rejected" as OrderNoteStatus,
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id || null,
          rejection_reason: reason,
        })
        .eq("id", orderId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Encomenda rejeitada");
      queryClient.invalidateQueries({ queryKey: ["order-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      queryClient.invalidateQueries({ queryKey: ["order-note"] });
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar encomenda: " + error.message);
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("order_notes")
        .update({
          status: "approved" as OrderNoteStatus,
          approved_at: new Date().toISOString(),
          approved_by: user?.id || null,
        })
        .in("id", orderIds);

      if (error) throw error;
      return true;
    },
    onSuccess: (_, orderIds) => {
      toast.success(`${orderIds.length} encomendas aprovadas`);
      queryClient.invalidateQueries({ queryKey: ["order-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
    },
    onError: (error) => {
      toast.error("Erro ao aprovar encomendas: " + error.message);
    },
  });

  const approveOrder = async (orderId: string, notes?: string): Promise<boolean> => {
    try {
      await approveMutation.mutateAsync({ orderId, notes });
      return true;
    } catch {
      return false;
    }
  };

  const rejectOrder = async (orderId: string, reason: string): Promise<boolean> => {
    try {
      await rejectMutation.mutateAsync({ orderId, reason });
      return true;
    } catch {
      return false;
    }
  };

  const bulkApprove = async (orderIds: string[]): Promise<boolean> => {
    try {
      await bulkApproveMutation.mutateAsync(orderIds);
      return true;
    } catch {
      return false;
    }
  };

  return {
    pendingOrders,
    loading: isLoading,
    error: error?.message || null,
    approveOrder,
    rejectOrder,
    bulkApprove,
    refetch,
  };
}

// Hook for approval stats widget
export function useApprovalStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["approval-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("order_notes")
        .select("id, status, installment_requested, total_gross")
        .eq("workspace_id", workspaceId)
        .in("status", ["submitted", "awaiting_approval"]);

      if (error) throw error;

      const orders = data || [];
      
      return {
        total: orders.length,
        withInstallments: orders.filter(o => o.installment_requested).length,
        highValue: orders.filter(o => o.total_gross > 1000).length,
        totalValue: orders.reduce((sum, o) => sum + (o.total_gross || 0), 0),
      };
    },
    enabled: !!workspaceId,
  });
}
