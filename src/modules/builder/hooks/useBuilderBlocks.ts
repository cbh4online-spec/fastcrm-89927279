import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeBuilderHtmlForPersistence } from "../lib/sanitizeBuilderHtml";
import type { BuilderBlockCategory } from "../lib/blocks";

export interface BuilderBlockRecord {
  id: string;
  workspace_id: string | null;
  scope: "workspace" | "global";
  name: string;
  description: string | null;
  category: string;
  asset_type: string;
  html: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Lista blocos do workspace + globais (RLS resolve o resto). */
export function useBuilderBlocksLibrary() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["builder-blocks-library", currentWorkspace?.id],
    queryFn: async (): Promise<BuilderBlockRecord[]> => {
      const { data, error } = await supabase
        .from("builder_blocks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderBlockRecord[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}

export interface SaveBlockInput {
  name: string;
  description?: string;
  category: BuilderBlockCategory;
  html: string;
  scope?: "workspace" | "global";
  asset_type?: string;
  tags?: string[];
}

export function useSaveBuilderBlock() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveBlockInput): Promise<BuilderBlockRecord> => {
      if (!user?.id) throw new Error("Sessão inválida");
      const scope = input.scope ?? "workspace";
      if (scope === "workspace" && !currentWorkspace?.id) {
        throw new Error("Workspace não selecionado");
      }
      const { data, error } = await supabase
        .from("builder_blocks")
        .insert({
          workspace_id: scope === "workspace" ? currentWorkspace!.id : null,
          scope,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category,
          asset_type: input.asset_type ?? "any",
          html: sanitizeBuilderHtmlForPersistence(input.html),
          tags: input.tags ?? [],
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as BuilderBlockRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["builder-blocks-library"] });
    },
  });
}

export function useDeleteBuilderBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("builder_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["builder-blocks-library"] });
    },
  });
}
