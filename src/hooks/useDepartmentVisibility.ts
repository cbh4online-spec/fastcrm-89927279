import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  computeDepartmentVisibility,
  getVisibleDepartments,
  type DepartmentOverride,
  type DepartmentVisibilityState,
} from "@/config/departments";
import type { MegaGroup } from "@/config/routeManifest";

const KEY = "workspace-department-overrides";

/**
 * Hook que devolve a visibilidade de cada departamento para a workspace activa,
 * cruzando plano de subscrição + overrides manuais + status super admin.
 */
export function useDepartmentVisibility() {
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { plan } = useSubscription();
  const wsId = currentWorkspace?.id;

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: [KEY, wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async (): Promise<DepartmentOverride[]> => {
      const { data, error } = await supabase
        .from("workspace_department_overrides")
        .select("department_slug, enabled, locked_by_plan")
        .eq("workspace_id", wsId!);
      if (error) {
        console.warn("[useDepartmentVisibility] fallback to plan defaults:", error.message);
        return [];
      }
      return (data ?? []) as DepartmentOverride[];
    },
  });

  const visibleSet = useMemo(
    () => getVisibleDepartments(plan, overrides, isSuperAdmin),
    [plan, overrides, isSuperAdmin],
  );

  const getState = (department: MegaGroup): DepartmentVisibilityState =>
    computeDepartmentVisibility(department, plan, overrides, isSuperAdmin);

  const isVisible = (department: MegaGroup): boolean => visibleSet.has(department);

  return {
    isLoading,
    plan,
    isSuperAdmin,
    overrides,
    visibleSet,
    isVisible,
    getState,
  };
}
