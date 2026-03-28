import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
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
  ArrowUpRight,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Layers,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowLeftRight,
} from "lucide-react";

interface ProductRelationsTabProps {
  product: {
    id: string;
    name: string;
    workspace_id: string;
  };
}

type RelationType =
  | "accessory"
  | "alternative"
  | "required"
  | "upgrade"
  | "compatible"
  | "bundle"
  | "related";

const relationConfig: Record<
  RelationType,
  { label: string; description: string; icon: typeof Link2; color: string; bgColor: string }
> = {
  accessory: {
    label: "Acessório",
    description: "Complementa este produto",
    icon: Wrench,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
  alternative: {
    label: "Alternativa",
    description: "Pode substituir este produto",
    icon: RefreshCw,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  required: {
    label: "Obrigatório",
    description: "Necessário para utilizar este produto",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
  upgrade: {
    label: "Upgrade",
    description: "Versão superior deste produto",
    icon: ArrowUpRight,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  compatible: {
    label: "Compatível",
    description: "Funciona bem em conjunto",
    icon: Puzzle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  bundle: {
    label: "Bundle",
    description: "Faz parte de um pacote",
    icon: ShoppingBag,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  related: {
    label: "Relacionado",
    description: "Produto associado genericamente",
    icon: Link2,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
};

const allTypes: RelationType[] = [
  "accessory",
  "alternative",
  "required",
  "upgrade",
  "compatible",
  "bundle",
  "related",
];

function ProductThumb({ images, name }: { images?: string[] | null; name: string }) {
  const img = images?.[0];
  return (
    <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted/60 flex-shrink-0 border border-border/50">
      {img ? (
        <img src={img} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
        </div>
      )}
    </div>
  );
}

export function ProductRelationsTab({ product }: ProductRelationsTabProps) {
  const queryClient = useQueryClient();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<RelationType>("accessory");
  const [reason, setReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [filterType, setFilterType] = useState<string>("all");

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch existing relations (both directions)
  const { data: outgoingRelations = [], isLoading } = useQuery({
    queryKey: ["product-relations", product.id],
    queryFn: async () => {
      const { data, error } = await workspaceClient
        .from("product_relations")
        .select("*")
        .eq("source_product_id", product.id)
        .order("relation_type")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: incomingRelations = [] } = useQuery({
    queryKey: ["product-relations-incoming", product.id],
    queryFn: async () => {
      const { data, error } = await workspaceClient
        .from("product_relations")
        .select("*")
        .eq("target_product_id", product.id)
        .order("relation_type");
      if (error) throw error;
      return data || [];
    },
  });

  const allRelationIds = useMemo(() => {
    const ids = new Set<string>();
    outgoingRelations.forEach((r: any) => ids.add(r.target_product_id));
    incomingRelations.forEach((r: any) => ids.add(r.source_product_id));
    return Array.from(ids);
  }, [outgoingRelations, incomingRelations]);

  // Fetch all related product details
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["product-relation-targets", allRelationIds],
    queryFn: async () => {
      if (allRelationIds.length === 0) return [];
      const { data } = await workspaceClient
        .from("products")
        .select("id, name, base_price, images, primary_image_index, sku, category, status, currency")
        .in("id", allRelationIds);
      return data || [];
    },
    enabled: allRelationIds.length > 0,
  });

  // Search products
  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ["product-search-relations", debouncedSearch, product.workspace_id],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const { data } = await workspaceClient
        .from("products")
        .select("id, name, base_price, images, primary_image_index, sku, category, status, currency")
        .eq("workspace_id", product.workspace_id)
        .neq("id", product.id)
        .or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`)
        .eq("status", "active")
        .limit(10);
      return data || [];
    },
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
  });

  // Mutations
  const addRelation = useMutation({
    mutationFn: async ({
      targetId,
      type,
      reasonText,
    }: {
      targetId: string;
      type: RelationType;
      reasonText: string;
    }) => {
      const { error } = await workspaceClient
        .from("product_relations")
        .insert({
          workspace_id: product.workspace_id,
          source_product_id: product.id,
          target_product_id: targetId,
          relation_type: type,
          reason: reasonText || null,
          sort_order: outgoingRelations.filter((r: any) => r.relation_type === type)
            .length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-relations", product.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["product-relations-incoming", product.id],
      });
      setAddDialogOpen(false);
      setSelectedProduct(null);
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

  const removeRelation = useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await workspaceClient
        .from("product_relations")
        .delete()
        .eq("id", relationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-relations", product.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["product-relations-incoming", product.id],
      });
      toast.success("Relação removida");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await workspaceClient
        .from("product_relations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-relations", product.id],
      });
    },
  });

  const suggestRelations = useMutation({
    mutationFn: async () => {
      const { data, error } = await workspaceClient.functions.invoke(
        "suggest-related-products",
        {
          body: {
            product_id: product.id,
            workspace_id: product.workspace_id,
            mode: "suggest-and-save",
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["product-relations", product.id],
      });
      toast.success(
        `${data.added || 0} relações sugeridas pela IA foram adicionadas`
      );
    },
    onError: () => {
      toast.error("Erro ao obter sugestões da IA");
    },
  });

  const getProduct = (id: string) =>
    relatedProducts.find((p: any) => p.id === id);

  const existingTargetIds = new Set(
    outgoingRelations.map((r: any) => r.target_product_id)
  );
  const filteredSearch = searchResults.filter(
    (p: any) => !existingTargetIds.has(p.id)
  );

  // Group outgoing relations by type
  const groupedOutgoing = useMemo(() => {
    const groups: Record<string, any[]> = {};
    allTypes.forEach((t) => {
      const items = outgoingRelations.filter(
        (r: any) => r.relation_type === t
      );
      if (items.length > 0) groups[t] = items;
    });
    return groups;
  }, [outgoingRelations]);

  const filteredGroupedOutgoing = useMemo(() => {
    if (filterType === "all") return groupedOutgoing;
    const result: Record<string, any[]> = {};
    if (groupedOutgoing[filterType]) {
      result[filterType] = groupedOutgoing[filterType];
    }
    return result;
  }, [groupedOutgoing, filterType]);

  const totalRelations =
    outgoingRelations.length + incomingRelations.length;

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectProduct = (p: any) => {
    setSelectedProduct(p);
    setSearchTerm(p.name);
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = () => {
    if (!selectedProduct) return;
    addRelation.mutate({
      targetId: selectedProduct.id,
      type: selectedType,
      reasonText: reason,
    });
  };

  const formatPrice = (price: number, currency = "EUR") =>
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {totalRelations} relação(ões)
              </span>
            </div>
            {incomingRelations.length > 0 && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                {incomingRelations.length} de outros produtos
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setSelectedProduct(null);
                setSearchTerm("");
                setReason("");
                setAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Filter by type */}
        {Object.keys(groupedOutgoing).length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todos
            </button>
            {Object.keys(groupedOutgoing).map((type) => {
              const cfg = relationConfig[type as RelationType];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() =>
                    setFilterType(filterType === type ? "all" : type)
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    filterType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                  <span className="opacity-60">
                    ({groupedOutgoing[type].length})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Outgoing relations grouped */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            A carregar relações...
          </div>
        ) : outgoingRelations.length === 0 && incomingRelations.length === 0 ? (
          <Card className="p-8 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground">
              Nenhuma relação definida
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Adicione relações manualmente ou use o botão "Sugerir com IA" para
              encontrar produtos relacionados automaticamente.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredGroupedOutgoing).map(([type, items]) => {
              const cfg = relationConfig[type as RelationType];
              const Icon = cfg.icon;
              const collapsed = collapsedGroups[type];

              return (
                <Card key={type} className="overflow-hidden">
                  <button
                    onClick={() => toggleGroupCollapse(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${cfg.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {cfg.description}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {!collapsed && (
                    <div className="divide-y divide-border/50">
                      {items.map((rel: any) => {
                        const target = getProduct(rel.target_product_id);
                        return (
                          <div
                            key={rel.id}
                            className="flex items-center gap-3 px-4 py-3 group hover:bg-muted/20 transition-colors"
                          >
                            <ProductThumb
                              images={target?.images}
                              name={target?.name || "Produto"}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {target?.name || "Produto não encontrado"}
                                </p>
                                {target?.status === "discontinued" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30"
                                  >
                                    Descontinuado
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {target?.sku && (
                                  <span className="font-mono">{target.sku}</span>
                                )}
                                {target?.base_price != null && (
                                  <span className="font-medium text-foreground/70">
                                    {formatPrice(
                                      target.base_price,
                                      target.currency
                                    )}
                                  </span>
                                )}
                                {target?.category && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5"
                                  >
                                    {target.category}
                                  </Badge>
                                )}
                              </div>
                              {rel.reason && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {rel.reason}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5">
                                    {rel.is_active ? (
                                      <Eye className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <Switch
                                      checked={rel.is_active}
                                      onCheckedChange={(checked) =>
                                        toggleActive.mutate({
                                          id: rel.id,
                                          is_active: checked,
                                        })
                                      }
                                      className="scale-90"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {rel.is_active
                                    ? "Visível na ficha pública"
                                    : "Oculto na ficha pública"}
                                </TooltipContent>
                              </Tooltip>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRelation.mutate(rel.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Incoming relations (from other products) */}
            {incomingRelations.length > 0 && (
              <Card className="overflow-hidden">
                <button
                  onClick={() => toggleGroupCollapse("_incoming")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 bg-muted/20"
                >
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">
                      Referenciado por
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Outros produtos que apontam para este
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {incomingRelations.length}
                  </Badge>
                  {collapsedGroups["_incoming"] ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {!collapsedGroups["_incoming"] && (
                  <div className="divide-y divide-border/50">
                    {incomingRelations.map((rel: any) => {
                      const source = getProduct(rel.source_product_id);
                      const cfg =
                        relationConfig[rel.relation_type as RelationType] ||
                        relationConfig.related;
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                        >
                          <ProductThumb
                            images={source?.images}
                            name={source?.name || "Produto"}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {source?.name || "Produto não encontrado"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 px-1.5 ${cfg.color}`}
                              >
                                {cfg.label}
                              </Badge>
                              {rel.reason && (
                                <span className="italic">{rel.reason}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Add Relation Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Relação</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Relation type selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Tipo de relação
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {allTypes.map((type) => {
                    const cfg = relationConfig[type];
                    const Icon = cfg.icon;
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm ${
                          isSelected
                            ? `border-primary bg-primary/5 ${cfg.color} font-medium`
                            : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isSelected ? cfg.color : ""}`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm truncate ${isSelected ? "font-medium" : ""}`}
                          >
                            {cfg.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product search */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Produto
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar produto por nome ou SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedProduct && e.target.value !== selectedProduct.name) {
                        setSelectedProduct(null);
                      }
                    }}
                    className="pl-9"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Selected product preview */}
                {selectedProduct && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <ProductThumb
                      images={selectedProduct.images}
                      name={selectedProduct.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedProduct.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedProduct.sku && `${selectedProduct.sku} • `}
                        {formatPrice(
                          selectedProduct.base_price,
                          selectedProduct.currency
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSearchTerm("");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Search results dropdown */}
                {!selectedProduct &&
                  filteredSearch.length > 0 &&
                  searchTerm.length >= 2 && (
                    <div className="mt-2 border rounded-lg divide-y max-h-52 overflow-y-auto shadow-sm">
                      {filteredSearch.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <ProductThumb images={p.images} name={p.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.sku && `${p.sku} • `}
                              {formatPrice(p.base_price, p.currency)}
                              {p.category && ` • ${p.category}`}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                {!selectedProduct &&
                  searchTerm.length >= 2 &&
                  filteredSearch.length === 0 &&
                  !isSearching && (
                    <p className="mt-2 text-xs text-muted-foreground text-center py-3">
                      Nenhum produto encontrado
                    </p>
                  )}
              </div>

              {/* Reason */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Motivo da relação (opcional)
                </Label>
                <Textarea
                  placeholder="Ex: Cabo compatível com este modelo, Versão premium com mais funcionalidades..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={!selectedProduct || addRelation.isPending}
              >
                {addRelation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar Relação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
