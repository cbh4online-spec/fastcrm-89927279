import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Search } from "lucide-react";
import { DEFAULT_TAX_RATE } from "@/schemas/checkout/funnelSchema";

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number | null;
  currency: string | null;
  tax_included: boolean | null;
  tax_rate_estimate_pct: number | null;
  short_description: string | null;
  status: string | null;
  image_url: string | null;
}

/** Preço unitário com IVA incluído, a partir dos campos do catálogo. */
export function catalogGrossPrice(p: CatalogProduct): number {
  const price = Number(p.base_price) || 0;
  const rate = Number(p.tax_rate_estimate_pct ?? DEFAULT_TAX_RATE) || 0;
  if (p.tax_included || rate <= 0) return round2(price);
  return round2(price * (1 + rate / 100));
}

export function catalogTaxRate(p: CatalogProduct): number {
  return Number(p.tax_rate_estimate_pct ?? DEFAULT_TAX_RATE) || 0;
}

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: CatalogProduct) => void;
  title?: string;
}

export function ProductPickerDialog({ open, onOpenChange, onSelect, title = "Escolher produto do catálogo" }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ["checkout-catalog-products", currentWorkspace?.id, debounced],
    queryFn: async (): Promise<CatalogProduct[]> => {
      let q = (supabase as any)
        .from("products")
        .select("id, name, sku, base_price, currency, tax_included, tax_rate_estimate_pct, short_description, status, product_images(url)")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name")
        .limit(30);
      if (debounced) q = q.or(`name.ilike.%${debounced}%,sku.ilike.%${debounced}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        image_url: p.product_images?.[0]?.url ?? null,
      }));
    },
    enabled: open && !!currentWorkspace?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pesquise por nome ou SKU. O preço e o IVA são herdados do catálogo.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produtos…"
            aria-label="Pesquisar produtos do catálogo"
            className="h-12 rounded-full pl-11"
          />
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {query.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {query.isError && (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-destructive">Não foi possível carregar o catálogo.</p>
              <Button variant="outline" size="sm" onClick={() => query.refetch()}>Tentar novamente</Button>
            </div>
          )}

          {query.data?.length === 0 && !query.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {debounced ? "Sem produtos para esta pesquisa." : "Ainda não existem produtos no catálogo."}
            </p>
          )}

          {query.data?.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => { onSelect(product); onOpenChange(false); }}
              className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {product.image_url
                  ? <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <Package className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.sku ? `SKU ${product.sku}` : "Sem SKU"} · IVA {catalogTaxRate(product)}%
                </p>
              </div>
              {product.status && product.status !== "active" && (
                <Badge variant="secondary" className="shrink-0">{product.status}</Badge>
              )}
              <span className="shrink-0 text-sm font-semibold">
                {catalogGrossPrice(product).toFixed(2)} {product.currency || "EUR"}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
