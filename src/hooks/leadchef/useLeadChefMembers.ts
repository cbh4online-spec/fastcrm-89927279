import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadChefMember {
  user_id: string;
  workspace_id: string;
  role: string;
  created_at: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function useLeadChefMembers(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["leadchef-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefMember[]> => {
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id, workspace_id, role, created_at")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = (members ?? []).map((m: any) => m.user_id);
      if (!ids.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", ids);

      const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return (members as any[]).map((m) => ({
        ...m,
        email: byId.get(m.user_id)?.email ?? null,
        display_name: byId.get(m.user_id)?.full_name ?? null,
        avatar_url: byId.get(m.user_id)?.avatar_url ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

export function useUpdateLeadChefMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: role as any })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leadchef-members", vars.workspaceId] });
    },
  });
}

export function useRemoveLeadChefMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leadchef-members", vars.workspaceId] });
    },
  });
}
