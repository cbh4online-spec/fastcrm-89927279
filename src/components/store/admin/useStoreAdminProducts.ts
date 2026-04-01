import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProductStoreData {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  base_price: number;
  currency: string;
  status: string;
  store_published: boolean;
  store_featured: boolean;
  store_sort_order: number | null;
  images: string[] | null;
  primary_image_index: number | null;
  competitor_price_low: number | null;
  competitor_source: string | null;
  brand_logo_url: string | null;
  specifications: Record<string, string> | null;
  direct_cost: number | null;
  operational_cost: number | null;
  short_description: string | null;
  product_condition: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
}

export interface PriceSuggestion {
  id: string;
  product_id: string;
  original_price: number;
  suggested_price: number;
  margin_change: number | null;
  optimization_type: string;
  reasoning: string | null;
  applied: boolean;
  created_at: string;
}

export function useStoreAdminProducts(search: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-admin-products", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("products")
        .select("id, name, sku, category, base_price, currency, status, store_published, store_featured, store_sort_order, images, primary_image_index, competitor_price_low, competitor_source, brand_logo_url, specifications, direct_cost, operational_cost, short_description, product_condition, stock_status, stock_quantity")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .order("store_sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductStoreData[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["price-suggestions", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("price_optimization_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("applied", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PriceSuggestion[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await supabase.from("products").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-admin-products"] }),
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const applySuggestion = useMutation({
    mutationFn: async (suggestion: PriceSuggestion) => {
      const { error: prodErr } = await supabase.from("products").update({ base_price: suggestion.suggested_price }).eq("id", suggestion.product_id);
      if (prodErr) throw prodErr;
      const { error: logErr } = await supabase.from("price_optimization_logs").update({ applied: true, applied_at: new Date().toISOString(), applied_by: user?.id }).eq("id", suggestion.id);
      if (logErr) throw logErr;
    },
    onMutate: async (suggestion) => {
      await queryClient.cancelQueries({ queryKey: ["price-suggestions", currentWorkspace?.id] });
      const previous = queryClient.getQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id]);
      queryClient.setQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id], (old) => old?.filter(s => s.id !== suggestion.id) ?? []);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
      toast.success("Preço atualizado com sucesso");
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["price-suggestions", currentWorkspace?.id], context.previous);
      toast.error("Erro: " + err.message);
    },
  });

  const dismissSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_optimization_logs").update({ applied: true, applied_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["price-suggestions", currentWorkspace?.id] });
      const previous = queryClient.getQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id]);
      queryClient.setQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id], (old) => old?.filter(s => s.id !== id) ?? []);
      return { previous };
    },
    onSuccess: () => toast.success("Sugestão descartada"),
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["price-suggestions", currentWorkspace?.id], context.previous);
    },
  });

  const togglePublish = (id: string, current: boolean) => {
    updateProduct.mutate({ id, store_published: !current });
    toast.success(!current ? "Produto publicado na loja" : "Produto removido da loja");
  };

  const toggleFeatured = (id: string, current: boolean) => {
    updateProduct.mutate({ id, store_featured: !current });
    toast.success(!current ? "Produto marcado como destaque" : "Destaque removido");
  };

  const moveOrder = (id: string, currentOrder: number | null, direction: "up" | "down") => {
    const newOrder = (currentOrder || 0) + (direction === "up" ? -1 : 1);
    updateProduct.mutate({ id, store_sort_order: Math.max(0, newOrder) });
  };

  const updateSinglePrice = async (productId: string) => {
    setLoadingPrices((prev) => ({ ...prev, [productId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("compare-prices", { body: { productId } });
      if (error) throw error;
      const count = data?.data?.length || 0;
      toast.success(count > 0 ? `${count} preços encontrados` : "Sem preços encontrados");
      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
    } catch (err: any) {
      toast.error("Erro ao pesquisar preços: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoadingPrices((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const updateAllPrices = async () => {
    const publishedProducts = products.filter((p) => p.store_published);
    if (publishedProducts.length === 0) { toast.info("Sem produtos publicados para atualizar"); return; }
    setBulkProgress({ current: 0, total: publishedProducts.length });
    let successCount = 0;
    for (let i = 0; i < publishedProducts.length; i++) {
      setBulkProgress({ current: i + 1, total: publishedProducts.length });
      try {
        await supabase.functions.invoke("compare-prices", { body: { productId: publishedProducts[i].id } });
        successCount++;
      } catch (err) {
        console.error(`Failed to update prices for ${publishedProducts[i].name}:`, err);
      }
    }
    setBulkProgress(null);
    queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
    toast.success(`Preços atualizados para ${successCount}/${publishedProducts.length} produtos`);
  };

  return {
    products, isLoading, suggestions,
    updateProduct, applySuggestion, dismissSuggestion,
    togglePublish, toggleFeatured, moveOrder,
    updateSinglePrice, updateAllPrices,
    loadingPrices, bulkProgress,
    publishedCount: products.filter(p => p.store_published).length,
    featuredCount: products.filter(p => p.store_featured).length,
  };
}
