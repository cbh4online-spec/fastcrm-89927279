import { useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import {
  AppMode,
  LEADCHEF_MODULE_SLUG,
  FASTCRM_PRODUCT_MODULES,
} from "@/config/appModes";

export interface UseAppModeResult {
  mode: AppMode;
  isLeadChefOnly: boolean;
  isLoading: boolean;
}

/**
 * Determina o modo de interface activo para o workspace corrente.
 * - Super admin vê sempre 'fastcrm' (controlo total).
 * - Override manual via workspaces.ui_mode ('fastcrm' | 'leadchef').
 * - Default 'auto': leadchef instalado + nenhum módulo FastCRM → 'leadchef'.
 */
export function useAppMode(): UseAppModeResult {
  const { currentWorkspace, isSuperAdmin, loading: wsLoading } = useWorkspace();
  const { installedModuleIds, isLoading: modulesLoading } = useWorkspaceModules();

  return useMemo<UseAppModeResult>(() => {
    if (isSuperAdmin) {
      return { mode: "fastcrm", isLeadChefOnly: false, isLoading: wsLoading };
    }

    const explicit = currentWorkspace?.ui_mode;
    if (explicit === "fastcrm") {
      return { mode: "fastcrm", isLeadChefOnly: false, isLoading: wsLoading };
    }
    if (explicit === "leadchef") {
      return { mode: "leadchef", isLeadChefOnly: true, isLoading: wsLoading };
    }

    // auto
    if (modulesLoading) {
      return { mode: "fastcrm", isLeadChefOnly: false, isLoading: true };
    }

    const slugs = new Set(installedModuleIds);
    const hasLeadChef = slugs.has(LEADCHEF_MODULE_SLUG);
    const hasOtherProduct = FASTCRM_PRODUCT_MODULES.some((s) => slugs.has(s));

    if (hasLeadChef && !hasOtherProduct) {
      return { mode: "leadchef", isLeadChefOnly: true, isLoading: false };
    }
    return { mode: "fastcrm", isLeadChefOnly: false, isLoading: false };
  }, [
    isSuperAdmin,
    currentWorkspace?.ui_mode,
    installedModuleIds,
    modulesLoading,
    wsLoading,
  ]);
}
