import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export function useCheckoutOrderBumps(funnelId?: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;
  const key = ["checkout-order-bumps", funnelId];

  const bumps = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await sb
        .from("checkout_order_bumps")
        .select("*, offer:checkout_offers(*)")
        .eq("funnel_id", funnelId)
        .order("display_order");
      if (!error) return data ?? [];

      // Fallback sem embed (ex.: relação em falta na cache do esquema)
      const { data: rows, error: rowsError } = await sb
        .from("checkout_order_bumps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("display_order");
      if (rowsError) throw rowsError;

      const offerIds = [...new Set((rows ?? []).map((r: any) => r.offer_id).filter(Boolean))];
      let offersById: Record<string, any> = {};
      if (offerIds.length) {
        const { data: offers } = await sb.from("checkout_offers").select("*").in("id", offerIds);
        offersById = Object.fromEntries((offers ?? []).map((o: any) => [o.id, o]));
      }
      return (rows ?? []).map((r: any) => ({ ...r, offer: r.offer_id ? offersById[r.offer_id] ?? null : null }));
    },
    enabled: !!funnelId,
  });


  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addBump = useMutation({
    mutationFn: async ({ offerId, displayOrder }: { offerId: string; displayOrder: number }) => {
      const { data, error } = await sb
        .from("checkout_order_bumps")
        .insert({ workspace_id: wid, funnel_id: funnelId, offer_id: offerId, display_order: displayOrder })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Order bump associado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBump = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; is_active?: boolean; display_order?: number; position?: string }) => {
      const { error } = await sb.from("checkout_order_bumps").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBump = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("checkout_order_bumps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Order bump removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { bumps, addBump, updateBump, removeBump };
}
