import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface InstagramConnection {
  id: string;
  workspace_id: string;
  instagram_user_id: string;
  instagram_username: string | null;
  page_id: string;
  is_active: boolean;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInstagramConnection() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["instagram-connection", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("instagram_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as InstagramConnection | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await workspaceClient
        .from("instagram_connections")
        .update({ is_active: false })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["instagram-connection", currentWorkspace?.id],
      });
    },
  });
}
