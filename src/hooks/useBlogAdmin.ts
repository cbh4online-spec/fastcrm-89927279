import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SEOEntity, EntityStatus } from "@/modules/growth-seo/types";
import { toast } from "sonner";

interface BlogFilters {
  status?: EntityStatus | "all";
  intent?: string | "all";
  search?: string;
}

interface BlogPagination {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function useBlogArticles(
  filters: BlogFilters = {},
  pagination: BlogPagination = { page: 1, pageSize: 20 }
) {
  const { currentWorkspace } = useWorkspace();
  const { page, pageSize, sortBy = "updated_at", sortOrder = "desc" } = pagination;
  const offset = (page - 1) * pageSize;

  return useQuery({
    queryKey: ["blog-articles", currentWorkspace?.id, filters, pagination],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return { articles: [] as SEOEntity[], total: 0, totalPages: 0 };
      }

      let query = supabase
        .from("seo_entities")
        .select("*", { count: "exact" })
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", "blog");

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.intent && filters.intent !== "all") {
        query = query.eq("intent", filters.intent);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`
        );
      }

      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        articles: (data || []) as SEOEntity[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 30000,
  });
}

export function useBlogStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["blog-stats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return {
          total: 0,
          published: 0,
          drafts: 0,
          archived: 0,
          totalViews: 0,
          avgAIScore: 0,
        };
      }

      const { data, error } = await supabase
        .from("seo_entities")
        .select("status, views_count, ai_quality_score")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", "blog");

      if (error) throw error;

      const articles = data || [];
      const published = articles.filter((a) => a.status === "published").length;
      const drafts = articles.filter((a) => a.status === "draft").length;
      const archived = articles.filter((a) => a.status === "archived").length;
      const totalViews = articles.reduce(
        (sum, a) => sum + (a.views_count || 0),
        0
      );
      const scored = articles.filter((a) => a.ai_quality_score != null);
      const avgAIScore =
        scored.length > 0
          ? Math.round(
              (scored.reduce((s, a) => s + (a.ai_quality_score || 0), 0) /
                scored.length) *
                10
            ) / 10
          : 0;

      return {
        total: articles.length,
        published,
        drafts,
        archived,
        totalViews,
        avgAIScore,
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60000,
  });
}

export function useSaveBlogArticle() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation<void, Error, Partial<SEOEntity> & { id?: string }>({
    mutationFn: async (article) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { id: articleId, ...rest } = article;
      const payload: Record<string, unknown> = {
        ...rest,
        entity_type: "blog",
        workspace_id: currentWorkspace.id,
        updated_at: new Date().toISOString(),
      };

      if (articleId) {
        const { error } = await supabase
          .from("seo_entities")
          .update(payload)
          .eq("id", articleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("seo_entities").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      queryClient.invalidateQueries({ queryKey: ["blog-stats"] });
      toast.success("Artigo guardado com sucesso");
    },
    onError: (err) => {
      console.error("Erro ao guardar artigo:", err);
      toast.error("Erro ao guardar artigo");
    },
  });
}

export function useDuplicateArticle() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (articleId: string) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { data: original, error: fetchErr } = await supabase
        .from("seo_entities")
        .select("*")
        .eq("id", articleId)
        .single();

      if (fetchErr || !original) throw fetchErr || new Error("Artigo não encontrado");

      const { id, created_at, updated_at, views_count, published_at, ...rest } = original;

      const { error } = await supabase.from("seo_entities").insert([
        {
          ...rest,
          slug: `${rest.slug}-copia-${Date.now()}`,
          title: `${rest.title} (Cópia)`,
          status: "draft",
          views_count: 0,
          published_at: null,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      toast.success("Artigo duplicado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao duplicar artigo");
    },
  });
}

export function useDeleteBlogArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase
        .from("seo_entities")
        .delete()
        .eq("id", articleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      queryClient.invalidateQueries({ queryKey: ["blog-stats"] });
      toast.success("Artigo eliminado");
    },
    onError: () => {
      toast.error("Erro ao eliminar artigo");
    },
  });
}
