import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as AdminSetting[];
    },
  });

  const upsertSetting = useMutation({
    mutationFn: async ({
      key,
      value,
      description,
    }: {
      key: string;
      value: Record<string, unknown>;
      description?: string;
    }) => {
      // Check if setting exists
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      let data, error;
      if (existing) {
        ({ data, error } = await supabase
          .from("admin_settings")
          .update({ value: value as unknown as Record<string, never>, description })
          .eq("key", key)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from("admin_settings")
          .insert({ key, value: value as unknown as Record<string, never>, description })
          .select()
          .single());
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Configuração guardada");
    },
    onError: (error) => {
      toast.error(`Erro ao guardar: ${error.message}`);
    },
  });

  const deleteSetting = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("admin_settings")
        .delete()
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Configuração removida");
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const getSetting = (key: string) => {
    return settings?.find((s) => s.key === key);
  };

  return {
    settings: settings ?? [],
    isLoading,
    error,
    upsertSetting,
    deleteSetting,
    getSetting,
  };
}
