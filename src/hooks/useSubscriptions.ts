import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionStatus,
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
          opportunity:opportunities(id, title, value),
          plan:products(id, name)
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
      return (data || []) as Subscription[];
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
          opportunity:opportunities(id, title, value),
          plan:products(id, name)
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
        .order("next_payment_date", { ascending: true });

      if (error) throw error;
      return (data || []) as Subscription[];
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

  return useMutation({
    mutationFn: async (input: CreateSubscriptionInput) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          status: input.status || "active",
          provider: input.provider || "manual",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscrição criada com sucesso");
      console.info('[B2B-FINANCE] SUBSCRIPTION_CREATED', data.id);
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: 'B2B.SUBSCRIPTION_CREATED',
        entity_kind: 'subscription',
        entity_id: data.id,
        source_module: 'b2b-finance',
        payload: { contact_id: data.contact_id, company_id: data.company_id, mrr_amount: data.mrr_amount },
      });
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_CREATE_FAILED", error.message);
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
      console.info('[B2B-FINANCE] SUBSCRIPTION_UPDATED', data.id);
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_UPDATE_FAILED", error.message);
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
      console.info('[B2B-FINANCE] SUBSCRIPTION_DELETED');
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_DELETE_FAILED", error.message);
      toast.error("Erro ao eliminar subscrição");
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!workspaceClient || !currentWorkspace) {
        throw new Error("Workspace not available");
      }

      const { data, error } = await workspaceClient
        .from("subscriptions")
        .update({
          status: "cancelled" as const,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Create subscription event for cancellation
      await workspaceClient.from("subscription_events").insert({
        subscription_id: id,
        workspace_id: currentWorkspace.id,
        event_type: "canceled",
        occurred_at: new Date().toISOString(),
        notes: reason ? `Motivo: ${reason}` : "Subscrição cancelada manualmente",
        currency: "EUR",
      });

      return data as Subscription;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["subscription", data.id] });
      queryClient.invalidateQueries({ queryKey: ["subscription-events", data.id] });
      toast.success("Subscrição cancelada");
      console.info('[B2B-FINANCE] SUBSCRIPTION_CANCELLED', data.id);
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: 'B2B.SUBSCRIPTION_CANCELLED',
        entity_kind: 'subscription',
        entity_id: data.id,
        source_module: 'b2b-finance',
        payload: { reason: variables.reason },
      });
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_CANCEL_FAILED", error.message);
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
          canceled_at: null,
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
      console.info('[B2B-FINANCE] SUBSCRIPTION_ACTIVATED', data.id);
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: 'B2B.SUBSCRIPTION_ACTIVATED',
        entity_kind: 'subscription',
        entity_id: data.id,
        source_module: 'b2b-finance',
      });
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_ACTIVATE_FAILED", error.message);
      toast.error("Erro ao ativar subscrição");
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
        .select("*, lead:leads(id, name, email)")
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade convertida em subscrição");
      console.info('[B2B-FINANCE] SUBSCRIPTION_CONVERTED', data.id, 'from opportunity', variables.opportunityId);
      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: 'B2B.SUBSCRIPTION_CONVERTED',
        entity_kind: 'subscription',
        entity_id: data.id,
        source_module: 'b2b-finance',
        payload: { opportunity_id: variables.opportunityId },
      });
    },
    onError: (error) => {
      console.error("[B2B-FINANCE] SUBSCRIPTION_CONVERT_FAILED", error.message);
      toast.error("Erro ao converter oportunidade");
    },
  });
}
