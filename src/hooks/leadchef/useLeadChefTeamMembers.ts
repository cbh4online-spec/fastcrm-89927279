import { useMemo } from "react";
import { useWorkspaceMembers, type WorkspaceMember } from "@/hooks/useWorkspaceMembers";

export interface LeadChefTeamMember {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: WorkspaceMember["role"];
}

export function useLeadChefTeamMembers() {
  const { data, isLoading, isError } = useWorkspaceMembers();

  const members = useMemo<LeadChefTeamMember[]>(() => {
    if (!data) return [];
    return data
      .filter((m) => m.role !== "viewer")
      .map((m) => ({
        userId: m.user_id,
        name: m.profile?.full_name ?? m.profile?.email ?? "Sem nome",
        email: m.profile?.email ?? null,
        avatarUrl: m.profile?.avatar_url ?? null,
        role: m.role,
      }));
  }, [data]);

  return { data: members, isLoading, isError };
}
