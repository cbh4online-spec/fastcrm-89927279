import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ShippingZone {
  id: string;
  shipping_method_id: string;
  workspace_id: string;
  name: string;
  countries: string[];
  weight_rules: Array<{ min_weight: number; max_weight: number; price: number }>;
  flat_price: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface ShippingMethod {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  base_price: number;
  free_shipping_threshold: number | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  shipping_zones?: ShippingZone[];
}

export function useShippingMethods() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["shipping-methods", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*, shipping_zones(*)")
        .eq("workspace_id", currentWorkspace.id)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as ShippingMethod[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useActiveShippingMethods(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["shipping-methods-active", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*, shipping_zones(*)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as ShippingMethod[];
    },
    enabled: !!workspaceId,
  });
}

export function useSaveShippingMethod() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (method: Partial<ShippingMethod> & { id?: string }) => {
      const payload = {
        workspace_id: currentWorkspace!.id,
        name: method.name!,
        description: method.description || null,
        is_active: method.is_active ?? true,
        base_price: method.base_price ?? 0,
        free_shipping_threshold: method.free_shipping_threshold ?? null,
        estimated_delivery: method.estimated_delivery || null,
        sort_order: method.sort_order ?? 0,
      };

      if (method.id) {
        const { error } = await supabase
          .from("shipping_methods")
          .update(payload)
          .eq("id", method.id);
        if (error) throw error;
        return method.id;
      } else {
        const { data, error } = await supabase
          .from("shipping_methods")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.success("Método de envio guardado");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.success("Método de envio removido");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useSaveShippingZone() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (zone: Partial<ShippingZone> & { shipping_method_id: string; id?: string }) => {
      const payload = {
        workspace_id: currentWorkspace!.id,
        shipping_method_id: zone.shipping_method_id,
        name: zone.name!,
        countries: zone.countries || [],
        weight_rules: (zone.weight_rules || []) as unknown as null,
        flat_price: zone.flat_price ?? null,
        is_active: zone.is_active ?? true,
        sort_order: zone.sort_order ?? 0,
      };

      if (zone.id) {
        const { error } = await supabase.from("shipping_zones").update(payload).eq("id", zone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shipping_zones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.success("Zona de envio guardada");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.success("Zona removida");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

// Calculate shipping cost for a given country and weight
export function calculateShippingCost(
  method: ShippingMethod,
  country: string,
  totalWeight: number,
  orderSubtotal: number
): number {
  // Check free shipping threshold
  if (method.free_shipping_threshold && orderSubtotal >= method.free_shipping_threshold) {
    return 0;
  }

  const zones = method.shipping_zones || [];
  // Find matching zone by country
  const matchingZone = zones.find(
    (z) => z.is_active && z.countries.includes(country)
  );

  if (!matchingZone) {
    return method.base_price;
  }

  // If flat price, use it
  if (matchingZone.flat_price !== null) {
    return matchingZone.flat_price;
  }

  // Weight-based pricing
  const rules = matchingZone.weight_rules || [];
  if (rules.length === 0) return method.base_price;

  const matchingRule = rules.find(
    (r) => totalWeight >= r.min_weight && totalWeight <= r.max_weight
  );

  return matchingRule ? matchingRule.price : method.base_price;
}
