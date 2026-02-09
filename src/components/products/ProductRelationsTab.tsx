import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Package,
  Plus,
  Trash2,
  Search,
  Link2,
  Puzzle,
  ShoppingBag,
  Sparkles,
  Loader2,
  GripVertical,
  X,
} from "lucide-react";

interface ProductRelationsTabProps {
  product: {
    id: string;
    name: string;
    workspace_id: string;
  };
}

type RelationType = "related" | "compatible" | "bundle";

const relationLabels: Record<RelationType, { label: string; icon: typeof Link2; color: string }> = {
  related: { label: "Relacionado", icon: Link2, color: "text-blue-600" },
  compatible: { label: "Compatível", icon: Puzzle, color: "text-green-600" },
  bundle: { label: "Bundle", icon: ShoppingBag, color: "text-purple-600" },
};

export function ProductRelationsTab({ product }: ProductRelationsTabProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<RelationType>("compatible");
  const [reason, setReason] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch existing relations
  const { data: relations = [], isLoading } = useQuery({
    queryKey: ["product-relations", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_relations" as any)
        .select("*")
        .eq("source_product_id", product.id)
        .order("relation_type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch target product details for existing relations
  const targetIds = relations.map((r: any) => r.target_product_id);
  const { data: targetProducts = [] } = useQuery({
    queryKey: ["product-relation-targets", targetIds],
    queryFn: async () => {
      if (targetIds.length === 0) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, images, primary_image_index, sku, category")
        .in("id", targetIds);
      return data || [];
    },
    enabled: targetIds.length > 0,
  });

  // Search for products to add
  const { data: searchResults = [] } = useQuery({
    queryKey: ["product-search-relations", debouncedSearch, product.workspace_id],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, images, primary_image_index, sku, category")
        .eq("workspace_id", product.workspace_id)
        .neq("id", product.id)
        .or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`)
        .eq("status", "active")
        .limit(8);
      return data || [];
    },
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
  });

  // Add relation mutation
  const addRelation = useMutation({
    mutationFn: async (targetProductId: string) => {
      const { error } = await supabase
        .from("product_relations" as any)
        .insert({
          workspace_id: product.workspace_id,
          source_product_id: product.id,
          target_product_id: targetProductId,
          relation_type: selectedType,
          reason: reason || null,
          sort_order: relations.filter((r: any) => r.relation_type === selectedType).length,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-relations", product.id] });
      setSearchTerm("");
      setReason("");
      toast.success("Relação adicionada");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Esta relação já existe");
      } else {
        toast.error("Erro ao adicionar relação");
      }
    },
  });

  // Remove relation
  const removeRelation = useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await supabase
        .from("product_relations" as any)
        .delete()
        .eq("id", relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-relations", product.id] });
      toast.success("Relação removida");
    },
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("product_relations" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-relations", product.id] });
    },
  });

  // AI suggest relations
  const suggestRelations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-product-assistant", {
        body: {
          mode: "suggest-relations",
          productId: product.id,
          workspaceId: product.workspace_id,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["product-relations", product.id] });
      toast.success(`${data.added || 0} relações sugeridas pela IA foram adicionadas`);
    },
    onError: () => {
      toast.error("Erro ao obter sugestões da IA");
    },
  });

  const getTargetProduct = (targetId: string) => targetProducts.find((p: any) => p.id === targetId);

  const groupedRelations = {
    compatible: relations.filter((r: any) => r.relation_type === "compatible"),
    related: relations.filter((r: any) => r.relation_type === "related"),
    bundle: relations.filter((r: any) => r.relation_type === "bundle"),
  };

  // Filter search results that are already added for selected type
  const existingTargetIds = new Set(
    relations
      .filter((r: any) => r.relation_type === selectedType)
      .map((r: any) => r.target_product_id)
  );
  const filteredSearch = searchResults.filter((p: any) => !existingTargetIds.has(p.id));

  return (
    <div className="space-y-6">
      {/* AI Suggest button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gerir produtos relacionados, compatíveis e bundles.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => suggestRelations.mutate()}
          disabled={suggestRelations.isPending}
        >
          {suggestRelations.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Sugerir com IA
        </Button>
      </div>

      {/* Add new relation */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Adicionar relação</span>
        </div>

        <div className="flex gap-2">
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RelationType)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(relationLabels) as [RelationType, typeof relationLabels.related][]).map(([key, { label, icon: Icon }]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produto por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Input
          placeholder="Motivo da relação (opcional) ex: Acessório recomendado"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Search results */}
        {filteredSearch.length > 0 && (
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {filteredSearch.map((p: any) => {
              const imgIdx = p.primary_image_index ?? 0;
              const img = p.images?.[imgIdx] || p.images?.[0];
              return (
                <button
                  key={p.id}
                  onClick={() => addRelation.mutate(p.id)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                  disabled={addRelation.isPending}
                >
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku && <span>{p.sku} • </span>}€{p.base_price?.toFixed(2)}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Separator />

      {/* Existing relations grouped by type */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">A carregar...</div>
      ) : relations.length === 0 ? (
        <div className="text-center py-8">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma relação definida</p>
          <p className="text-xs text-muted-foreground mt-1">Use a pesquisa acima ou o botão "Sugerir com IA"</p>
        </div>
      ) : (
        (Object.entries(groupedRelations) as [RelationType, any[]][]).map(([type, items]) => {
          if (items.length === 0) return null;
          const { label, icon: Icon, color } = relationLabels[type];
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-semibold">{label}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-1">
                {items.map((rel: any) => {
                  const target = getTargetProduct(rel.target_product_id);
                  if (!target) return null;
                  const imgIdx = target.primary_image_index ?? 0;
                  const img = target.images?.[imgIdx] || target.images?.[0];
                  return (
                    <div key={rel.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{target.name}</p>
                        <p className="text-xs text-muted-foreground">
                          €{target.base_price?.toFixed(2)}
                          {rel.reason && <span> • {rel.reason}</span>}
                        </p>
                      </div>
                      <Switch
                        checked={rel.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: rel.id, is_active: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeRelation.mutate(rel.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
