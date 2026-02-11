import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface InstalledModule {
  id: string;
  workspace_id: string;
  module_id: string;
  status: string;
  subscribed_at: string;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  settings: Json | null;
  module_slug?: string;
}

async function fetchModules(workspaceId: string): Promise<InstalledModule[]> {
  const { data: workspaceModules, error: modulesError } = await supabase
    .from("workspace_modules")
    .select(`
      id, workspace_id, module_id, status, subscribed_at,
      trial_ends_at, current_period_start, current_period_end,
      cancel_at_period_end, settings
    `)
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "trial"]);

  if (modulesError) throw modulesError;
  if (!workspaceModules || workspaceModules.length === 0) return [];

  const moduleIds = workspaceModules.map((m) => m.module_id);
  const { data: marketplaceModules } = await supabase
    .from("marketplace_modules")
    .select("id, slug")
    .in("id", moduleIds);

  const slugMap = new Map(marketplaceModules?.map((m) => [m.id, m.slug]) || []);

  return workspaceModules.map((m) => ({
    ...m,
    module_slug: slugMap.get(m.module_id) || undefined,
  }));
}

export function useWorkspaceModules() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const queryKey = ["workspace-modules", workspaceId];

  const { data: installedModules = [], isLoading, error: queryError } = useQuery({
    queryKey,
    queryFn: () => fetchModules(workspaceId!),
    enabled: !!workspaceId,
  });

  const installedModuleIds = useMemo(
    () => installedModules.map((m) => m.module_slug).filter((s): s is string => !!s),
    [installedModules]
  );

  const installMutation = useMutation({
    mutationFn: async (moduleSlug: string) => {
      if (!workspaceId) throw new Error("Nenhum workspace selecionado");

      const { data: module, error: moduleError } = await supabase
        .from("marketplace_modules")
        .select("id")
        .eq("slug", moduleSlug)
        .single();
      if (moduleError || !module) throw new Error("Módulo não encontrado");

      const { data: existing } = await supabase
        .from("workspace_modules")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id)
        .maybeSingle();
      if (existing) {
        toast.info("Este módulo já está instalado");
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      const { error: installError } = await supabase
        .from("workspace_modules")
        .insert({
          workspace_id: workspaceId,
          module_id: module.id,
          status: "active",
          subscribed_by: user.id,
          current_period_start: new Date().toISOString(),
        });
      if (installError) throw installError;
      return true;
    },
    onSuccess: (installed) => {
      if (installed) {
        toast.success("Módulo instalado com sucesso!");
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao instalar módulo");
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (moduleSlug: string) => {
      if (!workspaceId) throw new Error("Nenhum workspace selecionado");

      const { data: module, error: moduleError } = await supabase
        .from("marketplace_modules")
        .select("id")
        .eq("slug", moduleSlug)
        .single();
      if (moduleError || !module) throw new Error("Módulo não encontrado");

      const { error: updateError } = await supabase
        .from("workspace_modules")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("workspace_id", workspaceId)
        .eq("module_id", module.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Módulo desinstalado com sucesso!");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao desinstalar módulo");
    },
  });

  const installModule = useCallback(
    async (moduleSlug: string) => {
      try {
        const result = await installMutation.mutateAsync(moduleSlug);
        return result;
      } catch {
        return false;
      }
    },
    [installMutation]
  );

  const uninstallModule = useCallback(
    async (moduleSlug: string) => {
      try {
        await uninstallMutation.mutateAsync(moduleSlug);
        return true;
      } catch {
        return false;
      }
    },
    [uninstallMutation]
  );

  const isModuleInstalled = useCallback(
    (moduleSlug: string) => installedModuleIds.includes(moduleSlug),
    [installedModuleIds]
  );

  return {
    installedModules,
    installedModuleIds,
    isLoading,
    error: queryError ? (queryError as Error).message : null,
    installModule,
    uninstallModule,
    isModuleInstalled,
    refresh: () => queryClient.invalidateQueries({ queryKey }),
  };
}
