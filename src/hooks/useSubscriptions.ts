import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  Subscription,
  SubscriptionItem,
  SubscriptionBillingRecord,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateSubscriptionItemInput,
  CreateBillingRecordInput,
  SubscriptionStatus,
  BillingRecordStatus,
} from "@/types/subscription";

// =====================================================
// SUBSCRIPTIONS QUERIES
// =====================================================

export function useSubscriptions(filters?: {
  status?: SubscriptionStatus;
  contact_id?: string;
  company_id?: string;
}) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["subscriptions", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      let query = workspaceClient
        .from("subscriptions")
        .select(`
          *,
          contact:contacts(id, name, email),
          company:companies(id, name),
          lead:leads(id, name, email),
          opportunity:opportunities(id, title, value)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.company_id) {
        query = query.eq("company_id", filters.company_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

export function useSubscription(id: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["subscription", id],
    queryFn: async () => {
      if (!workspaceClient || !id) return null;

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .select(`
          *,
          contact:contacts(id, name, email),
          company:companies(id, name),
          lead:leads(id, name, email),
          opportunity:opportunities(id, title, value)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    enabled: !!workspaceClient && !!id,
  });
}

export function useActiveSubscriptions() {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["subscriptions", currentWorkspace?.id, "active"],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .select(`
          *,
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("next_billing_date", { ascending: true });

      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

// =====================================================
// SUBSCRIPTIONS MUTATIONS
// =====================================================

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSubscriptionInput) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { items, ...subscriptionData } = input;

      // Create subscription
      const { data: subscription, error } = await workspaceClient
        .from("subscriptions")
        .insert({
          ...subscriptionData,
          workspace_id: currentWorkspace.id,
          created_by: user?.id,
          status: input.status || "draft",
          currency: input.currency || "EUR",
          payment_method: input.payment_method || "bank_transfer",
          auto_renew: input.auto_renew ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Create items if provided
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          ...item,
          subscription_id: subscription.id,
          workspace_id: currentWorkspace.id,
        }));

        const { error: itemsError } = await workspaceClient
          .from("subscription_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Error creating subscription items:", itemsError);
        }
      }

      return subscription as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscrição criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating subscription:", error);
      toast.error("Erro ao criar subscrição");
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateSubscriptionInput) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { id, ...updateData } = input;

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription", data.id] });
      toast.success("Subscrição atualizada");
    },
    onError: (error) => {
      console.error("Error updating subscription:", error);
      toast.error("Erro ao atualizar subscrição");
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { error } = await workspaceClient
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", currentWorkspace?.id] });
      toast.success("Subscrição eliminada");
    },
    onError: (error) => {
      console.error("Error deleting subscription:", error);
      toast.error("Erro ao eliminar subscrição");
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["subscription", data.id] });
      toast.success("Subscrição cancelada");
    },
    onError: (error) => {
      console.error("Error cancelling subscription:", error);
      toast.error("Erro ao cancelar subscrição");
    },
  });
}

export function useActivateSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .update({
          status: "active",
          cancelled_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["subscription", data.id] });
      toast.success("Subscrição ativada");
    },
    onError: (error) => {
      console.error("Error activating subscription:", error);
      toast.error("Erro ao ativar subscrição");
    },
  });
}

// =====================================================
// SUBSCRIPTION ITEMS
// =====================================================

export function useSubscriptionItems(subscriptionId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["subscription-items", subscriptionId],
    queryFn: async () => {
      if (!workspaceClient || !subscriptionId) return [];

      const { data, error } = await workspaceClient
        .from("subscription_items")
        .select(`
          *,
          product:products(id, name)
        `)
        .eq("subscription_id", subscriptionId)
        .order("created_at");

      if (error) throw error;
      return data as SubscriptionItem[];
    },
    enabled: !!workspaceClient && !!subscriptionId,
  });
}

export function useAddSubscriptionItem() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      item,
    }: {
      subscriptionId: string;
      item: CreateSubscriptionItemInput;
    }) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscription_items")
        .insert({
          ...item,
          subscription_id: subscriptionId,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-items", variables.subscriptionId],
      });
      toast.success("Item adicionado");
    },
    onError: (error) => {
      console.error("Error adding subscription item:", error);
      toast.error("Erro ao adicionar item");
    },
  });
}

export function useRemoveSubscriptionItem() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      itemId,
      subscriptionId,
    }: {
      itemId: string;
      subscriptionId: string;
    }) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { error } = await workspaceClient
        .from("subscription_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subscription-items", variables.subscriptionId],
      });
      toast.success("Item removido");
    },
    onError: (error) => {
      console.error("Error removing subscription item:", error);
      toast.error("Erro ao remover item");
    },
  });
}

// =====================================================
// BILLING RECORDS
// =====================================================

export function useBillingRecords(filters?: {
  subscription_id?: string;
  status?: BillingRecordStatus;
}) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["billing-records", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      let query = workspaceClient
        .from("subscription_billing_records")
        .select(`
          *,
          subscription:subscriptions(id, name, contact_id, company_id)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("period_start", { ascending: false });

      if (filters?.subscription_id) {
        query = query.eq("subscription_id", filters.subscription_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubscriptionBillingRecord[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

export function useSubscriptionBillingRecords(subscriptionId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["billing-records", "subscription", subscriptionId],
    queryFn: async () => {
      if (!workspaceClient || !subscriptionId) return [];

      const { data, error } = await workspaceClient
        .from("subscription_billing_records")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("period_start", { ascending: false });

      if (error) throw error;
      return data as SubscriptionBillingRecord[];
    },
    enabled: !!workspaceClient && !!subscriptionId,
  });
}

export function useCreateBillingRecord() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateBillingRecordInput) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscription_billing_records")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          event_type: input.event_type || "payment",
          status: input.status || "pending",
          currency: input.currency || "EUR",
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionBillingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing-records"] });
      queryClient.invalidateQueries({
        queryKey: ["billing-records", "subscription", data.subscription_id],
      });
      toast.success("Registo de cobrança criado");
    },
    onError: (error) => {
      console.error("Error creating billing record:", error);
      toast.error("Erro ao criar registo de cobrança");
    },
  });
}

