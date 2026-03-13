import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export function useC2CModeration() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["c2c-moderation-queue", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("c2c_moderation_queue")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const reviewItem = useMutation({
    mutationFn: async ({ id, action, status }: { id: string; action: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("c2c_moderation_queue")
        .update({
          status,
          action_taken: action,
          reviewed_by: user.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-moderation-queue"] });
      toast.success("Item moderado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pendingCount = queue.filter((q: any) => q.status === "pending").length;

  return { queue, isLoading, reviewItem, pendingCount };
}
