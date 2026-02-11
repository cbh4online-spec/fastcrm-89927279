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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, Star, Eye, EyeOff, ArrowUp, ArrowDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StoreQuickProductDialog } from "@/components/store/StoreQuickProductDialog";

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
}

export default function StoreProductsAdminPage() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-admin-products", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("products")
        .select("id, name, sku, category, base_price, currency, status, store_published, store_featured, store_sort_order, images, primary_image_index, competitor_price_low, competitor_source")
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
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ProductStoreData>) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
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
            <Button onClick={() => setAiDialogOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Criar com IA
            </Button>
          </div>

          <StoreQuickProductDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} />

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Concorrência</TableHead>
                  <TableHead className="text-center">Δ%</TableHead>
                  <TableHead className="text-center">Publicado</TableHead>
                  <TableHead className="text-center">Destaque</TableHead>
                  <TableHead className="text-center">Ordem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Sem produtos ativos
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => {
                    const imgIdx = product.primary_image_index ?? 0;
                    const img = product.images?.[imgIdx] || product.images?.[0];
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
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.category || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          €{product.base_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {product.competitor_price_low != null ? (
                            <div>
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </DashboardLayout>
    </>
  );
}
