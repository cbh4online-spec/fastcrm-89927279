import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Building2,
  Store,
  Globe,
  BookOpen,
  Plus,
  ExternalLink,
  Search,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Single source of truth for product publication channels.
 * - B2B Portal (b2b_published)
 * - Online Store (store_published)
 * - Public Sheet (sheet_published)
 * - Digital Catalogs (manual product_catalog_items)
 *
 * If `productId` is null we are in "create mode" — toggles only update local state
 * via the optional onLocalChange callback (used by CreateProductDialog).
 */
export interface ProductPublishingPanelProps {
  productId: string | null;
  initial?: {
    b2b_published?: boolean | null;
    store_published?: boolean | null;
    sheet_published?: boolean | null;
  };
  onLocalChange?: (next: {
    b2b_published: boolean;
    store_published: boolean;
    sheet_published: boolean;
    catalogIds: string[];
  }) => void;
  compact?: boolean;
}

interface CatalogRow {
  id: string;
  title: string;
  subtitle: string | null;
  status: "draft" | "published";
  is_public: boolean;
}

export function ProductPublishingPanel({
  productId,
  initial,
  onLocalChange,
  compact = false,
}: ProductPublishingPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  // Local state for create mode
  const [localB2b, setLocalB2b] = useState<boolean>(initial?.b2b_published ?? true);
  const [localStore, setLocalStore] = useState<boolean>(initial?.store_published ?? false);
  const [localSheet, setLocalSheet] = useState<boolean>(initial?.sheet_published ?? false);
  const [localCatalogIds, setLocalCatalogIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Load product (edit mode only)
  const productQuery = useQuery({
    queryKey: ["product-publishing", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, b2b_published, store_published, sheet_published, sheet_slug")
        .eq("id", productId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Load workspace catalogs
  const catalogsQuery = useQuery({
    queryKey: ["workspace-catalogs", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalogs")
        .select("id, title, subtitle, status, is_public")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  // Catalogs that already include this product
  const memberQuery = useQuery({
    queryKey: ["product-catalog-membership", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalog_items")
        .select("catalog_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.catalog_id as string);
    },
  });

  const includedCatalogIds = productId
    ? memberQuery.data ?? []
    : localCatalogIds;

  // Mutations (edit mode)
  const saveFlagsMutation = useMutation({
    mutationFn: async (patch: {
      b2b_published?: boolean;
      store_published?: boolean;
      sheet_published?: boolean;
    }) => {
      if (!productId) throw new Error("Sem produto");
      const { error } = await supabase
        .from("products")
        .update(patch as any)
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-publishing", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Publicação atualizada");
    },
    onError: (e: any) =>
      toast.error("Erro a atualizar", { description: e?.message }),
  });

  const toggleCatalogMutation = useMutation({
    mutationFn: async ({
      catalogId,
      add,
    }: {
      catalogId: string;
      add: boolean;
    }) => {
      if (!productId) throw new Error("Sem produto");
      if (add) {
        const { data: existing } = await supabase
          .from("product_catalog_items")
          .select("sort_order")
          .eq("catalog_id", catalogId)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;
        const { error } = await supabase
          .from("product_catalog_items")
          .insert({
            catalog_id: catalogId,
            product_id: productId,
            sort_order: nextOrder,
          } as any);
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("product_catalog_items")
          .delete()
          .eq("catalog_id", catalogId)
          .eq("product_id", productId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["product-catalog-membership", productId],
      });
      qc.invalidateQueries({ queryKey: ["product-catalog-items", vars.catalogId] });
      toast.success(vars.add ? "Adicionado ao catálogo" : "Removido do catálogo");
    },
    onError: (e: any) =>
      toast.error("Erro no catálogo", { description: e?.message }),
  });

  // Resolve current values
  const b2b = productId ? productQuery.data?.b2b_published ?? false : localB2b;
  const store = productId
    ? productQuery.data?.store_published ?? false
    : localStore;
  const sheet = productId
    ? productQuery.data?.sheet_published ?? false
    : localSheet;
  const sheetSlug = productQuery.data?.sheet_slug as string | undefined;

  // Helpers
  const updateLocal = (next: Partial<{
    b2b: boolean;
    store: boolean;
    sheet: boolean;
    catalogIds: string[];
  }>) => {
    const merged = {
      b2b_published: next.b2b ?? localB2b,
      store_published: next.store ?? localStore,
      sheet_published: next.sheet ?? localSheet,
      catalogIds: next.catalogIds ?? localCatalogIds,
    };
    if (next.b2b !== undefined) setLocalB2b(next.b2b);
    if (next.store !== undefined) setLocalStore(next.store);
    if (next.sheet !== undefined) setLocalSheet(next.sheet);
    if (next.catalogIds !== undefined) setLocalCatalogIds(next.catalogIds);
    onLocalChange?.(merged);
  };

  const handleToggle = (field: "b2b" | "store" | "sheet", value: boolean) => {
    if (productId) {
      const map = {
        b2b: { b2b_published: value },
        store: { store_published: value },
        sheet: { sheet_published: value },
      } as const;
      saveFlagsMutation.mutate(map[field]);
    } else {
      updateLocal({ [field]: value } as any);
    }
  };

  const handleToggleCatalog = (catalogId: string) => {
    const isMember = includedCatalogIds.includes(catalogId);
    if (productId) {
      toggleCatalogMutation.mutate({ catalogId, add: !isMember });
    } else {
      const next = isMember
        ? localCatalogIds.filter((id) => id !== catalogId)
        : [...localCatalogIds, catalogId];
      updateLocal({ catalogIds: next });
    }
  };

  const filteredCatalogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalogsQuery.data ?? []).filter((c) => {
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [catalogsQuery.data, search]);

  const channelCount =
    (b2b ? 1 : 0) +
    (store ? 1 : 0) +
    (sheet ? 1 : 0) +
    (includedCatalogIds.length > 0 ? 1 : 0);

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Onde publicar este produto</h3>
            <p className="text-xs text-muted-foreground">
              Escolha em que canais o produto fica visível.
            </p>
          </div>
          <Badge variant={channelCount > 0 ? "default" : "outline"}>
            {channelCount} canal{channelCount === 1 ? "" : "is"} ativo{channelCount === 1 ? "" : "s"}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChannelToggle
          icon={<Building2 className="h-4 w-4" />}
          title="Portal B2B"
          description="Visível a parceiros e revendedores autenticados."
          checked={b2b}
          onCheckedChange={(v) => handleToggle("b2b", v)}
          disabled={saveFlagsMutation.isPending}
        />
        <ChannelToggle
          icon={<Store className="h-4 w-4" />}
          title="Loja online"
          description="Aparece na loja pública para clientes finais."
          checked={store}
          onCheckedChange={(v) => handleToggle("store", v)}
          disabled={saveFlagsMutation.isPending}
        />
        <ChannelToggle
          icon={<Globe className="h-4 w-4" />}
          title="Ficha pública"
          description="Página individual partilhável com URL próprio."
          checked={sheet}
          onCheckedChange={(v) => handleToggle("sheet", v)}
          disabled={saveFlagsMutation.isPending}
          extra={
            sheet && sheetSlug ? (
              <a
                href={`/p/${sheetSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                Abrir ficha <ExternalLink className="h-3 w-3" />
              </a>
            ) : null
          }
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <h4 className="text-sm font-semibold">Catálogos digitais</h4>
              <p className="text-xs text-muted-foreground">
                Selecione os catálogos folheáveis onde o produto deve aparecer.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/store-catalogs">
              <Plus className="h-3 w-3 mr-1" /> Gerir catálogos
            </Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar catálogo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Card className="p-0 overflow-hidden">
          <ScrollArea className="max-h-64">
            {catalogsQuery.isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredCatalogs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {(catalogsQuery.data?.length ?? 0) === 0 ? (
                  <>
                    Ainda não tem catálogos digitais.{" "}
                    <Link
                      to="/dashboard/store-catalogs"
                      className="text-primary hover:underline"
                    >
                      Criar o primeiro
                    </Link>
                  </>
                ) : (
                  "Nenhum catálogo corresponde à pesquisa."
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {filteredCatalogs.map((cat) => {
                  const isMember = includedCatalogIds.includes(cat.id);
                  return (
                    <li
                      key={cat.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleCatalog(cat.id)}
                    >
                      <Checkbox
                        checked={isMember}
                        onCheckedChange={() => handleToggleCatalog(cat.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">
                            {cat.title}
                          </p>
                          <Badge
                            variant={
                              cat.status === "published" ? "default" : "outline"
                            }
                            className="text-[10px] py-0 h-4"
                          >
                            {cat.status === "published" ? "Publicado" : "Rascunho"}
                          </Badge>
                          {cat.is_public && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 h-4"
                            >
                              Público
                            </Badge>
                          )}
                        </div>
                        {cat.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {cat.subtitle}
                          </p>
                        )}
                      </div>
                      {isMember && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {productId && includedCatalogIds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Incluído em {includedCatalogIds.length} catálogo
            {includedCatalogIds.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </div>
  );
}

function ChannelToggle({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      className={`p-3 transition-colors ${
        checked ? "border-primary/40 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 text-muted-foreground">{icon}</div>
          <div className="min-w-0">
            <Label className="text-sm font-medium cursor-pointer">{title}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
            {extra}
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </Card>
  );
}
