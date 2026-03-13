import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export function useCheckoutFunnels() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const funnels = useQuery({
    queryKey: ["checkout-funnels", wid],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_funnels").select("*").eq("workspace_id", wid).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });

  const createFunnel = useMutation({
    mutationFn: async (payload: { name: string; slug: string; description?: string }) => {
      const { data, error } = await sb.from("checkout_funnels").insert({ ...payload, workspace_id: wid }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-funnels", wid] }); toast.success("Funil criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFunnel = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; slug?: string; description?: string; is_active?: boolean; settings?: any }) => {
      const { data, error } = await sb.from("checkout_funnels").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-funnels", wid] }); toast.success("Funil atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("checkout_funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-funnels", wid] }); toast.success("Funil eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { funnels, createFunnel, updateFunnel, deleteFunnel };
}

export function useCheckoutFunnelSteps(funnelId?: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const steps = useQuery({
    queryKey: ["checkout-funnel-steps", funnelId],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_funnel_steps").select("*, offer:checkout_offers(*)").eq("funnel_id", funnelId).order("step_order");
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });

  const upsertStep = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("checkout_funnel_steps").upsert({ ...payload, workspace_id: wid }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkout-funnel-steps", funnelId] }),
  });

  return { steps, upsertStep };
}
