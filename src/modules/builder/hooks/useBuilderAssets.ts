import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import type { BuilderAsset, BuilderAssetType } from "../types";
import { sanitizeBuilderHtml, slugify } from "../lib/sanitizeBuilderHtml";

export function useBuilderAssets(filterType?: BuilderAssetType | "all") {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["builder-assets", currentWorkspace?.id, filterType ?? "all"],
    queryFn: async (): Promise<BuilderAsset[]> => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("builder_assets")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (filterType && filterType !== "all") {
        query = query.eq("type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BuilderAsset[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
  });
}

export interface CreateBuilderAssetInput {
  name: string;
  type: BuilderAssetType;
  description?: string;
  html: string;
}

export function useCreateBuilderAsset() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBuilderAssetInput): Promise<BuilderAsset> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      if (!user?.id) throw new Error("Sessão inválida");

      const cleanHtml = sanitizeBuilderHtml(input.html);
      const baseSlug = slugify(input.name);

      // Garantir slug único dentro do workspace
      const { data: existing } = await supabase
        .from("builder_assets")
        .select("slug")
        .eq("workspace_id", currentWorkspace.id)
        .like("slug", `${baseSlug}%`);

      const taken = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
      let slug = baseSlug;
      let n = 2;
      while (taken.has(slug)) {
        slug = `${baseSlug}-${n++}`;
      }

      const { data, error } = await supabase
        .from("builder_assets")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          type: input.type,
          status: "draft",
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          html: cleanHtml,
          metadata: {},
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as BuilderAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-assets"] });
    },
  });
}

export function useDeleteBuilderAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("builder_assets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builder-assets"] });
    },
  });
}
