import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePlanActions() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ planId, status }: { planId: string; status: string }) => {
      const { error } = await supabase
        .from("b2b_subscription_plans")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-subscription-plans"] });
    },
  });

  const pause = async (planId: string) => {
    await updateStatus.mutateAsync({ planId, status: "paused" });
    toast.success("Plano pausado");
  };

  const resume = async (planId: string) => {
    await updateStatus.mutateAsync({ planId, status: "active" });
    toast.success("Plano retomado");
  };

  const cancel = async (planId: string) => {
    await updateStatus.mutateAsync({ planId, status: "cancelled" });
    toast.success("Plano cancelado");
  };

  const activate = async (planId: string) => {
    const nextRun = new Date();
    nextRun.setMonth(nextRun.getMonth() + 1);
    const { error } = await supabase
      .from("b2b_subscription_plans")
      .update({ status: "active", next_run_at: nextRun.toISOString(), updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (error) { toast.error("Erro ao ativar"); throw error; }
    queryClient.invalidateQueries({ queryKey: ["b2b-subscription-plans"] });
    toast.success("Plano ativado!");
  };

  return { pause, resume, cancel, activate, updating: updateStatus.isPending };
}
