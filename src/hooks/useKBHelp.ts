import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KBHelpCategory {
  id: string;
  slug: string;
  title: string;
  icon: string;
  color: string;
  description: string | null;
  sort_order: number;
}

export interface KBHelpArticle {
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
  updated_at: string;
}

export function useKBHelp() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBHelpArticle | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["kb_help_categories"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("kb_categories" as any).select("*").order("sort_order") as any);
      if (error) throw error;
      return data as KBHelpCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["kb_help_articles", selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("kb_articles" as any)
        .select("id, slug, title, summary, article_type, category_slug, tags, view_count, updated_at, related_slugs, content_md")
        .eq("is_published", true) as any;

      if (selectedCategory) {
        query = query.eq("category_slug", selectedCategory);
      }

      if (searchQuery.trim().length > 1) {
        query = query.or(
          `title.ilike.%${searchQuery.trim()}%,summary.ilike.%${searchQuery.trim()}%`
        );
      } else {
        query = query.order("sort_order").order("view_count", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as KBHelpArticle[];
    },
    placeholderData: (prev: KBHelpArticle[] | undefined) => prev,
  });

  const { data: userFeedback } = useQuery({
    queryKey: ["kb_help_feedback", selectedArticle?.id, userId],
    queryFn: async () => {
      if (!selectedArticle || !userId) return null;
      const { data } = await (supabase
        .from("kb_feedback" as any)
        .select("is_helpful")
        .eq("article_id", selectedArticle.id)
        .eq("user_id", userId)
        .maybeSingle() as any);
      return data as { is_helpful: boolean } | null;
    },
    enabled: !!selectedArticle && !!userId,
  });

  const openArticle = useCallback(
    async (article: KBHelpArticle) => {
      setSelectedArticle(article);
      setAiAnswer(null);
      if (userId) {
        supabase
          .from("kb_article_views" as any)
          .insert({ article_id: article.id, user_id: userId } as any)
          .then(() => {
            supabase.rpc("increment_kb_article_views" as any, { p_article_id: article.id });
          });
      }
    },
    [userId]
  );

  const submitFeedback = useMutation({
    mutationFn: async ({ articleId, isHelpful }: { articleId: string; isHelpful: boolean }) => {
      if (!userId) return;
      await (supabase
        .from("kb_feedback" as any)
        .upsert(
          { article_id: articleId, user_id: userId, is_helpful: isHelpful } as any,
          { onConflict: "article_id,user_id" }
        ) as any);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["kb_help_feedback", vars.articleId, userId] });
    },
  });

  const askAI = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setIsAiLoading(true);
      setAiAnswer(null);
      try {
        const { data, error } = await supabase.functions.invoke("kb-ai-search", {
          body: { query, user_id: userId },
        });
        if (error) throw error;
        setAiAnswer(data.answer);
      } catch {
        setAiAnswer("Não foi possível obter uma resposta de momento. Por favor contacta o suporte.");
      } finally {
        setIsAiLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setAiAnswer(null);
  }, [searchQuery]);

  const relatedArticles = selectedArticle?.related_slugs?.length
    ? articles.filter((a) => selectedArticle.related_slugs.includes(a.slug) && a.id !== selectedArticle.id).slice(0, 3)
    : articles.filter((a) => a.category_slug === selectedArticle?.category_slug && a.id !== selectedArticle?.id).slice(0, 3);

  const hasResults = articles.length > 0;
  const showAiOption = !isLoadingArticles && !hasResults && searchQuery.trim().length > 2;

  return {
    categories,
    articles,
    selectedCategory,
    selectedArticle,
    searchQuery,
    relatedArticles,
    userFeedback,
    aiAnswer,
    isAiLoading,
    isLoadingArticles,
    hasResults,
    showAiOption,
    setSearchQuery,
    setSelectedCategory,
    openArticle,
    closeArticle: () => setSelectedArticle(null),
    submitFeedback,
    askAI,
  };
}
