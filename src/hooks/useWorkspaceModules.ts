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
  const queryKey = ["workspace-modules", workspaceId ?? "none"] as const;

  const { data: installedModules = [], isLoading, error: queryError } = useQuery<InstalledModule[], Error>({
    queryKey: ["workspace-modules", workspaceId ?? "none"],
    queryFn: () => fetchModules(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  });

  const installedModuleIds = useMemo(
    () => installedModules.map((m) => m.module_slug).filter((s): s is string => !!s),
    [installedModules]
  );

  const installMutation = useMutation({
    mutationFn: async (moduleSlug: string) => {
      if (!workspaceId) throw new Error("Nenhum workspace selecionado");

      const { data, error } = await supabase.functions.invoke("extension-provisioner", {
        body: { action: "enable", module_slug: moduleSlug },
        headers: { "X-Workspace-Id": workspaceId },
      });

      if (error) {
        // Try to extract a meaningful message
        const msg = (data as any)?.error || error.message || "Erro ao ativar extensão";
        throw new Error(msg);
      }

      if (data?.message === "Already enabled") {
        toast.info("Esta extensão já está ativa");
        return false;
      }

      return true;
    },
    onSuccess: (installed) => {
      if (installed) {
        toast.success("Extensão ativada com sucesso!");
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ["extension-manifests"] });
        queryClient.invalidateQueries({ queryKey: ["extension-audit-log"] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao ativar extensão");
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (moduleSlug: string) => {
      if (!workspaceId) throw new Error("Nenhum workspace selecionado");

      const { data, error } = await supabase.functions.invoke("extension-provisioner", {
        body: { action: "disable", module_slug: moduleSlug },
        headers: { "X-Workspace-Id": workspaceId },
      });

      if (error) {
        const msg = (data as any)?.error || error.message || "Erro ao desativar extensão";
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      toast.success("Extensão desativada com sucesso!");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["extension-manifests"] });
      queryClient.invalidateQueries({ queryKey: ["extension-audit-log"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao desativar extensão");
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
    isInstalling: installMutation.isPending,
    isUninstalling: uninstallMutation.isPending,
    refresh: () => queryClient.invalidateQueries({ queryKey }),
  };
}
