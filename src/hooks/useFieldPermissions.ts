import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ProfileFieldPermission {
  id: string;
  sales_function: string;
  page_key: string;
  field_key: string;
  visible: boolean;
  workspace_id: string;
}

export function useFieldPermissions() {
  const { salesFunction } = useAdaptiveDashboard();
  const { currentWorkspace } = useWorkspace();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["profile-field-permissions", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("profile_field_permissions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return data as ProfileFieldPermission[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 10 * 60 * 1000,
  });

  const canSeeField = (pageKey: string, fieldKey: string): boolean => {
    if (!permissions) return true;
    const perm = permissions.find(
      (p) =>
        p.sales_function === salesFunction &&
        p.page_key === pageKey &&
        p.field_key === fieldKey
    );
    return perm?.visible ?? true;
  };

  const getFieldsForFunction = (fn: string, pageKey?: string) => {
    return (
      permissions?.filter(
        (p) => p.sales_function === fn && (!pageKey || p.page_key === pageKey)
      ) || []
    );
  };

  return {
    permissions,
    isLoading,
    salesFunction,
    canSeeField,
    getFieldsForFunction,
  };
}
