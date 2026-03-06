import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type { ClientUser, ClientUserStatus, UpdateClientUserData } from "@/types/client-user";
import { toast } from "sonner";

interface ClientUserFilters {
  status?: ClientUserStatus | "all";
  search?: string;
}

export function useClientUsers(filters?: ClientUserFilters) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: clients = [], isLoading, error, refetch } = useQuery({
    queryKey: ["client-users", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("client_users")
        .select(`
          *,
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ClientUser[];
    },
    enabled: !!workspaceId,
  });

  return {
    clients,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useClientUser(clientId: string | undefined) {
  const { data: client, isLoading, error, refetch } = useQuery({
    queryKey: ["client-user", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("client_users")
        .select(`
          *,
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;
      return data as ClientUser;
    },
    enabled: !!clientId,
  });

  return {
    client,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useClientUserActions() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const updateClientMutation = useMutation({
    mutationFn: async ({
      clientId,
      updates,
    }: {
      clientId: string;
      updates: UpdateClientUserData;
    }) => {
      const { error } = await supabase
        .from("client_users")
        .update({
          ...updates,
          billing_address: updates.billing_address ? JSON.parse(JSON.stringify(updates.billing_address)) : undefined,
          shipping_address: updates.shipping_address ? JSON.parse(JSON.stringify(updates.shipping_address)) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-users"] });
      queryClient.invalidateQueries({ queryKey: ["client-user"] });
      toast.success("Cliente atualizado com sucesso");
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] CLIENT_UPDATE_FAILED", error.message);
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });

  const toggleStatus = async (clientId: string, currentStatus: ClientUserStatus): Promise<boolean> => {
    const newStatus: ClientUserStatus = currentStatus === "active" ? "suspended" : "active";
    
    try {
      await updateClientMutation.mutateAsync({
        clientId,
        updates: { status: newStatus },
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateCreditLimit = async (clientId: string, creditLimit: number): Promise<boolean> => {
    try {
      await updateClientMutation.mutateAsync({
        clientId,
        updates: { credit_limit: creditLimit },
      });
      console.info('[B2B-FINANCE] CREDIT_LIMIT_UPDATED', clientId, creditLimit);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'B2B.LIMIT_REACHED',
          entity_kind: 'client_user',
          entity_id: clientId,
          source_module: 'b2b-finance',
          payload: { credit_limit: creditLimit },
        });
      }
      return true;
    } catch (error) {
      console.error('[B2B-FINANCE] CREDIT_LIMIT_UPDATE_FAILED', clientId, error);
      return false;
    }
  };

  return {
    updateClient: updateClientMutation.mutateAsync,
    toggleStatus,
    updateCreditLimit,
    isUpdating: updateClientMutation.isPending,
  };
}

// Get orders for a specific client
export function useClientOrders(clientUserId: string | undefined) {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["client-user-orders", clientUserId],
    queryFn: async () => {
      if (!clientUserId) return [];

      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          id,
          order_number,
          status,
          total_gross,
          created_at,
          submitted_at
        `)
        .eq("client_user_id", clientUserId)
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientUserId,
  });

  return {
    orders,
    loading: isLoading,
    error: error?.message || null,
  };
}