export function useMarkBillingRecordPaid() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceClient) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscription_billing_records")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionBillingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing-records", currentWorkspace?.id] });
      queryClient.invalidateQueries({
        queryKey: ["billing-records", "subscription", data.subscription_id],
      });
      toast.success("Pagamento registado");
    },
    onError: (error) => {
      console.error("Error marking billing record paid:", error);
      toast.error("Erro ao registar pagamento");
    },
  });
}

// =====================================================
// CONVERT OPPORTUNITY TO SUBSCRIPTION
// =====================================================

export function useConvertOpportunityToSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      opportunityId,
      subscriptionData,
    }: {
      opportunityId: string;
      subscriptionData: Omit<CreateSubscriptionInput, "opportunity_id">;
    }) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      // Get opportunity details
      const { data: opportunity, error: oppError } = await workspaceClient
        .from("opportunities")
        .select("*, lead:leads(id, name, email, contact_id)")
        .eq("id", opportunityId)
        .single();

      if (oppError) throw oppError;

      // Create subscription linked to opportunity
      const { data: subscription, error } = await workspaceClient
        .from("subscriptions")
        .insert({
          ...subscriptionData,
          workspace_id: currentWorkspace.id,
          opportunity_id: opportunityId,
          lead_id: opportunity.lead_id,
          created_by: user?.id,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // Update opportunity status to won
      await workspaceClient
        .from("opportunities")
        .update({ status: "won" })
        .eq("id", opportunityId);

      return subscription as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade convertida em subscrição");
    },
    onError: (error) => {
      console.error("Error converting opportunity:", error);
      toast.error("Erro ao converter oportunidade");
    },
  });
}
