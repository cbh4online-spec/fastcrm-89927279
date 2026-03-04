import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { ContextBlock } from "./useContextBlocks";

export interface ContextBlockVersion {
  id: string;
  block_id: string;
  workspace_id: string;
  version_number: number;
  snapshot_fields: any[];
  snapshot_rich_text: string | null;
  snapshot_tags: string[];
  snapshot_status: string;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export function useContextVersions(blockId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["context-versions", blockId],
    queryFn: async () => {
      if (!blockId) return [];
      const { data, error } = await supabase
        .from("context_block_versions" as any)
        .select("*")
        .eq("block_id", blockId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ContextBlockVersion[];
    },
    enabled: !!blockId && !!currentWorkspace?.id,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ block, changeSummary, changeType, changedFields }: { block: ContextBlock; changeSummary?: string; changeType?: string; changedFields?: string[] }) => {
      // Get current version count
      const { count } = await supabase
        .from("context_block_versions" as any)
        .select("*", { count: "exact", head: true })
        .eq("block_id", block.id);

      const versionNumber = (count || 0) + 1;

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("context_block_versions" as any)
        .insert({
          block_id: block.id,
          workspace_id: block.workspace_id,
          version_number: versionNumber,
          snapshot_fields: (block.fields || []).map(f => ({
            field_key: f.field_key,
            field_type: f.field_type,
            field_value: f.field_value,
          })),
          snapshot_rich_text: block.rich_text,
          snapshot_tags: block.tags || [],
          snapshot_status: block.status,
          change_summary: changeSummary || null,
          change_type: changeType || 'minor',
          changed_fields: changedFields || null,
          created_by: userData.user?.id || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["context-versions", vars.block.id] });
      toast.success("Versão guardada");
    },
    onError: (err: Error) => toast.error("Erro ao criar versão: " + err.message),
  });
}

export function computeFieldDiff(
  oldFields: any[],
  newFields: any[]
): { field: string; old: any; new: any }[] {
  const diffs: { field: string; old: any; new: any }[] = [];
  const oldMap = new Map(oldFields.map(f => [f.field_key, f.field_value]));
  const newMap = new Map(newFields.map(f => [f.field_key, f.field_value]));

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
  allKeys.forEach(key => {
    const o = oldMap.get(key);
    const n = newMap.get(key);
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      diffs.push({ field: key, old: o ?? null, new: n ?? null });
    }
  });
  return diffs;
}
