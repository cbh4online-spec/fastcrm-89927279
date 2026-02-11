import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Star, Eye, EyeOff, ArrowUp, ArrowDown, Loader2, Sparkles, RefreshCw, TrendingDown, TrendingUp, Check, X, Lightbulb, Pencil } from "lucide-react";
import { toast } from "sonner";
import { StoreQuickProductDialog } from "@/components/store/StoreQuickProductDialog";
import { StoreProductEditDialog, ProductEditData } from "@/components/store/StoreProductEditDialog";
import { useAuth } from "@/contexts/AuthContext";

interface ProductStoreData {
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

interface PriceSuggestion {
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

export default function StoreProductsAdminPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductStoreData | null>(null);
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch pending price suggestions
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

  const applySuggestion = useMutation({
    mutationFn: async (suggestion: PriceSuggestion) => {
      const { error: prodErr } = await supabase
        .from("products")
        .update({ base_price: suggestion.suggested_price })
        .eq("id", suggestion.product_id);
      if (prodErr) throw prodErr;

      const { error: logErr } = await supabase
        .from("price_optimization_logs")
        .update({ applied: true, applied_at: new Date().toISOString(), applied_by: user?.id })
        .eq("id", suggestion.id);
      if (logErr) throw logErr;
    },
    onMutate: async (suggestion) => {
      await queryClient.cancelQueries({ queryKey: ["price-suggestions", currentWorkspace?.id] });
      const previous = queryClient.getQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id]);
      queryClient.setQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id], (old) =>
        old?.filter(s => s.id !== suggestion.id) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
      toast.success("Preço atualizado com sucesso");
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["price-suggestions", currentWorkspace?.id], context.previous);
      }
      toast.error("Erro: " + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["price-suggestions"] });
    },
  });

  const dismissSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("price_optimization_logs")
        .update({ applied: true, applied_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["price-suggestions", currentWorkspace?.id] });
      const previous = queryClient.getQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id]);
      queryClient.setQueryData<PriceSuggestion[]>(["price-suggestions", currentWorkspace?.id], (old) =>
        old?.filter(s => s.id !== id) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Sugestão descartada");
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["price-suggestions", currentWorkspace?.id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["price-suggestions"] });
    },
  });

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

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await supabase
        .from("products")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
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
      const { data, error } = await supabase.functions.invoke("compare-prices", {
        body: { productId },
      });
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
    if (publishedProducts.length === 0) {
      toast.info("Sem produtos publicados para atualizar");
      return;
    }

    setBulkProgress({ current: 0, total: publishedProducts.length });

    let successCount = 0;
    for (let i = 0; i < publishedProducts.length; i++) {
      const product = publishedProducts[i];
      setBulkProgress({ current: i + 1, total: publishedProducts.length });
      try {
        await supabase.functions.invoke("compare-prices", {
          body: { productId: product.id },
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to update prices for ${product.name}:`, err);
      }
    }

    setBulkProgress(null);
    queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
    toast.success(`Preços atualizados para ${successCount}/${publishedProducts.length} produtos`);
  };

  const publishedCount = products.filter(p => p.store_published).length;
  const featuredCount = products.filter(p => p.store_featured).length;

  return (
    <>
      <Helmet>
        <title>Gestão da Loja | FastCRM</title>
      </Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Gestão de Produtos na Loja
            </h1>
            <p className="text-sm text-muted-foreground">
              Publicar, destacar e ordenar produtos no catálogo da loja.
              {" "}<span className="font-medium">{publishedCount}</span> publicados, <span className="font-medium">{featuredCount}</span> em destaque
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={updateAllPrices}
              disabled={!!bulkProgress}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${bulkProgress ? "animate-spin" : ""}`} />
              Atualizar Preços
            </Button>
            <Button onClick={() => setAiDialogOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Criar com IA
            </Button>
          </div>

          {bulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>A pesquisar preços da concorrência...</span>
                <span>{bulkProgress.current}/{bulkProgress.total}</span>
              </div>
              <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
            </div>
          )}

          <StoreQuickProductDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} />

          {/* Price Suggestions Panel */}
          {suggestions.length > 0 && (
            <div className="border rounded-lg border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-sm">Sugestões de Preço ({suggestions.length})</h3>
                <Badge variant="outline" className="text-xs">Análise automática</Badge>
              </div>
              <div className="space-y-2">
                {suggestions.slice(0, 5).map((s) => {
                  const product = products.find((p) => p.id === s.product_id);
                  const isDecrease = s.suggested_price < s.original_price;
                  const changePercent = ((s.suggested_price - s.original_price) / s.original_price) * 100;

                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product?.name || "Produto"}</p>
                        <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground line-through">€{s.original_price.toFixed(2)}</p>
                          <p className="text-sm font-bold flex items-center gap-1">
                            {isDecrease ? <TrendingDown className="h-3 w-3 text-green-500" /> : <TrendingUp className="h-3 w-3 text-blue-500" />}
                            €{s.suggested_price.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant={isDecrease ? "default" : "secondary"} className="text-xs">
                          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-green-600 hover:bg-green-50"
                            onClick={() => applySuggestion.mutate(s)}
                            title="Aplicar sugestão"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => dismissSuggestion.mutate(s.id)}
                            title="Descartar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {suggestions.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{suggestions.length - 5} mais sugestões
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-center">Margem</TableHead>
                  <TableHead className="text-right">Concorrência</TableHead>
                  <TableHead className="text-center">Δ%</TableHead>
                  <TableHead className="text-center">Publicado</TableHead>
                  <TableHead className="text-center">Destaque</TableHead>
                  <TableHead className="text-center">Ordem</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Sem produtos ativos
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const imgIdx = product.primary_image_index ?? 0;
                    const img = product.images?.[imgIdx] || product.images?.[0];
                    const isLoadingPrice = loadingPrices[product.id];
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden">
                            {img ? (
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {product.brand_logo_url && (
                                <img src={product.brand_logo_url} alt="" className="h-4 object-contain flex-shrink-0" />
                              )}
                              <p className="font-medium text-sm">{product.name}</p>
                            </div>
                            {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.category || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          €{product.base_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {product.direct_cost != null ? `€${product.direct_cost.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {product.direct_cost != null && product.base_price > 0 ? (() => {
                            const margin = ((product.base_price - product.direct_cost) / product.base_price) * 100;
                            return (
                              <Badge
                                variant={margin > 30 ? "default" : margin < 15 ? "destructive" : "secondary"}
                                className={`text-xs ${margin > 30 ? "bg-green-600 hover:bg-green-700" : margin >= 15 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                              >
                                {margin.toFixed(0)}%
                              </Badge>
                            );
                          })() : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <div className="flex items-center justify-end gap-1">
                            {product.competitor_price_low != null ? (
                              <div className="text-right">
                                <span className="font-medium">€{product.competitor_price_low.toFixed(2)}</span>
                                {product.competitor_source && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={product.competitor_source}>
                                    {product.competitor_source}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-1"
                              onClick={() => updateSinglePrice(product.id)}
                              disabled={isLoadingPrice}
                              title="Pesquisar preços da concorrência"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPrice ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {product.competitor_price_low != null ? (() => {
                            const diff = ((product.base_price - product.competitor_price_low) / product.competitor_price_low) * 100;
                            const isHigher = diff > 0;
                            const isLower = diff < 0;
                            return (
                              <Badge variant={isHigher ? "destructive" : isLower ? "default" : "secondary"} className="text-xs">
                                {isHigher ? "+" : ""}{diff.toFixed(0)}%
                              </Badge>
                            );
                          })() : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={product.store_published}
                            onCheckedChange={() => togglePublish(product.id, product.store_published)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={product.store_featured ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleFeatured(product.id, product.store_featured)}
                            disabled={!product.store_published}
                          >
                            <Star className={`h-4 w-4 ${product.store_featured ? "fill-current" : ""}`} />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveOrder(product.id, product.store_sort_order, "up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground w-6 text-center">
                              {product.store_sort_order ?? "—"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveOrder(product.id, product.store_sort_order, "down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditProduct(product)}
                            title="Editar produto"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <StoreProductEditDialog
          product={editProduct}
          open={!!editProduct}
          onOpenChange={(open) => { if (!open) setEditProduct(null); }}
          onSave={(id, updates) => {
            updateProduct.mutate({ id, ...updates });
            setEditProduct(null);
            toast.success("Produto atualizado");
          }}
        />
      </DashboardLayout>
    </>
  );
}
