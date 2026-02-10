import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalType = "purchase" | "refund" | "upgrade";

export interface ApprovalRequest {
  id: string;
  workspace_id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  total_value: number | null;
  requested_by: string;
  decided_by: string | null;
  decided_at: string | null;
  request_reason: string | null;
  decision_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  requester?: { name: string; email: string };
  decider?: { name: string } | null;
}

export function useClientApprovals() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["client-approvals", clientUser?.company_id],
    queryFn: async () => {
      if (!clientUser?.company_id || !clientUser?.workspace_id) return [];

      const { data, error } = await supabase
        .from("client_approval_requests")
        .select("*")
        .eq("company_id", clientUser.company_id)
        .eq("workspace_id", clientUser.workspace_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch requester/decider names
      const userIds = [
        ...new Set([
          ...data.map((r: any) => r.requested_by),
          ...data.map((r: any) => r.decided_by).filter(Boolean),
        ]),
      ];

      const { data: users } = await supabase
        .from("client_users")
        .select("id, name, email")
        .in("id", userIds);

      const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

      return data.map((r: any) => ({
        ...r,
        requester: usersMap.get(r.requested_by) ?? { name: "Desconhecido", email: "" },
        decider: r.decided_by ? usersMap.get(r.decided_by) ?? null : null,
      })) as ApprovalRequest[];
    },
    enabled: !!clientUser?.company_id,
  });

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  const decideMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      reason,
    }: {
      requestId: string;
      status: "approved" | "rejected";
      reason?: string;
    }) => {
      if (!clientUser?.id) throw new Error("Sem utilizador");

      const { error } = await supabase
        .from("client_approval_requests")
        .update({
          status,
          decided_by: clientUser.id,
          decided_at: new Date().toISOString(),
          decision_reason: reason || null,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-approvals"] });
    },
  });

  const createRequest = useMutation({
    mutationFn: async (params: {
      entityType: string;
      entityId: string;
      approvalType: ApprovalType;
      totalValue?: number;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!clientUser?.id || !clientUser?.company_id || !clientUser?.workspace_id)
        throw new Error("Sem contexto");

      const insertData: any = {
        workspace_id: clientUser.workspace_id,
        company_id: clientUser.company_id,
        entity_type: params.entityType,
        entity_id: params.entityId,
        approval_type: params.approvalType,
        total_value: params.totalValue ?? null,
        request_reason: params.reason ?? null,
        requested_by: clientUser.id,
        metadata: params.metadata ?? {},
      };

      const { error } = await supabase.from("client_approval_requests").insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-approvals"] });
    },
  });

  return {
    approvals,
    pendingCount,
    isLoading,
    decide: decideMutation.mutate,
    isDeciding: decideMutation.isPending,
    createRequest: createRequest.mutate,
    isCreating: createRequest.isPending,
  };
}
