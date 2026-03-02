import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlatformPricingConfig {
  id: string;
  config_type: string;
  config_key: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: any;
  highlights: any;
  metadata: any;
  display_order: number;
  is_active: boolean;
  is_highlighted: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "platform-pricing-config";

export function usePlatformPricingConfigs(configType?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, configType],
    queryFn: async () => {
      let query = supabase
        .from("platform_pricing_config")
        .select("*")
        .order("display_order", { ascending: true });

      if (configType) {
        query = query.eq("config_type", configType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PlatformPricingConfig[];
    },
  });
}

export function useActivePricingPlans() {
  return useQuery({
    queryKey: [QUERY_KEY, "active-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_pricing_config")
        .select("*")
        .eq("config_type", "plan")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PlatformPricingConfig[];
    },
  });
}

export function useUpdatePricingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlatformPricingConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("platform_pricing_config")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PlatformPricingConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Configuração atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useCreatePricingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<PlatformPricingConfig, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("platform_pricing_config")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as PlatformPricingConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Configuração criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar: " + error.message);
    },
  });
}

export function useDeletePricingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_pricing_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Configuração eliminada!");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar: " + error.message);
    },
  });
}
