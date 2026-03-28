import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LeaveRequest {
  id: string;
  workspace_id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export function useLeaveRequests() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["leave-requests", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!wsId,
  });

  const createRequest = useMutation({
    mutationFn: async (input: { leave_type: string; start_date: string; end_date: string; days_count: number; reason?: string }) => {
      const { error } = await supabase.from("leave_requests").insert({
        workspace_id: wsId!,
        user_id: user!.id,
        leave_type: input.leave_type as any,
        start_date: input.start_date,
        end_date: input.end_date,
        days_count: input.days_count,
        reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido de ausência criado");
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: () => toast.error("Erro ao criar pedido"),
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: "approved" | "rejected"; review_notes?: string }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(), review_notes: review_notes ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: () => toast.error("Erro ao atualizar pedido"),
  });

  return { requests, isLoading, createRequest, reviewRequest };
}
