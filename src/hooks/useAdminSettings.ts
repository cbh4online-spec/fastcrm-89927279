import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
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
      return { data, action: existing ? 'update' : 'create', key };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      console.log(`[ADMIN-SETTINGS] UPDATED key=${result.key} action=${result.action}`);
      emitKernelEvent({
        workspace_id: 'global',
        type: 'SETTINGS.UPDATED',
        entity_kind: 'admin_setting',
        entity_id: result.key,
        source_module: 'admin-settings',
        payload: { setting_key: result.key, action: result.action },
      });
      toast.success("Configuração guardada");
    },
    onError: (error) => {
      console.warn('[ADMIN-SETTINGS] UPDATE_FAILED', error.message);
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
      return key;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      console.log(`[ADMIN-SETTINGS] DELETED key=${key}`);
      emitKernelEvent({
        workspace_id: 'global',
        type: 'SETTINGS.DELETED',
        entity_kind: 'admin_setting',
        entity_id: key,
        source_module: 'admin-settings',
        payload: { setting_key: key },
      });
      toast.success("Configuração removida");
    },
    onError: (error) => {
      console.warn('[ADMIN-SETTINGS] DELETE_FAILED', error.message);
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
