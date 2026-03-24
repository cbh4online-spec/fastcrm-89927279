import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AccountBriefSegment {
  id: string;
  workspace_id: string;
  name: string;
  segment_type: string;
  filter_json: Record<string, unknown>;
  is_dynamic: boolean;
  member_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentFilter {
  field: string;
  operator: string;
  value: unknown;
}

export function useAccountBriefSegments() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const segmentsQuery = useQuery({
    queryKey: ["account-brief-segments", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase
        .from("account_brief_segments" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as AccountBriefSegment[];
    },
    enabled: !!workspaceId,
  });

  const createSegment = useMutation({
    mutationFn: async ({ name, filterJson, isDynamic }: { name: string; filterJson: Record<string, unknown>; isDynamic: boolean }) => {
      if (!workspaceId || !user) throw new Error("Workspace não encontrado");
      const { data, error } = await (supabase
        .from("account_brief_segments" as any)
        .insert({
          workspace_id: workspaceId,
          name,
          segment_type: isDynamic ? "dynamic" : "static",
          filter_json: filterJson,
          is_dynamic: isDynamic,
          created_by: user.id,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Segmento criado!");
      queryClient.invalidateQueries({ queryKey: ["account-brief-segments"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar segmento"),
  });

  const updateSegment = useMutation({
    mutationFn: async ({ id, name, filterJson }: { id: string; name?: string; filterJson?: Record<string, unknown> }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name) updates.name = name;
      if (filterJson) updates.filter_json = filterJson;
      const { error } = await (supabase
        .from("account_brief_segments" as any)
        .update(updates)
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segmento atualizado");
      queryClient.invalidateQueries({ queryKey: ["account-brief-segments"] });
    },
  });

  const deleteSegment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("account_brief_segments" as any)
        .delete()
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Segmento eliminado");
      queryClient.invalidateQueries({ queryKey: ["account-brief-segments"] });
    },
  });

  const computeMembers = useMutation({
    mutationFn: async ({ segmentId, accountIds }: { segmentId: string; accountIds: string[] }) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      // Clear existing members
      await (supabase
        .from("account_brief_segment_members" as any)
        .delete()
        .eq("segment_id", segmentId) as any);
      // Insert new members
      if (accountIds.length > 0) {
        const rows = accountIds.map(accountId => ({
          workspace_id: workspaceId,
          segment_id: segmentId,
          account_id: accountId,
        }));
        const { error } = await (supabase
          .from("account_brief_segment_members" as any)
          .insert(rows) as any);
        if (error) throw error;
      }
      // Update count
      await (supabase
        .from("account_brief_segments" as any)
        .update({ member_count: accountIds.length, updated_at: new Date().toISOString() })
        .eq("id", segmentId) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-segments"] });
    },
  });

  return {
    segments: segmentsQuery.data || [],
    isLoading: segmentsQuery.isLoading,
    createSegment,
    updateSegment,
    deleteSegment,
    computeMembers,
  };
}
