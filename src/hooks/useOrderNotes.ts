import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OrderNote, OrderNoteStatus } from "@/types/order-note";
import { toast } from "sonner";

interface OrderNoteFilters {
  status?: OrderNoteStatus | "all";
  clientUserId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface UseOrderNotesReturn {
  orders: OrderNote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOrderNotes(filters?: OrderNoteFilters): UseOrderNotesReturn {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["order-notes", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("order_notes")
        .select(`
          *,
          client_user:client_users!order_notes_client_user_id_fkey(
            id, name, email, tax_id, phone
          ),
          items:order_note_items(*)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.clientUserId) {
        query = query.eq("client_user_id", filters.clientUserId);
      }

      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as OrderNote[];
    },
    enabled: !!workspaceId,
  });

  return {
    orders,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useOrderNote(orderId: string | undefined) {
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["order-note", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          *,
          client_user:client_users!order_notes_client_user_id_fkey(
            id, name, email, tax_id, phone, billing_address, shipping_address, credit_limit, payment_terms, status, notes
          ),
          items:order_note_items(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data as unknown as OrderNote;
    },
    enabled: !!orderId,
  });

  return {
    order,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useOrderNoteActions() {
  const queryClient = useQueryClient();

  const updateOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("order_notes")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      queryClient.invalidateQueries({ queryKey: ["order-note"] });
      console.log(`[ORDERS] Order note updated: ${vars.orderId}`);
    },
    onError: (error) => {
      console.warn("[ORDERS] ORDER_NOTE_UPDATE_FAILED", error.message);
    },
  });

  const addAdminNote = async (orderId: string, note: string): Promise<boolean> => {
    try {
      // Get current notes
      const { data: order } = await supabase
        .from("order_notes")
        .select("admin_notes")
        .eq("id", orderId)
        .single();

      const timestamp = new Date().toLocaleString("pt-PT");
      const newNote = order?.admin_notes
        ? `${order.admin_notes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

      await updateOrderMutation.mutateAsync({
        orderId,
        updates: { admin_notes: newNote },
      });

      toast.success("Nota adicionada com sucesso");
      return true;
    } catch (error) {
      console.warn("[ORDERS] ADMIN_NOTE_FAILED", (error as Error).message);
      toast.error("Erro ao adicionar nota");
      return false;
    }
  };

  return {
    updateOrder: updateOrderMutation.mutateAsync,
    addAdminNote,
    isUpdating: updateOrderMutation.isPending,
  };
}
