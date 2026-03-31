import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useCurrentEmployee() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["current-employee", wsId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees" as any)
        .select("id, full_name")
        .eq("workspace_id", wsId!)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { id: string; full_name: string } | null;
    },
    enabled: !!wsId && !!user?.id,
  });

  return {
    employeeId: data?.id ?? null,
    employeeName: data?.full_name ?? null,
    isLoading,
    hasEmployee: !!data,
  };
}
