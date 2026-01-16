import { useState, useEffect, useCallback } from "react";
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

export function useWorkspaceModules() {
  const { currentWorkspace } = useWorkspace();
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([]);
  const [installedModuleIds, setInstalledModuleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstalledModules = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setInstalledModules([]);
      setInstalledModuleIds([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch installed modules for this workspace from workspace_modules
      const { data: workspaceModules, error: modulesError } = await supabase
        .from("workspace_modules")
        .select(`
          id,
          workspace_id,
          module_id,
          status,
          subscribed_at,
          trial_ends_at,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          settings
        `)
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["active", "trial"]);

      if (modulesError) {
        console.error("Error fetching workspace modules:", modulesError);
        throw modulesError;
      }

      // If we have modules, fetch their slugs from marketplace_modules
      if (workspaceModules && workspaceModules.length > 0) {
        const moduleIds = workspaceModules.map((m) => m.module_id);
        
        const { data: marketplaceModules, error: marketplaceError } = await supabase
          .from("marketplace_modules")
          .select("id, slug")
          .in("id", moduleIds);

        if (marketplaceError) {
          console.error("Error fetching marketplace modules:", marketplaceError);
        }

        // Create a map of module_id to slug
        const slugMap = new Map(
          marketplaceModules?.map((m) => [m.id, m.slug]) || []
        );

        // Add slugs to the installed modules
        const modulesWithSlugs = workspaceModules.map((m) => ({
          ...m,
          module_slug: slugMap.get(m.module_id) || undefined,
        }));

        setInstalledModules(modulesWithSlugs);
        
        // Set installed module IDs as slugs for compatibility with existing code
        const slugs = modulesWithSlugs
          .map((m) => m.module_slug)
          .filter((slug): slug is string => !!slug);
        setInstalledModuleIds(slugs);
      } else {
        setInstalledModules([]);
        setInstalledModuleIds([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao carregar módulos";
      setError(errorMessage);
      console.error("Error in fetchInstalledModules:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Refetch when workspace changes
  useEffect(() => {
    fetchInstalledModules();
  }, [fetchInstalledModules]);

  const installModule = useCallback(async (moduleSlug: string) => {
    if (!currentWorkspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return false;
    }

    try {
      // First, get the module_id from the slug
      const { data: module, error: moduleError } = await supabase
        .from("marketplace_modules")
        .select("id")
        .eq("slug", moduleSlug)
        .single();

      if (moduleError || !module) {
        throw new Error("Módulo não encontrado");
      }

      // Check if already installed
      const { data: existing } = await supabase
        .from("workspace_modules")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", module.id)
        .maybeSingle();

      if (existing) {
        toast.info("Este módulo já está instalado");
        return false;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utilizador não autenticado");
        return false;
      }

      // Install the module
      const { error: installError } = await supabase
        .from("workspace_modules")
        .insert({
          workspace_id: currentWorkspace.id,
          module_id: module.id,
          status: "active",
          subscribed_by: user.id,
          current_period_start: new Date().toISOString(),
        });

      if (installError) {
        throw installError;
      }

      toast.success("Módulo instalado com sucesso!");
      await fetchInstalledModules();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao instalar módulo";
      toast.error(errorMessage);
      console.error("Error installing module:", err);
      return false;
    }
  }, [currentWorkspace?.id, fetchInstalledModules]);

  const uninstallModule = useCallback(async (moduleSlug: string) => {
    if (!currentWorkspace?.id) {
      toast.error("Nenhum workspace selecionado");
      return false;
    }

    try {
      // First, get the module_id from the slug
      const { data: module, error: moduleError } = await supabase
        .from("marketplace_modules")
        .select("id")
        .eq("slug", moduleSlug)
        .single();

      if (moduleError || !module) {
        throw new Error("Módulo não encontrado");
      }

      // Update status to canceled instead of deleting
      const { error: updateError } = await supabase
        .from("workspace_modules")
        .update({ 
          status: "canceled",
          cancel_at_period_end: true 
        })
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", module.id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Módulo desinstalado com sucesso!");
      await fetchInstalledModules();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao desinstalar módulo";
      toast.error(errorMessage);
      console.error("Error uninstalling module:", err);
      return false;
    }
  }, [currentWorkspace?.id, fetchInstalledModules]);

  const isModuleInstalled = useCallback((moduleSlug: string) => {
    return installedModuleIds.includes(moduleSlug);
  }, [installedModuleIds]);

  return {
    installedModules,
    installedModuleIds,
    isLoading,
    error,
    installModule,
    uninstallModule,
    isModuleInstalled,
    refresh: fetchInstalledModules,
  };
}
