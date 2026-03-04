import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePayouts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-payouts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_payouts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useMyPayouts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-my-payouts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("c2c_payouts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useExecutePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, payoutId, workspaceId }: { action: string; payoutId: string; workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("marketplace-payout-execute", {
        body: { action, payout_id: payoutId, workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["c2c-payouts", v.workspaceId] });
      toast.success("Payout atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProcessPayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketplace-process-payouts", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-payouts"] });
      toast.success("Payouts processados");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExportPayoutsCSV() {
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { data, error } = await supabase.functions.invoke("marketplace-payout-execute", {
        body: { action: "export_csv", workspace_id: workspaceId },
      });
      if (error) throw error;
      // Download CSV
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payouts.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
