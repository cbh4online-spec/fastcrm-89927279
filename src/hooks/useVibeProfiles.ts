/**
 * Hook for managing Vibe Profiles
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { VibeProfile, VibeProfileInsert, VibeProfileUpdate } from "@/types/conversational-engine";

export function useVibeProfiles() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["vibe-profiles", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from("vibe_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as VibeProfile[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: Omit<VibeProfileInsert, "workspace_id">) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      const { data, error } = await supabase
        .from("vibe_profiles")
        .insert({
          ...profile,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vibe-profiles"] });
      toast.success("Perfil de vibe criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar perfil: " + error.message);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: VibeProfileUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("vibe_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vibe-profiles"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vibe_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vibe-profiles"] });
      toast.success("Perfil eliminado");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar: " + error.message);
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");

      // Atomic set default via RPC
      const { error } = await supabase.rpc("set_default_vibe_profile" as any, {
        p_workspace_id: currentWorkspace.id,
        p_profile_id: id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vibe-profiles"] });
      toast.success("Perfil definido como padrão");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const defaultProfile = profiles.find((p) => p.is_default);

  return {
    profiles,
    isLoading,
    defaultProfile,
    createProfile: createProfile.mutateAsync,
    updateProfile: updateProfile.mutateAsync,
    deleteProfile: deleteProfile.mutateAsync,
    setDefault: setDefault.mutateAsync,
    isCreating: createProfile.isPending,
    isUpdating: updateProfile.isPending,
  };
}
