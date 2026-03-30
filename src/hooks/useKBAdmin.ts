import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import slugify from "slugify";

/* ── Types ─────────────────────────────────────────────────── */

export interface KBCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  color: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  article_count?: number;
}

export interface KBArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content_md: string;
  category_slug: string;
  article_type: "guide" | "how-to" | "reference" | "faq" | "video";
  tags: string[];
  related_slugs: string[];
  view_count: number;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ArticleFormData = {
  title: string;
  summary: string;
  content_md: string;
  category_slug: string;
  article_type: KBArticle["article_type"];
  tags: string[];
  related_slugs: string[];
  is_published: boolean;
};

/* ── Hook ──────────────────────────────────────────────────── */

export function useKBAdmin() {
  const queryClient = useQueryClient();
  const sb = supabase as any;

  /* ── Categories ────────────────────────────────────────── */

  const categoriesQuery = useQuery({
    queryKey: ["kb_admin_categories"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kb_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;

      // Count articles per category
      const { data: articles } = await sb
        .from("kb_articles")
        .select("category_slug");
      const counts: Record<string, number> = {};
      (articles ?? []).forEach((a: any) => {
        counts[a.category_slug] = (counts[a.category_slug] || 0) + 1;
      });

      return (data as KBCategory[]).map((c) => ({
        ...c,
        article_count: counts[c.slug] || 0,
      }));
    },
  });

  const createCategory = useMutation({
    mutationFn: async (cat: Omit<KBCategory, "id" | "created_at" | "article_count">) => {
      const { error } = await sb.from("kb_categories").insert(cat);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_categories"] });
      toast.success("Categoria criada");
    },
    onError: () => toast.error("Erro ao criar categoria"),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KBCategory> & { id: string }) => {
      const { error } = await sb.from("kb_categories").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_categories"] });
      toast.success("Categoria atualizada");
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("kb_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_categories"] });
      toast.success("Categoria eliminada");
    },
    onError: () => toast.error("Erro ao eliminar categoria (pode ter artigos associados)"),
  });

  /* ── Articles ──────────────────────────────────────────── */

  const articlesQuery = useQuery({
    queryKey: ["kb_admin_articles"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("kb_articles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as KBArticle[];
    },
  });

  const createArticle = useMutation({
    mutationFn: async (form: ArticleFormData) => {
      const slug = slugify(form.title, { lower: true, strict: true });
      const { error } = await sb.from("kb_articles").insert({
        ...form,
        slug,
        view_count: 0,
        sort_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb_admin_categories"] });
      toast.success("Artigo criado");
    },
    onError: () => toast.error("Erro ao criar artigo"),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...form }: ArticleFormData & { id: string }) => {
      const slug = slugify(form.title, { lower: true, strict: true });
      const { error } = await sb
        .from("kb_articles")
        .update({ ...form, slug, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_articles"] });
      toast.success("Artigo atualizado");
    },
    onError: () => toast.error("Erro ao atualizar artigo"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await sb
        .from("kb_articles")
        .update({ is_published, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_articles"] });
      toast.success(vars.is_published ? "Artigo publicado" : "Artigo despublicado");
    },
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("kb_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_admin_articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb_admin_categories"] });
      toast.success("Artigo eliminado");
    },
    onError: () => toast.error("Erro ao eliminar artigo"),
  });

  /* ── Full-text search ──────────────────────────────────── */

  const searchArticles = async (query: string): Promise<KBArticle[]> => {
    if (!query.trim()) return articlesQuery.data ?? [];
    const tsQuery = query.trim().split(/\s+/).join(" & ");
    const { data, error } = await sb
      .from("kb_articles")
      .select("*")
      .or(`title.ilike.%${query.trim()}%,summary.ilike.%${query.trim()}%`)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as KBArticle[];
  };

  return {
    categories: categoriesQuery.data ?? [],
    isLoadingCategories: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,

    articles: articlesQuery.data ?? [],
    isLoadingArticles: articlesQuery.isLoading,
    createArticle,
    updateArticle,
    togglePublish,
    deleteArticle,
    searchArticles,
  };
}
