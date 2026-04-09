import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdaptiveDashboard } from "@/contexts/AdaptiveDashboardContext";

export interface ProfileFieldPermission {
  id: string;
  sales_function: string;
  page_key: string;
  field_key: string;
  visible: boolean;
}

export function useFieldPermissions() {
  const { salesFunction } = useAdaptiveDashboard();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["profile-field-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_field_permissions")
        .select("*");
      if (error) throw error;
      return data as ProfileFieldPermission[];
    },
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
