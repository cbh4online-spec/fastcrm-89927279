import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SalesFunction } from "@/data/adaptiveDashboardMock";

export interface ProfileMenuPermission {
  id: string;
  sales_function: string;
  menu_key: string;
  visible: boolean;
  workspace_id: string;
}

export function useProfileMenuPermissions() {
  const { salesFunction } = useAdaptiveDashboard();
  const { currentWorkspace } = useWorkspace();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["profile-menu-permissions", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("profile_menu_permissions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return data as ProfileMenuPermission[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 10 * 60 * 1000,
  });

  const isMenuVisibleForProfile = (menuKey: string): boolean => {
    if (!permissions) return true; // default allow while loading
    const perm = permissions.find(
      (p) => p.sales_function === salesFunction && p.menu_key === menuKey
    );
    // If no rule exists for this profile+menu, default to visible
    return perm?.visible ?? true;
  };

  const getPermissionsForFunction = (fn: SalesFunction): ProfileMenuPermission[] => {
    return permissions?.filter((p) => p.sales_function === fn) || [];
  };

  return {
    permissions,
    isLoading,
    salesFunction,
    isMenuVisibleForProfile,
    getPermissionsForFunction,
  };
}
