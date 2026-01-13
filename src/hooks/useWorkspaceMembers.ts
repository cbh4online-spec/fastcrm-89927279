import { useQuery } from "@tanstack/react-query";
import { useWorkspace, WorkspaceRole } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["workspace_members", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      // Get members first
      const { data: members, error: membersError } = await workspaceClient
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      // Get profiles for each member
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await workspaceClient
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      // Map profiles to members
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return members.map((member) => ({
        ...member,
        profile: profileMap.get(member.user_id) || null,
      })) as WorkspaceMember[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useAgentMembers() {
  const { data: members, ...rest } = useWorkspaceMembers();

  // Filter to only agents and above (can handle conversations)
  const agents = members?.filter(
    (m) => m.role === "owner" || m.role === "admin" || m.role === "agent"
  );

  return { data: agents, ...rest };
}
