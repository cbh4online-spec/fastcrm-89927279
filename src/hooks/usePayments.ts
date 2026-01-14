import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface Payment {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  stripe_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export interface CreatePaymentInput {
  opportunity_id: string;
  amount: number;
  currency?: string;
  stripe_payment_id?: string;
  status?: PaymentStatus;
}

export interface UpdatePaymentInput {
  id: string;
  stripe_payment_id?: string;
  status?: PaymentStatus;
}

export function usePayments(filters?: { 
  opportunity_id?: string;
  status?: PaymentStatus;
}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["payments", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("payments")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.opportunity_id) {
        query = query.eq("opportunity_id", filters.opportunity_id);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!currentWorkspace,
  });
}

export function usePayment(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("payments")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Payment | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useOpportunityPayments(opportunityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["payments", "opportunity", opportunityId],
    queryFn: async () => {
      if (!opportunityId || !currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("payments")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!opportunityId && !!currentWorkspace,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await workspaceClient
        .from("payments")
        .insert({
          workspace_id: currentWorkspace.id,
          opportunity_id: input.opportunity_id,
          amount: input.amount,
          currency: input.currency || "EUR",
          stripe_payment_id: input.stripe_payment_id || null,
          status: input.status || "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", "opportunity", data.opportunity_id] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdatePaymentInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["payment", data.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", "opportunity", data.opportunity_id] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", currentWorkspace?.id] });
    },
  });
}

// Calculate total payments for an opportunity
export function useOpportunityPaymentsTotal(opportunityId: string | undefined) {
  const { data: payments } = useOpportunityPayments(opportunityId);

  const total = payments
    ?.filter(p => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const pending = payments
    ?.filter(p => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return { total, pending, payments };
}
